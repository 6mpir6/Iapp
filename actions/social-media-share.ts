"use server"

import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { ShareResult, TikTokShareOptions, InstagramShareOptions } from "@/types/social-media"
import { updateSocialAccountUsage } from "./social-accounts"

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const STORAGE_BUCKET = "social-media-assets"

// TikTok API configuration
const TIKTOK_CLIENT_KEY = process.env.TIKTOK_API_KEY
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_API_SECRET
const TIKTOK_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_HOST
  ? `${process.env.NEXT_PUBLIC_APP_HOST}/api/auth/tiktok/callback`
  : "http://localhost:3000/api/auth/tiktok/callback"

// Instagram/Facebook API configuration
const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET
const INSTAGRAM_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_HOST
  ? `${process.env.NEXT_PUBLIC_APP_HOST}/api/auth/instagram/callback`
  : "http://localhost:3000/api/auth/instagram/callback"

// Helper functions
function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase configuration")
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}

async function ensureBucket() {
  const supabase = getSupabaseClient()
  const { data: buckets } = await supabase.storage.listBuckets()

  if (!buckets?.some((bucket) => bucket.name === STORAGE_BUCKET)) {
    await supabase.storage.createBucket(STORAGE_BUCKET, {
      public: true,
      fileSizeLimit: 100 * 1024 * 1024, // 100MB
    })
  }
}

async function uploadToSupabase(url: string, fileName: string): Promise<string> {
  try {
    // Ensure bucket exists
    await ensureBucket()

    // Fetch the video from the URL
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch video from URL: ${response.statusText}`)
    }

    const buffer = await response.arrayBuffer()

    // Generate a unique path
    const uniqueId = crypto.randomBytes(8).toString("hex")
    const filePath = `${uniqueId}-${fileName}`

    // Upload to Supabase
    const supabase = getSupabaseClient()
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, buffer, {
      contentType: response.headers.get("content-type") || "video/mp4",
      upsert: true,
    })

    if (error) {
      throw new Error(`Supabase upload error: ${error.message}`)
    }

    // Get public URL
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath)
    return data.publicUrl
  } catch (error) {
    console.error("Error uploading to Supabase:", error)
    throw error
  }
}

// Token storage and retrieval
interface TokenData {
  accessToken: string
  refreshToken?: string
  expiresAt?: number
  userId: string
  platform: "tiktok" | "instagram"
  platformUserId: string
}

async function storeToken(userId: string, tokenData: Omit<TokenData, "userId">): Promise<void> {
  const supabase = getSupabaseClient()

  const { error } = await supabase.from("social_media_tokens").upsert({
    user_id: userId,
    platform: tokenData.platform,
    access_token: tokenData.accessToken,
    refresh_token: tokenData.refreshToken || null,
    expires_at: tokenData.expiresAt ? new Date(tokenData.expiresAt).toISOString() : null,
    platform_user_id: tokenData.platformUserId,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    console.error("Error storing token:", error)
    throw new Error(`Failed to store ${tokenData.platform} token`)
  }
}

async function getToken(userId: string, platform: "tiktok" | "instagram"): Promise<TokenData | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("social_media_tokens")
    .select("*")
    .eq("user_id", userId)
    .eq("platform", platform)
    .single()

  if (error || !data) {
    return null
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || undefined,
    expiresAt: data.expires_at ? new Date(data.expires_at).getTime() : undefined,
    userId: data.user_id,
    platform: data.platform as "tiktok" | "instagram",
    platformUserId: data.platform_user_id,
  }
}

async function getCurrentUserId(): Promise<string> {
  // This would typically come from your authentication system
  // For example, if using Supabase Auth:
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    throw new Error("User not authenticated")
  }

  return data.user.id
}

// TikTok API functions
export async function initiateTikTokAuth() {
  if (!TIKTOK_CLIENT_KEY) {
    throw new Error("TikTok API key not configured")
  }

  // Generate a state parameter for CSRF protection
  const state = crypto.randomBytes(16).toString("hex")
  cookies().set("tiktok_auth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10, // 10 minutes
  })

  // Generate PKCE code verifier and challenge
  const codeVerifier = crypto.randomBytes(32).toString("base64url")
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")

  cookies().set("tiktok_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10, // 10 minutes
  })

  // Construct the authorization URL
  const scopes = ["user.info.basic", "video.upload", "video.publish"]
  const authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/")
  authUrl.searchParams.append("client_key", TIKTOK_CLIENT_KEY)
  authUrl.searchParams.append("scope", scopes.join(","))
  authUrl.searchParams.append("response_type", "code")
  authUrl.searchParams.append("redirect_uri", TIKTOK_REDIRECT_URI)
  authUrl.searchParams.append("state", state)
  authUrl.searchParams.append("code_challenge", codeChallenge)
  authUrl.searchParams.append("code_challenge_method", "S256")

  return redirect(authUrl.toString())
}

export async function handleTikTokCallback(code: string, state: string): Promise<boolean> {
  // Verify state parameter to prevent CSRF attacks
  const storedState = cookies().get("tiktok_auth_state")?.value
  if (!storedState || storedState !== state) {
    throw new Error("Invalid state parameter")
  }

  // Get the code verifier
  const codeVerifier = cookies().get("tiktok_code_verifier")?.value
  if (!codeVerifier) {
    throw new Error("Code verifier not found")
  }

  // Exchange the authorization code for an access token
  const tokenUrl = "https://open.tiktokapis.com/v2/oauth/token/"
  const params = new URLSearchParams({
    client_key: TIKTOK_CLIENT_KEY!,
    client_secret: TIKTOK_CLIENT_SECRET!,
    code,
    grant_type: "authorization_code",
    redirect_uri: TIKTOK_REDIRECT_URI,
    code_verifier: codeVerifier,
  })

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    console.error("TikTok token exchange error:", errorData)
    throw new Error(`Failed to exchange TikTok authorization code: ${response.statusText}`)
  }

  const data = await response.json()

  if (!data.data?.access_token || !data.data?.open_id) {
    throw new Error("Invalid response from TikTok")
  }

  // Store the token
  const userId = await getCurrentUserId()
  await storeToken(userId, {
    accessToken: data.data.access_token,
    refreshToken: data.data.refresh_token,
    expiresAt: Date.now() + data.data.expires_in * 1000,
    platform: "tiktok",
    platformUserId: data.data.open_id,
  })

  // Clean up cookies
  cookies().delete("tiktok_auth_state")
  cookies().delete("tiktok_code_verifier")

  return true
}

async function refreshTikTokToken(userId: string, refreshToken: string): Promise<TokenData | null> {
  const tokenUrl = "https://open.tiktokapis.com/v2/oauth/token/"
  const params = new URLSearchParams({
    client_key: TIKTOK_CLIENT_KEY!,
    client_secret: TIKTOK_CLIENT_SECRET!,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  })

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  })

  if (!response.ok) {
    return null
  }

  const data = await response.json()

  if (!data.data?.access_token) {
    return null
  }

  const tokenData = {
    accessToken: data.data.access_token,
    refreshToken: data.data.refresh_token,
    expiresAt: Date.now() + data.data.expires_in * 1000,
    userId,
    platform: "tiktok" as const,
    platformUserId: data.data.open_id,
  }

  await storeToken(userId, {
    accessToken: tokenData.accessToken,
    refreshToken: tokenData.refreshToken,
    expiresAt: tokenData.expiresAt,
    platform: "tiktok",
    platformUserId: tokenData.platformUserId,
  })

  return tokenData
}

async function getTikTokToken(userId: string): Promise<string> {
  let tokenData = await getToken(userId, "tiktok")

  if (!tokenData) {
    throw new Error("TikTok account not connected")
  }

  // Check if token is expired and refresh if needed
  if (tokenData.expiresAt && tokenData.expiresAt < Date.now() && tokenData.refreshToken) {
    const refreshedToken = await refreshTikTokToken(userId, tokenData.refreshToken)
    if (!refreshedToken) {
      throw new Error("Failed to refresh TikTok token")
    }
    tokenData = refreshedToken
  }

  return tokenData.accessToken
}

export async function shareToTikTok({ videoUrl, caption, asDraft = true }: TikTokShareOptions): Promise<ShareResult> {
  try {
    const userId = await getCurrentUserId()
    const accessToken = await getTikTokToken(userId)

    // Get the token data to retrieve the open_id (TikTok user ID)
    const tokenData = await getToken(userId, "tiktok")
    if (!tokenData) {
      throw new Error("TikTok account not connected")
    }

    const openId = tokenData.platformUserId

    // Upload the video to a publicly accessible URL if it's not already
    // This is needed because TikTok requires a public URL to fetch the video
    let publicVideoUrl = videoUrl
    if (!videoUrl.startsWith("http")) {
      // If it's a local path, upload to Supabase first
      publicVideoUrl = await uploadToSupabase(videoUrl, "tiktok-video.mp4")
    }

    // Get the video file size
    const videoResponse = await fetch(publicVideoUrl, { method: "HEAD" })
    if (!videoResponse.ok) {
      throw new Error("Failed to access video URL")
    }

    const videoSize = Number.parseInt(videoResponse.headers.get("content-length") || "0", 10)
    if (!videoSize) {
      throw new Error("Could not determine video size")
    }

    // Initialize the video upload
    let apiUrl, body

    if (asDraft) {
      // Draft upload
      apiUrl = "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/"
      body = {
        source_info: {
          source: "PULL_FROM_URL",
          video_url: publicVideoUrl,
          video_size: videoSize,
        },
      }
    } else {
      // Direct post
      apiUrl = "https://open.tiktokapis.com/v2/post/publish/video/init/"
      body = {
        post_info: {
          title: caption,
          privacy_level: "PUBLIC_TO_EVERYONE",
          disable_comment: false,
          disable_duet: false,
          disable_stitch: false,
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: publicVideoUrl,
          video_size: videoSize,
        },
      }
    }

    const initResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!initResponse.ok) {
      const errorData = await initResponse.json()
      console.error("TikTok video init error:", errorData)
      throw new Error(`Failed to initialize TikTok video: ${initResponse.statusText}`)
    }

    const initData = await initResponse.json()

    if (!initData.data?.publish_id) {
      throw new Error("Invalid response from TikTok video init")
    }

    const publishId = initData.data.publish_id

    // Poll for status until the video is processed
    let isProcessed = false
    let attempts = 0
    const maxAttempts = 30 // Maximum number of polling attempts

    while (!isProcessed && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000)) // Wait 2 seconds between polls

      const statusUrl = "https://open.tiktokapis.com/v2/post/publish/status/fetch/"
      const statusResponse = await fetch(statusUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ publish_id: publishId }),
      })

      if (!statusResponse.ok) {
        attempts++
        continue
      }

      const statusData = await statusResponse.json()

      if (statusData.data?.status === "PUBLISH_FAILED") {
        throw new Error(`TikTok publishing failed: ${statusData.data.error_code || "Unknown error"}`)
      }

      if (statusData.data?.status === "PUBLISH_SUCCESS") {
        isProcessed = true

        // For direct posts, we get an item_id which is the TikTok post ID
        const postId = statusData.data.item_id

        return {
          success: true,
          postId: postId || publishId,
          // For drafts, there's no direct URL, but for published videos we could construct one
          postUrl: postId ? `https://www.tiktok.com/@${openId}/video/${postId}` : undefined,
        }
      }

      attempts++
    }

    if (!isProcessed) {
      throw new Error("TikTok video processing timed out")
    }

    // If we're here with a draft upload, it was successful but we don't have a post URL
    return {
      success: true,
      postId: publishId,
    }

    await updateSocialAccountUsage("tiktok")
  } catch (error) {
    console.error("Error sharing to TikTok:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to share to TikTok",
    }
  }
}

// Instagram API functions
export async function initiateInstagramAuth() {
  if (!INSTAGRAM_APP_ID) {
    throw new Error("Instagram App ID not configured")
  }

  // Generate a state parameter for CSRF protection
  const state = crypto.randomBytes(16).toString("hex")
  cookies().set("instagram_auth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10, // 10 minutes
  })

  // Construct the authorization URL (Facebook Login for Instagram)
  const scopes = ["instagram_basic", "instagram_content_publish", "pages_show_list", "business_management"]

  const authUrl = new URL("https://www.facebook.com/v17.0/dialog/oauth")
  authUrl.searchParams.append("client_id", INSTAGRAM_APP_ID)
  authUrl.searchParams.append("redirect_uri", INSTAGRAM_REDIRECT_URI)
  authUrl.searchParams.append("scope", scopes.join(","))
  authUrl.searchParams.append("response_type", "code")
  authUrl.searchParams.append("state", state)

  return redirect(authUrl.toString())
}

export async function handleInstagramCallback(code: string, state: string): Promise<boolean> {
  // Verify state parameter to prevent CSRF attacks
  const storedState = cookies().get("instagram_auth_state")?.value
  if (!storedState || storedState !== state) {
    throw new Error("Invalid state parameter")
  }

  // Exchange the authorization code for a short-lived access token
  const tokenUrl = `https://graph.facebook.com/v17.0/oauth/access_token`
  const params = new URLSearchParams({
    client_id: INSTAGRAM_APP_ID!,
    client_secret: INSTAGRAM_APP_SECRET!,
    code,
    redirect_uri: INSTAGRAM_REDIRECT_URI,
  })

  const response = await fetch(`${tokenUrl}?${params.toString()}`)

  if (!response.ok) {
    const errorData = await response.json()
    console.error("Instagram token exchange error:", errorData)
    throw new Error(`Failed to exchange Instagram authorization code: ${response.statusText}`)
  }

  const data = await response.json()

  if (!data.access_token) {
    throw new Error("Invalid response from Instagram")
  }

  // Exchange for a long-lived token
  const longLivedTokenUrl = `https://graph.facebook.com/v17.0/oauth/access_token`
  const longLivedParams = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: INSTAGRAM_APP_ID!,
    client_secret: INSTAGRAM_APP_SECRET!,
    fb_exchange_token: data.access_token,
  })

  const longLivedResponse = await fetch(`${longLivedTokenUrl}?${longLivedParams.toString()}`)

  if (!longLivedResponse.ok) {
    const errorData = await longLivedResponse.json()
    console.error("Instagram long-lived token exchange error:", errorData)
    throw new Error(`Failed to get long-lived Instagram token: ${longLivedResponse.statusText}`)
  }

  const longLivedData = await longLivedResponse.json()

  if (!longLivedData.access_token) {
    throw new Error("Invalid response for long-lived token")
  }

  // Get the Facebook Page ID and Instagram Business Account ID
  const accountsResponse = await fetch(
    `https://graph.facebook.com/v17.0/me/accounts?access_token=${longLivedData.access_token}`,
  )

  if (!accountsResponse.ok) {
    const errorData = await accountsResponse.json()
    console.error("Instagram accounts fetch error:", errorData)
    throw new Error(`Failed to fetch Instagram accounts: ${accountsResponse.statusText}`)
  }

  const accountsData = await accountsResponse.json()

  if (!accountsData.data || accountsData.data.length === 0) {
    throw new Error("No Facebook Pages found. Instagram Business account must be connected to a Facebook Page.")
  }

  // Use the first page (in a real app, you might want to let the user choose)
  const page = accountsData.data[0]
  const pageId = page.id
  const pageAccessToken = page.access_token

  // Get the Instagram Business Account ID
  const igAccountResponse = await fetch(
    `https://graph.facebook.com/v17.0/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`,
  )

  if (!igAccountResponse.ok) {
    const errorData = await igAccountResponse.json()
    console.error("Instagram business account fetch error:", errorData)
    throw new Error(`Failed to fetch Instagram business account: ${igAccountResponse.statusText}`)
  }

  const igAccountData = await igAccountResponse.json()

  if (!igAccountData.instagram_business_account?.id) {
    throw new Error("No Instagram Business account found for this Facebook Page")
  }

  const igBusinessAccountId = igAccountData.instagram_business_account.id

  // Store the token
  const userId = await getCurrentUserId()
  await storeToken(userId, {
    accessToken: pageAccessToken, // Use the page access token for API calls
    expiresAt: Date.now() + 60 * 24 * 60 * 60 * 1000, // ~60 days
    platform: "instagram",
    platformUserId: igBusinessAccountId,
  })

  // Clean up cookies
  cookies().delete("instagram_auth_state")

  return true
}

async function getInstagramToken(userId: string): Promise<{ token: string; igUserId: string }> {
  const tokenData = await getToken(userId, "instagram")

  if (!tokenData) {
    throw new Error("Instagram account not connected")
  }

  // Note: For Instagram, we don't need to refresh the token as it's a long-lived token (60 days)
  // In a production app, you might want to implement token refresh when it's close to expiration

  return {
    token: tokenData.accessToken,
    igUserId: tokenData.platformUserId,
  }
}

export async function shareToInstagram({
  videoUrl,
  thumbnailUrl,
  caption,
  asReel = true,
  shareToFeed = true,
}: InstagramShareOptions): Promise<ShareResult> {
  try {
    const userId = await getCurrentUserId()
    const { token, igUserId } = await getInstagramToken(userId)

    // Upload the video to a publicly accessible URL if it's not already
    let publicVideoUrl = videoUrl
    if (!videoUrl.startsWith("http")) {
      publicVideoUrl = await uploadToSupabase(videoUrl, "instagram-video.mp4")
    }

    // Upload thumbnail if provided
    let publicThumbnailUrl = thumbnailUrl
    if (thumbnailUrl && !thumbnailUrl.startsWith("http")) {
      publicThumbnailUrl = await uploadToSupabase(thumbnailUrl, "instagram-thumbnail.jpg")
    }

    // Create a media container
    const containerUrl = `https://graph.facebook.com/v17.0/${igUserId}/media`
    const containerParams = new URLSearchParams({
      video_url: publicVideoUrl,
      caption,
      access_token: token,
    })

    if (asReel) {
      containerParams.append("media_type", "REELS")

      if (shareToFeed) {
        containerParams.append("share_to_feed", "true")
      }

      // If we have a thumbnail, use it
      if (publicThumbnailUrl) {
        containerParams.append("thumb_url", publicThumbnailUrl)
      } else {
        // Otherwise use a frame from the video (e.g., at 2 seconds)
        containerParams.append("thumb_offset", "2000")
      }
    }

    const containerResponse = await fetch(containerUrl, {
      method: "POST",
      body: containerParams,
    })

    if (!containerResponse.ok) {
      const errorData = await containerResponse.json()
      console.error("Instagram container creation error:", errorData)
      throw new Error(
        `Failed to create Instagram media container: ${errorData.error?.message || containerResponse.statusText}`,
      )
    }

    const containerData = await containerResponse.json()

    if (!containerData.id) {
      throw new Error("Invalid response from Instagram container creation")
    }

    const containerId = containerData.id

    // Wait for the container to be ready (especially important for videos)
    let isReady = false
    let attempts = 0
    const maxAttempts = 30 // Maximum number of polling attempts

    while (!isReady && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000)) // Wait 2 seconds between polls

      // Check container status
      const statusUrl = `https://graph.facebook.com/v17.0/${containerId}?fields=status_code,status&access_token=${token}`
      const statusResponse = await fetch(statusUrl)

      if (!statusResponse.ok) {
        attempts++
        continue
      }

      const statusData = await statusResponse.json()

      if (statusData.status_code === "ERROR") {
        throw new Error(`Instagram media processing failed: ${statusData.status || "Unknown error"}`)
      }

      if (statusData.status_code === "FINISHED") {
        isReady = true
      }

      attempts++
    }

    if (!isReady) {
      throw new Error("Instagram media processing timed out")
    }

    // Publish the container
    const publishUrl = `https://graph.facebook.com/v17.0/${igUserId}/media_publish`
    const publishParams = new URLSearchParams({
      creation_id: containerId,
      access_token: token,
    })

    const publishResponse = await fetch(publishUrl, {
      method: "POST",
      body: publishParams,
    })

    if (!publishResponse.ok) {
      const errorData = await publishResponse.json()
      console.error("Instagram publish error:", errorData)
      throw new Error(`Failed to publish Instagram media: ${errorData.error?.message || publishResponse.statusText}`)
    }

    const publishData = await publishResponse.json()

    if (!publishData.id) {
      throw new Error("Invalid response from Instagram publish")
    }

    const postId = publishData.id

    // Get the username to construct the post URL
    const userInfoUrl = `https://graph.facebook.com/v17.0/${igUserId}?fields=username&access_token=${token}`
    const userInfoResponse = await fetch(userInfoUrl)
    let postUrl

    if (userInfoResponse.ok) {
      const userInfoData = await userInfoResponse.json()
      if (userInfoData.username) {
        postUrl = `https://www.instagram.com/p/${postId}/`
      }
    }

    return {
      success: true,
      postId,
      postUrl,
    }

    await updateSocialAccountUsage("instagram")
  } catch (error) {
    console.error("Error sharing to Instagram:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to share to Instagram",
    }
  }
}

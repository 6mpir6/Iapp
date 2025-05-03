"use server"

import { createClient } from "@supabase/supabase-js"
import type { SocialAccountInfo } from "@/components/social-accounts/social-accounts-manager"
import { revalidatePath } from "next/cache"

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase configuration")
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
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

export async function getSocialAccounts(): Promise<SocialAccountInfo[]> {
  try {
    const userId = await getCurrentUserId()
    const supabase = getSupabaseClient()

    const { data: tokens, error } = await supabase.from("social_media_tokens").select("*").eq("user_id", userId)

    if (error) {
      console.error("Error fetching social media tokens:", error)
      throw new Error("Failed to fetch social media accounts")
    }

    // Transform the database records into the expected format
    const accounts: SocialAccountInfo[] = []

    // Add TikTok account if connected
    const tiktokToken = tokens.find((token) => token.platform === "tiktok")
    if (tiktokToken) {
      const tiktokAccount: SocialAccountInfo = {
        platform: "tiktok",
        connected: true,
        username: tiktokToken.username || `TikTok User ${tiktokToken.platform_user_id.slice(-4)}`,
        accountType: "Creator Account",
        connectedAt: tiktokToken.created_at,
        lastUsed: tiktokToken.last_used_at,
        profileImage: tiktokToken.profile_image_url || "/icons/tiktok-profile-placeholder.png",
        stats: {
          followers: tiktokToken.follower_count || undefined,
          posts: tiktokToken.post_count || undefined,
        },
      }
      accounts.push(tiktokAccount)
    } else {
      accounts.push({
        platform: "tiktok",
        connected: false,
      })
    }

    // Add Instagram account if connected
    const instagramToken = tokens.find((token) => token.platform === "instagram")
    if (instagramToken) {
      const instagramAccount: SocialAccountInfo = {
        platform: "instagram",
        connected: true,
        username: instagramToken.username || `Instagram User ${instagramToken.platform_user_id.slice(-4)}`,
        accountType: "Business Account",
        connectedAt: instagramToken.created_at,
        lastUsed: instagramToken.last_used_at,
        profileImage: instagramToken.profile_image_url || "/icons/instagram-profile-placeholder.png",
        stats: {
          followers: instagramToken.follower_count || undefined,
          posts: instagramToken.post_count || undefined,
        },
      }
      accounts.push(instagramAccount)
    } else {
      accounts.push({
        platform: "instagram",
        connected: false,
      })
    }

    return accounts
  } catch (error) {
    console.error("Error in getSocialAccounts:", error)
    throw error
  }
}

export async function disconnectSocialAccount(platform: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId()
    const supabase = getSupabaseClient()

    const { error } = await supabase.from("social_media_tokens").delete().eq("user_id", userId).eq("platform", platform)

    if (error) {
      console.error(`Error disconnecting ${platform} account:`, error)
      throw new Error(`Failed to disconnect ${platform} account`)
    }

    revalidatePath("/social-accounts")
    return true
  } catch (error) {
    console.error(`Error in disconnectSocialAccount for ${platform}:`, error)
    throw error
  }
}

export async function updateSocialAccountUsage(platform: string): Promise<void> {
  try {
    const userId = await getCurrentUserId()
    const supabase = getSupabaseClient()

    const { error } = await supabase
      .from("social_media_tokens")
      .update({
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("platform", platform)

    if (error) {
      console.error(`Error updating ${platform} account usage:`, error)
    }
  } catch (error) {
    console.error(`Error in updateSocialAccountUsage for ${platform}:`, error)
  }
}

"use server"

import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"

// Configuration
const CREATOMATE_API_KEY = process.env.CREATOMATE_API_KEY
const CREATOMATE_API_ENDPOINT = "https://api.creatomate.com/v1/renders"
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const STORAGE_BUCKET = "creatomate-assets"

// Template IDs
const TEMPLATE_IDS = {
  "social-reel": "cdaca80d-b8aa-4b20-a693-223f5ef24f77",
  "product-showcase": "d22afb81-612a-47da-9923-090afeac32a1",
  cinematic: "c7c5a25a-5ddc-47cd-b125-9e6848856dfd",
}

// Types
export type CreatomateStatus = "planned" | "waiting" | "transcribing" | "rendering" | "succeeded" | "failed"

interface ProductShowcaseParams {
  productImageUrl: string
  productName: string
  productDescription: string
  normalPrice: string
  discountedPrice: string
  cta: string
  website: string
  logoUrl?: string
}

interface ProductCarouselParams {
  productImage1Url: string
  productOffer1: string
  productImage2Url: string
  productOffer2: string
  productImage3Url: string
  productOffer3: string
  callToAction: string
  voiceoverText?: string
}

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
      fileSizeLimit: 50 * 1024 * 1024, // 50MB
    })
  }
}

async function uploadToSupabase(dataUri: string, fileName: string): Promise<string> {
  if (!dataUri.startsWith("data:")) {
    // If it's already a URL, return it
    if (dataUri.startsWith("http")) {
      return dataUri
    }
    throw new Error("Invalid data URI format")
  }

  const supabase = getSupabaseClient()
  await ensureBucket()

  // Extract base64 data and mime type
  const matches = dataUri.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid data URI format")
  }

  const mimeType = matches[1]
  const base64Data = matches[2]
  const buffer = Buffer.from(base64Data, "base64")

  // Generate a unique path
  const uniqueId = crypto.randomBytes(8).toString("hex")
  const filePath = `${uniqueId}-${fileName}`

  // Upload to Supabase
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, buffer, {
    contentType: mimeType,
    upsert: true,
  })

  if (error) {
    throw new Error(`Supabase upload error: ${error.message}`)
  }

  // Get public URL
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath)
  return data.publicUrl
}

// Main API functions
export async function generateProductShowcase(params: ProductShowcaseParams) {
  if (!CREATOMATE_API_KEY) {
    return { success: false, error: "Missing Creatomate API Key" }
  }

  try {
    // Process images to ensure they're URLs
    const productImageUrl = params.productImageUrl.startsWith("data:")
      ? await uploadToSupabase(params.productImageUrl, "product-image.png")
      : params.productImageUrl

    let logoUrl = params.logoUrl
    if (logoUrl && logoUrl.startsWith("data:")) {
      logoUrl = await uploadToSupabase(logoUrl, "logo.png")
    }

    // Prepare modifications
    const modifications = {
      "Product-Image.source": productImageUrl,
      "Product-Name.text": params.productName,
      "Product-Description.text": params.productDescription,
      "Normal-Price.text": `$${params.normalPrice}`,
      "Discounted-Price.text": `$${params.discountedPrice}`,
      "CTA.text": params.cta,
      "Website.text": params.website,
    }

    if (logoUrl) {
      modifications["Logo.source"] = logoUrl
    }

    // Call Creatomate API
    const response = await fetch(CREATOMATE_API_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CREATOMATE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template_id: TEMPLATE_IDS["product-showcase"],
        modifications,
        output_format: "mp4",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `API error: ${response.status} - ${errorText}` }
    }

    const data = await response.json()
    if (!Array.isArray(data) || data.length === 0) {
      return { success: false, error: "Invalid API response" }
    }

    return {
      success: true,
      renderId: data[0].id,
      status: data[0].status,
    }
  } catch (error) {
    console.error("Error generating product showcase:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

export async function generateProductCarousel(params: ProductCarouselParams) {
  if (!CREATOMATE_API_KEY) {
    return { success: false, error: "Missing Creatomate API Key" }
  }

  try {
    // Process images to ensure they're URLs
    const image1Url = params.productImage1Url.startsWith("data:")
      ? await uploadToSupabase(params.productImage1Url, "product-image-1.png")
      : params.productImage1Url

    const image2Url = params.productImage2Url.startsWith("data:")
      ? await uploadToSupabase(params.productImage2Url, "product-image-2.png")
      : params.productImage2Url

    const image3Url = params.productImage3Url.startsWith("data:")
      ? await uploadToSupabase(params.productImage3Url, "product-image-3.png")
      : params.productImage3Url

    // Generate voiceover text if not provided
    const voiceoverText =
      params.voiceoverText ||
      `Check out our latest products with amazing offers! ${params.productOffer1} on our first item. ${params.productOffer2} on our second item. And don't miss ${params.productOffer3} on our third item! ${params.callToAction.replace(/\n/g, " ")}`

    // Prepare modifications
    const modifications = {
      "Image-1.source": image1Url,
      "Text-1.text": params.productOffer1,
      "Image-2.source": image2Url,
      "Text-2.text": params.productOffer2,
      "Image-3.source": image3Url,
      "Text-3.text": params.productOffer3,
      "Call-To-Action.text": params.callToAction,
      "Voiceover.text": voiceoverText,
      "Voiceover.voice": "alloy", // ElevenLabs voice ID
    }

    // Call Creatomate API
    const response = await fetch(CREATOMATE_API_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CREATOMATE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template_id: TEMPLATE_IDS["social-reel"],
        modifications,
        output_format: "mp4",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `API error: ${response.status} - ${errorText}` }
    }

    const data = await response.json()
    if (!Array.isArray(data) || data.length === 0) {
      return { success: false, error: "Invalid API response" }
    }

    return {
      success: true,
      renderId: data[0].id,
      status: data[0].status,
    }
  } catch (error) {
    console.error("Error generating product carousel:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

export async function checkRenderStatus(renderId: string) {
  if (!CREATOMATE_API_KEY) {
    return { success: false, error: "Missing Creatomate API Key" }
  }

  try {
    const response = await fetch(`${CREATOMATE_API_ENDPOINT}/${renderId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${CREATOMATE_API_KEY}`,
        Accept: "application/json",
      },
      cache: "no-store", // Prevent caching
    })

    if (!response.ok) {
      return { success: false, error: `API error: ${response.status}` }
    }

    const data = await response.json()

    return {
      success: true,
      status: data.status,
      url: data.url,
      error: data.error_message,
    }
  } catch (error) {
    console.error("Error checking render status:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

export async function generateCinematicVideo({
  videos,
  picture,
  description,
  subtext,
  brandName,
  name,
  email,
  phoneNumber,
}: {
  videos: string[]
  picture: string
  description: string
  subtext: string
  brandName: string
  name: string
  email: string
  phoneNumber: string
}) {
  const apiKey = process.env.CREATOMATE_API_KEY
  if (!apiKey) {
    return { success: false, error: "Missing Creatomate API key" }
  }

  try {
    // Ensure we have at least 4 videos
    const videoSources = [...videos]
    while (videoSources.length < 4) {
      videoSources.push(videos[0] || "https://creatomate.com/files/assets/ef8fe36b-2e81-4495-abe8-9d6d2e8c8f1e")
    }

    const response = await fetch("https://api.creatomate.com/v1/renders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template_id: TEMPLATE_IDS.cinematic,
        modifications: {
          "Video-1.source": videoSources[0],
          "Video-2.source": videoSources[1],
          "Video-3.source": videoSources[2],
          "Video-4.source": videoSources[3],
          "Description.text": description,
          "Subtext.text": subtext,
          "Picture.source": picture,
          "Email.text": email,
          "Phone-Number.text": phoneNumber,
          "Brand-Name.text": brandName,
          "Name.text": name,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Creatomate API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    if (!Array.isArray(data) || data.length === 0) {
      return { success: false, error: "Invalid response from Creatomate API" }
    }

    return {
      success: true,
      renderId: data[0].id,
      status: data[0].status,
    }
  } catch (error) {
    console.error("Error generating cinematic video:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

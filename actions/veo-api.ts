"use server"

import { GoogleGenAI } from "@google/genai"
import crypto from "crypto"
import { createClient } from "@supabase/supabase-js"

// Configuration
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const STORAGE_BUCKET = "veo-videos"

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

async function uploadToSupabase(videoBuffer: Buffer, fileName: string): Promise<string> {
  const supabase = getSupabaseClient()
  await ensureBucket()

  // Generate a unique path
  const uniqueId = crypto.randomBytes(8).toString("hex")
  const filePath = `${uniqueId}-${fileName}`

  // Upload to Supabase
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, videoBuffer, {
    contentType: "video/mp4",
    upsert: true,
  })

  if (error) {
    throw new Error(`Supabase upload error: ${error.message}`)
  }

  // Get public URL
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath)
  return data.publicUrl
}

export interface VeoGenerationOptions {
  prompt: string
  aspectRatio: "16:9" | "9:16"
  numberOfClips?: number
  clipDuration?: number
}

export async function generateVeoVideo(options: VeoGenerationOptions) {
  if (!GOOGLE_API_KEY) {
    return { success: false, error: "Missing Google API Key" }
  }

  const { prompt, aspectRatio, numberOfClips = 1, clipDuration = 5 } = options

  try {
    const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY })
    const videoUrls: string[] = []

    // Generate the specified number of clips
    for (let i = 0; i < numberOfClips; i++) {
      console.log(`Generating video clip ${i + 1}/${numberOfClips} with prompt: "${prompt}"`)

      // Request video generation using Veo 2 model
      let operation = await ai.models.generateVideos({
        model: "veo-2.0-generate-001",
        prompt: prompt,
        config: {
          personGeneration: "dont_allow",
          aspectRatio: aspectRatio,
          durationSeconds: clipDuration,
        },
      })

      // Poll the operation until the video is generated
      while (!operation.done) {
        await new Promise((resolve) => setTimeout(resolve, 10000)) // wait 10s before polling
        operation = await ai.operations.getVideosOperation({ operation })
      }

      // Process the generated videos
      const videos = operation.response?.generatedVideos
      if (videos && videos.length > 0) {
        for (const genVideo of videos) {
          const url = `${genVideo.video?.uri}&key=${GOOGLE_API_KEY}`

          // Download the video
          const resp = await fetch(url)
          if (!resp.ok) {
            throw new Error(`Failed to download video: ${resp.statusText}`)
          }

          // Convert to buffer
          const buffer = Buffer.from(await resp.arrayBuffer())

          // Upload to Supabase
          const fileName = `veo_clip_${i}.mp4`
          const publicUrl = await uploadToSupabase(buffer, fileName)
          videoUrls.push(publicUrl)
        }
      }
    }

    return {
      success: true,
      videoUrls,
    }
  } catch (error) {
    console.error("Error generating Veo video:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

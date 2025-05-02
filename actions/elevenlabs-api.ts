"use server"

import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"

// Configuration
const ELEVENLABS_API_ENDPOINT = "https://api.elevenlabs.io/v1/text-to-speech"
const ELEVENLABS_VOICES = {
  alloy: "pNInz6obpgDQGcFmaJgB", // Alloy - versatile, general purpose
  echo: "jsCqWAovK2LkecY7zXl4", // Echo - versatile, general purpose
  fable: "onwK4e9ZLuTAKqWW03F9", // Fable - narration, storytelling
  shimmer: "XrExE9yKIg1WjnnlVkGX", // Shimmer - cheerful, young
  nova: "yoZ06aMxZJJ28mfd3POQ", // Nova - assertive, authoritative
  ember: "jBpfuIE2acCO8z3wKNLl", // Ember - warm, mature
}

// Types
interface GenerateVoiceoverOptions {
  text: string
  voiceId?: string
  stability?: number
  similarityBoost?: number
  modelId?: string
}

interface VoiceoverResult {
  success: boolean
  audioUrl?: string
  error?: string
}

// Helper function to upload audio to Supabase
async function uploadAudioToSupabase(audioBuffer: ArrayBuffer, fileName: string): Promise<string> {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const STORAGE_BUCKET = "audio-voiceovers"

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase configuration")
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Ensure bucket exists
  try {
    const { data: buckets } = await supabase.storage.listBuckets()
    if (!buckets?.some((bucket) => bucket.name === STORAGE_BUCKET)) {
      await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: 50 * 1024 * 1024, // 50MB limit
      })
    }
  } catch (error) {
    console.error("Error ensuring bucket exists:", error)
    throw new Error("Failed to ensure storage bucket exists")
  }

  // Upload audio file
  try {
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(fileName, audioBuffer, {
      contentType: "audio/mpeg",
      upsert: true,
    })

    if (error) throw error

    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName)
    return urlData.publicUrl
  } catch (error) {
    console.error("Error uploading audio to Supabase:", error)
    throw new Error(`Failed to upload audio: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Generate a voiceover using ElevenLabs API and upload it to Supabase
 */
export async function generateVoiceover({
  text,
  voiceId = ELEVENLABS_VOICES.alloy, // Default to Alloy voice
  stability = 0.5,
  similarityBoost = 0.75,
  modelId = "eleven_monolingual_v1",
}: GenerateVoiceoverOptions): Promise<VoiceoverResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY

  if (!apiKey) {
    return { success: false, error: "Missing ElevenLabs API Key" }
  }

  if (!text || text.trim().length === 0) {
    return { success: false, error: "Text is required for voiceover generation" }
  }

  try {
    // Generate a unique filename
    const uniqueId = crypto.randomBytes(8).toString("hex")
    const fileName = `voiceover-${uniqueId}.mp3`

    // Prepare the request to ElevenLabs
    const response = await fetch(`${ELEVENLABS_API_ENDPOINT}/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
        },
      }),
    })

    if (!response.ok) {
      let errorMessage = `ElevenLabs API error: ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage += ` - ${errorData.detail || JSON.stringify(errorData)}`
      } catch {
        errorMessage += ` - ${await response.text()}`
      }
      console.error(errorMessage)
      return { success: false, error: errorMessage }
    }

    // Get the audio buffer from the response
    const audioBuffer = await response.arrayBuffer()

    // Upload to Supabase and get the URL
    const audioUrl = await uploadAudioToSupabase(audioBuffer, fileName)

    return {
      success: true,
      audioUrl,
    }
  } catch (error) {
    console.error("Error generating voiceover:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

/**
 * Get available ElevenLabs voices
 */
export function getAvailableVoices() {
  return ELEVENLABS_VOICES
}

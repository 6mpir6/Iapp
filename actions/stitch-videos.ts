"use server"

// Configuration
const CREATOMATE_API_KEY = process.env.CREATOMATE_API_KEY
const CREATOMATE_API_ENDPOINT = "https://api.creatomate.com/v1/renders"

export interface StitchVideosOptions {
  videoUrls: string[]
  transitionDuration: number
  aspectRatio: "16:9" | "9:16" | "1:1"
}

export async function stitchVideos(options: StitchVideosOptions) {
  if (!CREATOMATE_API_KEY) {
    return { success: false, error: "Missing Creatomate API Key" }
  }

  const { videoUrls, transitionDuration, aspectRatio } = options

  if (!videoUrls || videoUrls.length === 0) {
    return { success: false, error: "No video URLs provided" }
  }

  try {
    // Create elements array for the composition
    const elements = videoUrls.map((url, index) => {
      const element: any = {
        type: "video",
        track: 1,
        source: url,
      }

      // Add fade transition to all clips except the first one
      if (index > 0) {
        element.transition = {
          type: "fade",
          duration: transitionDuration,
        }
      }

      return element
    })

    // Determine dimensions based on aspect ratio
    let width = 1280
    let height = 720

    if (aspectRatio === "9:16") {
      width = 720
      height = 1280
    } else if (aspectRatio === "1:1") {
      width = 1080
      height = 1080
    }

    // Create the composition
    const composition = {
      output_format: "mp4",
      width,
      height,
      elements,
    }

    // Call Creatomate API
    const response = await fetch(CREATOMATE_API_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CREATOMATE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(composition),
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
      url: data[0].url,
    }
  } catch (error) {
    console.error("Error stitching videos:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

export async function checkStitchingStatus(renderId: string) {
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

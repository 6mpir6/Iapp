"use server"

import { v4 as uuidv4 } from "uuid"
import { memoryStore } from "@/lib/memory-store"

interface CreateVideoRequest {
  prompt: string
  image: string
}

interface CreateVideoResponse {
  success: boolean
  videoUrl?: string
  error?: string
  taskId?: string
  generationId?: string
  status?: string
}

const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY

export async function createRunwayVideo(request: CreateVideoRequest): Promise<CreateVideoResponse> {
  try {
    if (!RUNWAY_API_KEY) {
      throw new Error("Missing RUNWAY_API_KEY environment variable.")
    }

    // Generate a unique ID for tracking this generation
    const generationId = uuidv4()

    // Validate the image input
    if (!request.image) {
      throw new Error("Image is required")
    }

    // Prepare the image data - could be a URL or data URI
    const imageData = request.image

    console.log(
      "Creating video with Runway API using image:",
      imageData.substring(0, 50) + "..." + (imageData.length > 100 ? imageData.substring(imageData.length - 50) : ""),
    )

    // Call Runway API to generate video from image
    const response = await fetch("https://api.runwayml.com/v1/image_to_video", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RUNWAY_API_KEY}`,
        "Content-Type": "application/json",
        "X-Runway-Version": "2024-11-06",
      },
      body: JSON.stringify({
        model: "gen4_turbo",
        promptImage: imageData,
        promptText: request.prompt || "Cinematic camera movement",
        ratio: "1280:720", // 16:9 aspect ratio
        duration: 5, // 5 seconds
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `API Error: ${response.status}`

      try {
        const errorData = JSON.parse(errorText)
        errorMessage = `API Error: ${response.status} - ${errorData.message || JSON.stringify(errorData)}`
      } catch (e) {
        errorMessage = `API Error: ${response.status} - ${errorText.substring(0, 100)}`
      }

      throw new Error(errorMessage)
    }

    const data = await response.json()
    const taskId = data.id

    if (!taskId) {
      throw new Error("No task ID returned from Runway API")
    }

    console.log("Runway task created:", taskId)

    // Store the task ID in memory for polling
    memoryStore.set(`runway-task-${generationId}`, taskId)

    return {
      success: true,
      taskId,
      generationId,
      status: "PENDING",
    }
  } catch (error: any) {
    console.error("Error in createRunwayVideo:", error)
    return {
      success: false,
      error: error.message || "Unknown error occurred",
    }
  }
}

export async function pollForRunwayVideo(taskId: string): Promise<CreateVideoResponse> {
  try {
    if (!RUNWAY_API_KEY) {
      throw new Error("Missing RUNWAY_API_KEY environment variable.")
    }

    console.log("Polling Runway task:", taskId)

    const response = await fetch(`https://api.runwayml.com/v1/tasks/${taskId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${RUNWAY_API_KEY}`,
        "X-Runway-Version": "2024-11-06",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API Error: ${response.status} - ${errorText.substring(0, 100)}`)
    }

    const data = await response.json()
    console.log("Runway task status:", data.status)

    if (data.status === "SUCCEEDED") {
      // Task completed successfully
      const videoUrl = Array.isArray(data.output) ? data.output[0] : data.output?.video

      if (!videoUrl) {
        throw new Error("No video URL in successful response")
      }

      console.log("Video generation succeeded, URL:", videoUrl)

      return {
        success: true,
        videoUrl,
        status: "SUCCEEDED",
      }
    } else if (data.status === "FAILED") {
      // Task failed
      const errorMessage = data.error || "Video generation failed"
      console.error("Video generation failed:", errorMessage)

      return {
        success: false,
        error: errorMessage,
        status: "FAILED",
      }
    } else {
      // Task still in progress
      return {
        success: true,
        taskId,
        status: data.status,
      }
    }
  } catch (error: any) {
    console.error("Error polling Runway task:", error)
    return {
      success: false,
      error: error.message || "Unknown error occurred",
    }
  }
}

export async function getRunwayVideoStatus(generationId: string): Promise<CreateVideoResponse> {
  try {
    // Get the task ID from memory store
    const taskId = memoryStore.get(`runway-task-${generationId}`)

    if (!taskId) {
      throw new Error("Task ID not found. The generation may have expired.")
    }

    // Poll for the video status
    return await pollForRunwayVideo(taskId)
  } catch (error: any) {
    console.error("Error getting Runway video status:", error)
    return {
      success: false,
      error: error.message || "Unknown error occurred",
    }
  }
}

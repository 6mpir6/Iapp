"use server"

import type {
  VideoGenerationOptions,
  VideoTheme,
  Scene,
  ProductShowcaseData,
  CinematicData,
} from "@/components/video-generator/types"
import {
  generateProductShowcase,
  generateProductCarousel,
  generateCinematicVideo as generateCinematicVideoApi,
  checkRenderStatus,
} from "./creatomate-api"

// --- Type Definitions ---
interface VideoGenerationTask {
  id: string
  status: "pending" | "processing" | "completed" | "failed"
  progress: number
  videoUrl?: string
  error?: string
  theme: VideoTheme
  createdAt: Date
  creatomateRenderId?: string
  lastChecked?: Date
}

// In-memory storage (would use a database in production)
const videoTasks = new Map<string, VideoGenerationTask>()

// Generate a unique task ID
const generateId = () => `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

/**
 * Initiates video generation with the provided options
 */
export async function generateVideo(options: VideoGenerationOptions) {
  const { scenes, theme, productData, cinematicData } = options

  // Validate input
  if (!scenes.length) {
    return { success: false, error: "No scenes provided" }
  }

  // Create task record
  const generationId = generateId()
  videoTasks.set(generationId, {
    id: generationId,
    status: "pending",
    progress: 0,
    theme,
    createdAt: new Date(),
  })

  // Start generation process asynchronously
  startVideoGeneration(generationId, scenes, theme, productData, cinematicData).catch((error) => {
    console.error("Error in background video generation:", error)
    const task = videoTasks.get(generationId)
    if (task) {
      task.status = "failed"
      task.error = error instanceof Error ? error.message : "Unknown error"
      videoTasks.set(generationId, task)
    }
  })

  return {
    success: true,
    generationId,
  }
}

/**
 * Gets the current status of a video generation task
 */
export async function getVideoStatus(id: string) {
  const task = videoTasks.get(id)

  if (!task) {
    return {
      success: false,
      error: "Video generation task not found",
    }
  }

  // Check Creatomate status if we have a render ID and task is still processing
  if (task.creatomateRenderId && task.status === "processing") {
    // Limit polling frequency to avoid rate limits
    const now = new Date()
    const shouldCheck = !task.lastChecked || now.getTime() - task.lastChecked.getTime() > 2000 // Check every 2 seconds

    if (shouldCheck) {
      task.lastChecked = now
      videoTasks.set(id, task)

      try {
        const creatomateStatus = await checkRenderStatus(task.creatomateRenderId)

        if (creatomateStatus.success) {
          // Update task based on Creatomate status
          if (creatomateStatus.status === "succeeded") {
            task.status = "completed"
            task.progress = 1
            task.videoUrl = creatomateStatus.url
          } else if (creatomateStatus.status === "failed") {
            task.status = "failed"
            task.error = creatomateStatus.error || "Rendering failed"
          } else {
            // Map intermediate statuses to progress values
            switch (creatomateStatus.status) {
              case "planned":
                task.progress = 0.1
                break
              case "waiting":
                task.progress = 0.3
                break
              case "transcribing":
                task.progress = 0.4
                break
              case "rendering":
                task.progress = 0.6
                break
              default:
                task.progress = 0.2
            }
          }

          videoTasks.set(id, task)
        }
      } catch (error) {
        console.error(`Error checking Creatomate status for ${id}:`, error)
      }
    }
  }

  return {
    success: true,
    status: task.status,
    progress: task.progress,
    videoUrl: task.videoUrl,
    error: task.error,
  }
}

/**
 * Handles the video generation process
 */
async function startVideoGeneration(
  generationId: string,
  scenes: Scene[],
  theme: VideoTheme,
  productData?: ProductShowcaseData,
  cinematicData?: CinematicData,
) {
  // Update task status
  const task = videoTasks.get(generationId)
  if (!task) return

  task.status = "processing"
  videoTasks.set(generationId, task)

  // Choose generation method based on theme
  try {
    if (theme === "social-reel" || theme === "product-showcase") {
      await generateWithCreatomate(generationId, scenes, theme, productData)
    } else if (theme === "cinematic" && scenes.some((scene) => scene.isVideo)) {
      await generateCinematicVideo(generationId, scenes, cinematicData)
    } else {
      // Fallback for other themes
      await simulateVideoGeneration(generationId, scenes, theme)
    }
  } catch (error) {
    console.error("Error in startVideoGeneration:", error)
    const task = videoTasks.get(generationId)
    if (task) {
      task.status = "failed"
      task.error = error instanceof Error ? error.message : "Unknown error"
      videoTasks.set(generationId, task)
    }
  }
}

/**
 * Generates video using Creatomate API
 */
async function generateWithCreatomate(
  generationId: string,
  scenes: Scene[],
  theme: VideoTheme,
  productData?: ProductShowcaseData,
) {
  updateProgress(generationId, 0.1)

  try {
    let result

    if (theme === "product-showcase" && scenes.length > 0 && productData) {
      // Generate product showcase video
      result = await generateProductShowcase({
        productImageUrl: scenes[0].imageUrl,
        productName: productData.productName || "Product Name",
        productDescription: productData.productDescription || "Product Description",
        normalPrice: productData.normalPrice || "99.99",
        discountedPrice: productData.discountedPrice || "79.99",
        cta: productData.cta || "Shop Now",
        website: productData.website || "www.example.com",
        logoUrl: productData.logoUrl || undefined,
      })
    } else if (theme === "social-reel" && scenes.length >= 3) {
      // Generate product carousel (social reel)
      result = await generateProductCarousel({
        productImage1Url: scenes[0].imageUrl,
        productOffer1: scenes[0].caption || "-20%",
        productImage2Url: scenes[1].imageUrl,
        productOffer2: scenes[1].caption || "-25%",
        productImage3Url: scenes[2].imageUrl,
        productOffer3: scenes[2].caption || "-30%",
        callToAction: "See you at\nwww.mybrand.com",
      })
    } else {
      throw new Error("Invalid theme or insufficient scenes")
    }

    if (!result.success) {
      throw new Error(result.error || "Failed to generate video")
    }

    // Store render ID for status checking
    const task = videoTasks.get(generationId)
    if (!task) return

    task.creatomateRenderId = result.renderId
    task.progress = 0.3

    // If video is already completed, update task
    if (result.status === "succeeded" && result.url) {
      task.status = "completed"
      task.progress = 1
      task.videoUrl = result.url
    }

    videoTasks.set(generationId, task)
  } catch (error) {
    console.error("Error generating video:", error)
    const task = videoTasks.get(generationId)
    if (task) {
      task.status = "failed"
      task.error = error instanceof Error ? error.message : "Unknown error"
      videoTasks.set(generationId, task)
    }
    throw error // Re-throw to be caught by the caller
  }
}

/**
 * Generates cinematic video
 */
async function generateCinematicVideo(generationId: string, scenes: Scene[], cinematicData?: CinematicData) {
  updateProgress(generationId, 0.1)

  try {
    // Filter video scenes
    const videoScenes = scenes.filter((scene) => scene.isVideo && scene.videoUrl)

    if (videoScenes.length === 0) {
      throw new Error("No video scenes found for cinematic template")
    }

    // Get video URLs
    const videoUrls = videoScenes.map((scene) => scene.videoUrl!)

    // Get a profile picture (use the first non-video scene or the first scene's image)
    const profilePicture = scenes.find((scene) => !scene.isVideo)?.imageUrl || scenes[0].imageUrl

    // Use default values if cinematicData is not provided
    const data = cinematicData || {
      description: "Los Angeles, CA 90045\nCall (123) 555-1234 to arrange a viewing today",
      subtext: "Just Listed",
      brandName: "My Brand Realtors",
      name: "Elisabeth Parker",
      email: "elisabeth@mybrand.com",
      phoneNumber: "(123) 555-1234",
    }

    const result = await generateCinematicVideoApi({
      videos: videoUrls,
      picture: profilePicture,
      description: data.description,
      subtext: data.subtext,
      brandName: data.brandName,
      name: data.name,
      email: data.email,
      phoneNumber: data.phoneNumber,
    })

    if (!result.success) {
      throw new Error(result.error || "Failed to generate cinematic video")
    }

    // Store render ID for status checking
    const task = videoTasks.get(generationId)
    if (!task) return

    task.creatomateRenderId = result.renderId
    task.progress = 0.3

    videoTasks.set(generationId, task)
  } catch (error) {
    console.error("Error generating cinematic video:", error)
    const task = videoTasks.get(generationId)
    if (task) {
      task.status = "failed"
      task.error = error instanceof Error ? error.message : "Unknown error"
      videoTasks.set(generationId, task)
    }
    throw error
  }
}

/**
 * Simulates video generation for testing or unsupported themes
 */
async function simulateVideoGeneration(generationId: string, scenes: Scene[], theme: VideoTheme) {
  // Simulate progress updates
  for (let progress = 0; progress <= 100; progress += 10) {
    updateProgress(generationId, progress / 100)
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  // Complete the task
  const task = videoTasks.get(generationId)
  if (!task) return

  task.status = "completed"
  task.progress = 1
  task.videoUrl = "https://example.com/sample-video.mp4"
  videoTasks.set(generationId, task)
}

/**
 * Updates the progress of a video generation task
 */
function updateProgress(generationId: string, progress: number) {
  const task = videoTasks.get(generationId)
  if (task) {
    task.progress = progress
    videoTasks.set(generationId, task)
  }
}

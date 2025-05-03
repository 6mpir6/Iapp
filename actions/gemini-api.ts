"use server"

import { GoogleGenAI, Modality } from "@google/genai"

export interface GeminiImageGenerationRequest {
  prompt: string
  negativePrompt?: string
}

export interface GeminiImageGenerationResponse {
  imageUrl: string
  textResponse?: string
  error?: string
}

/**
 * Generates an image using Gemini's image generation capabilities.
 * @param request Image generation request parameters
 * @returns Object containing the image URL and optional text response
 */
export async function generateGeminiImage(
  request: GeminiImageGenerationRequest,
): Promise<GeminiImageGenerationResponse> {
  try {
    // Get API key and initialize the client
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error("CRITICAL: GEMINI_API_KEY environment variable is not set.")
      throw new Error("Server configuration error: Missing Gemini API Key.")
    }

    // Initialize the Gemini client
    const genAI = new GoogleGenAI({ apiKey })

    console.log(`Generating image with Gemini for prompt: "${request.prompt.substring(0, 100)}..."`)

    // Call the Gemini API with the updated model and configuration
    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash-exp-image-generation",
      contents: request.prompt,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
        temperature: 0.7,
      },
    })

    // Extract image data and text from response
    let imageData = null
    let textResponse = null
    let mimeType = "image/png"

    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0]
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            textResponse = part.text
          } else if (part.inlineData) {
            imageData = part.inlineData.data
            mimeType = part.inlineData.mimeType || mimeType
          }
        }
      }
    }

    if (!imageData) {
      throw new Error("No image data found in Gemini response")
    }

    const dataUrl = `data:${mimeType};base64,${imageData}`
    console.log("Gemini image generated successfully.")

    return {
      imageUrl: dataUrl,
      textResponse: textResponse,
    }
  } catch (error: unknown) {
    console.error("Error in generateGeminiImage function:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      imageUrl: `/placeholder.svg?height=400&width=400&text=ImgGenErr`,
      error: errorMessage,
    }
  }
}

/**
 * Edits an image using Gemini's image editing capabilities.
 * @param imageUrl URL or data URI of the image to edit
 * @param prompt Editing instructions
 * @returns Object containing the edited image URL and optional text response
 */
export async function editGeminiImage(imageUrl: string, prompt: string): Promise<GeminiImageGenerationResponse> {
  try {
    // Get API key and initialize the client
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error("CRITICAL: GEMINI_API_KEY environment variable is not set.")
      throw new Error("Server configuration error: Missing Gemini API Key.")
    }

    // Initialize the Gemini client
    const genAI = new GoogleGenAI({ apiKey })

    // Extract base64 data from data URI or fetch from URL
    let base64Data: string
    let mimeType = "image/png"

    if (imageUrl.startsWith("data:image/")) {
      // Extract the base64 data and mime type from the Data URI
      const parts = imageUrl.split(",")
      if (parts.length !== 2) {
        throw new Error("Invalid Data URI format.")
      }

      const mimeMatch = parts[0].match(/^data:(image\/\w+);base64$/)
      if (!mimeMatch || !mimeMatch[1]) {
        throw new Error("Could not determine mime type from image Data URI.")
      }
      mimeType = mimeMatch[1]
      base64Data = parts[1]
    } else {
      // Handle external URL
      try {
        console.log("Fetching external image URL on server side:", imageUrl.substring(0, 100))
        const response = await fetch(imageUrl)

        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
        }

        // Get the mime type from the response
        mimeType = response.headers.get("content-type") || "image/jpeg"

        // Convert to buffer and then to base64
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        base64Data = buffer.toString("base64")
      } catch (fetchError) {
        console.error("Error fetching external image:", fetchError)
        throw new Error(`Failed to fetch external image: ${fetchError.message}`)
      }
    }

    console.log(`Editing image with Gemini using prompt: "${prompt.substring(0, 100)}..."`)

    // Prepare the content parts for image editing
    const contents = [
      { text: prompt },
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Data,
        },
      },
    ]

    // Call the Gemini API with the updated model and configuration
    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash-exp-image-generation",
      contents: contents,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
        temperature: 0.7,
      },
    })

    // Extract image data and text from response
    let resultImageData = null
    let textResponse = null
    let resultMimeType = "image/png"

    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0]
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            textResponse = part.text
          } else if (part.inlineData) {
            resultImageData = part.inlineData.data
            resultMimeType = part.inlineData.mimeType || resultMimeType
          }
        }
      }
    }

    if (!resultImageData) {
      throw new Error("No edited image found in Gemini response")
    }

    const resultDataUrl = `data:${resultMimeType};base64,${resultImageData}`
    console.log("Gemini image edited successfully.")

    return {
      imageUrl: resultDataUrl,
      textResponse: textResponse,
    }
  } catch (error: unknown) {
    console.error("Error in editGeminiImage function:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      imageUrl: `/placeholder.svg?height=400&width=400&text=ImgEditErr`,
      error: errorMessage,
    }
  }
}

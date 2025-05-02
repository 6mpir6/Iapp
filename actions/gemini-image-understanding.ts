"use server"

import { GoogleGenAI } from "@google/genai"

interface ImageCaptionRequest {
  imageUrl: string
  style?: string
}

interface ImageCaptionResponse {
  success: boolean
  caption?: string
  error?: string
}

/**
 * Generates a caption for an image using Google Gemini API
 * @param request Image caption request parameters
 * @returns Object containing the generated caption
 */
export async function generateImageCaption(request: ImageCaptionRequest): Promise<ImageCaptionResponse> {
  console.log(`Generating caption for image with style: "${request.style || "default"}"`)

  try {
    // Check for API key
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error("CRITICAL: GEMINI_API_KEY environment variable is not set.")
      throw new Error("Server configuration error: Missing Gemini API Key.")
    }

    // Initialize the Google Generative AI client
    const genAI = new GoogleGenAI(apiKey)

    // Use the gemini-pro-vision model for image understanding
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" })

    // Extract base64 data from data URI
    let base64Data: string
    let mimeType = "image/jpeg"

    if (request.imageUrl.startsWith("data:")) {
      const parts = request.imageUrl.split(",")
      if (parts.length < 2) {
        throw new Error("Invalid data URL format")
      }

      base64Data = parts[1]

      // Try to extract mime type
      const mimeMatch = parts[0].match(/data:(.*?);base64/)
      if (mimeMatch && mimeMatch[1]) {
        mimeType = mimeMatch[1]
      }
    } else if (request.imageUrl.startsWith("http")) {
      // Fetch the image from URL
      const response = await fetch(request.imageUrl)
      const arrayBuffer = await response.arrayBuffer()
      base64Data = Buffer.from(arrayBuffer).toString("base64")

      // Try to determine mime type from URL
      if (request.imageUrl.endsWith(".png")) {
        mimeType = "image/png"
      } else if (request.imageUrl.endsWith(".jpg") || request.imageUrl.endsWith(".jpeg")) {
        mimeType = "image/jpeg"
      } else if (request.imageUrl.endsWith(".webp")) {
        mimeType = "image/webp"
      }
    } else {
      throw new Error("Unsupported image URL format")
    }

    // Prepare the prompt based on the requested style
    let prompt = "Generate a detailed caption for this image."

    if (request.style) {
      if (request.style.toLowerCase().includes("social media")) {
        prompt = "Create an engaging social media caption for this image. Include relevant hashtags."
      } else if (request.style.toLowerCase().includes("reel")) {
        prompt = "Create a catchy caption for a social media reel featuring this image. Include trending hashtags."
      } else if (request.style.toLowerCase().includes("product")) {
        prompt = "Write a professional product description caption for this image."
      } else {
        prompt = `Create a ${request.style} style caption for this image.`
      }
    }

    // Generate content
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 200,
      },
    })

    // Extract text from response
    let caption = ""

    if (result.response && result.response.text) {
      caption = result.response.text.trim()
    }

    if (!caption) {
      throw new Error("No caption was generated")
    }

    console.log("Successfully generated caption with Gemini")
    return { success: true, caption }
  } catch (error: any) {
    console.error("Error generating caption with Gemini:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    return {
      success: false,
      error: errorMessage,
    }
  }
}

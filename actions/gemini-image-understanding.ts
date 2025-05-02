"use server"

import { GoogleGenerativeAI } from "@google/generative-ai"

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

interface GenerateImageCaptionParams {
  imageUrl: string
  style?: string
}

interface GenerateImageCaptionResult {
  success: boolean
  caption?: string
  error?: string
}

export async function generateImageCaption({
  imageUrl,
  style = "social media",
}: GenerateImageCaptionParams): Promise<GenerateImageCaptionResult> {
  try {
    // If the image is a data URL, extract the base64 data
    let base64ImageData: string
    if (imageUrl.startsWith("data:")) {
      base64ImageData = imageUrl.split(",")[1]
    } else {
      // Fetch the image from URL
      const response = await fetch(imageUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      base64ImageData = Buffer.from(arrayBuffer).toString("base64")
    }

    // Get the model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" })

    // Create the prompt based on the style
    let prompt = "Generate a caption for this image."
    if (style) {
      prompt += ` The caption should be in the style of a ${style} post.`
      if (style.includes("social media")) {
        prompt += " Include relevant hashtags at the end."
      }
    }

    // Generate content with the image
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "image/jpeg", // Assuming JPEG, adjust if needed
          data: base64ImageData,
        },
      },
      { text: prompt },
    ])

    const response = await result.response
    const caption = response.text()

    return {
      success: true,
      caption,
    }
  } catch (error) {
    console.error("Error generating caption:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

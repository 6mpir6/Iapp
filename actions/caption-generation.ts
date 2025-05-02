"use server"

import { GoogleGenAI } from "@google/genai"

// Initialize the Google Generative AI client
const getGoogleAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set")
  }
  return new GoogleGenAI({ apiKey })
}

interface CaptionGenerationOptions {
  imageUrl: string
  style?: string
}

export async function generateCaption(options: CaptionGenerationOptions) {
  const { imageUrl, style = "social media" } = options

  try {
    const genAI = getGoogleAIClient()

    // Extract base64 data from data URI
    let base64Data: string
    let mimeType: string

    if (imageUrl.startsWith("data:")) {
      const parts = imageUrl.split(",")
      base64Data = parts[1]
      mimeType = parts[0].split(":")[1].split(";")[0]
    } else if (imageUrl.startsWith("http")) {
      // Fetch image from URL and convert to base64
      const response = await fetch(imageUrl)
      const arrayBuffer = await response.arrayBuffer()
      base64Data = Buffer.from(arrayBuffer).toString("base64")
      mimeType = response.headers.get("content-type") || "image/jpeg"
    } else {
      throw new Error("Invalid image URL format")
    }

    // Use Gemini for image understanding
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

    // Prepare prompt for caption generation
    const prompt = `Generate a concise, engaging ${style} caption for this image. Keep it under 2 sentences and make it catchy. The caption should be attention-grabbing and suitable for social media.`

    // Call Gemini with the image data
    const result = await model.generateContent({
      contents: [
        {
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
    })

    // Extract the caption from the response
    const caption = result.response.text().trim()

    return {
      success: true,
      caption,
    }
  } catch (error) {
    console.error("Error generating caption:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred during caption generation",
    }
  }
}

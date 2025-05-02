"use server"

import { GoogleGenAI, Modality } from "@google/genai"
import OpenAI from "openai"
import type { AspectRatio, ImageEditOptions, ImageGenerationOptions } from "@/components/video-generator/types"

// Initialize the Google Generative AI client
const getGoogleAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set")
  }
  return new GoogleGenAI({ apiKey })
}

// Initialize the OpenAI client
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set")
  }
  return new OpenAI({ apiKey })
}

// Map aspect ratio to dimensions for the OpenAI API
const aspectRatioToDimensions = (aspectRatio: AspectRatio) => {
  switch (aspectRatio) {
    case "16:9":
      return "1792x1024"
    case "9:16":
      return "1024x1792"
    case "1:1":
    default:
      return "1024x1024"
  }
}

// Helper function to safely extract base64 data from a data URI
function extractBase64FromDataUri(dataUri: string): { base64Data: string; mimeType: string } {
  // Default values in case parsing fails
  let base64Data = ""
  let mimeType = "image/png"

  try {
    // Handle both formats: data:image/png;base64,ABC123 and ABC123 (already extracted)
    if (dataUri.startsWith("data:")) {
      const parts = dataUri.split(",")
      if (parts.length > 1) {
        base64Data = parts[1]

        // Try to extract mime type
        const mimeMatch = parts[0].match(/data:(.*?);base64/)
        if (mimeMatch && mimeMatch[1]) {
          mimeType = mimeMatch[1]
        }
      }
    } else {
      // Assume it's already just the base64 data
      base64Data = dataUri
    }
  } catch (error) {
    console.error("Error extracting base64 data:", error)
  }

  return { base64Data, mimeType }
}

export async function generateImage(options: ImageGenerationOptions) {
  try {
    if (options.mode === "basic") {
      // Use Gemini 2.0 Flash Experimental instead of Imagen
      return await generateImageWithGemini(options)
    } else {
      // Use OpenAI's GPT-4 Vision
      return await generateImageWithOpenAI(options)
    }
  } catch (error) {
    console.error("Error generating image:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

// Generate image with Gemini 2.0 Flash Experimental
async function generateImageWithGemini(options: ImageGenerationOptions) {
  const { prompt, aspectRatio } = options

  try {
    const ai = getGoogleAIClient()

    console.log("Generating image with Gemini 2.0 Flash Experimental...")
    console.log("Prompt:", prompt)

    // Use gemini-2.0-flash-exp-image-generation instead of Imagen
    const response = await ai.models.generateContent({
      model: "imagen-3.0-generate-002",
      contents: prompt,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
        temperature: 0.7,
      },
    })

    // Extract image data from response
    let imageUrl: string | null = null
    let textResponse: string | null = null

    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0]
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            const mimeType = part.inlineData.mimeType
            const base64Data = part.inlineData.data
            imageUrl = `data:${mimeType};base64,${base64Data}`
            break
          } else if (part.text) {
            textResponse = part.text
          }
        }
      }
    }

    if (!imageUrl) {
      throw new Error("No image was generated")
    }

    console.log("Successfully generated image with Gemini")
    return {
      success: true,
      imageUrl,
      textResponse,
    }
  } catch (error) {
    console.error("Error generating image with Gemini:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred during Gemini generation",
    }
  }
}

// Generate image with OpenAI's GPT-4 Vision
async function generateImageWithOpenAI(options: ImageGenerationOptions) {
  const { prompt, negativePrompt, aspectRatio } = options

  try {
    const openai = getOpenAIClient()

    // Combine prompt and negative prompt
    const fullPrompt = negativePrompt ? `${prompt}. DO NOT include: ${negativePrompt}` : prompt

    const size = aspectRatioToDimensions(aspectRatio)

    // FIXED: Removed response_format parameter as it's not supported for gpt-image-1
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: fullPrompt,
      size: size as any,
      quality: "high",
      n: 1,
      // response_format parameter removed as it's not needed - gpt-image-1 always returns base64
    })

    if (!response.data || response.data.length === 0) {
      throw new Error("No image data returned from OpenAI")
    }

    // For gpt-image-1, the response contains b64_json directly
    const dataUri = `data:image/png;base64,${response.data[0].b64_json}`

    return {
      success: true,
      imageUrl: dataUri,
    }
  } catch (error) {
    console.error("Error generating image with OpenAI:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred during OpenAI generation",
    }
  }
}

// Edit image
export async function editImage(options: ImageEditOptions) {
  const { imageUrl, prompt, maskUrl } = options

  try {
    if (!maskUrl) {
      // Use text-based editing with Gemini
      return await editImageWithGemini(imageUrl, prompt)
    } else {
      // Use mask-based editing with OpenAI
      return await editImageWithOpenAIMask(imageUrl, prompt, maskUrl)
    }
  } catch (error) {
    console.error("Error editing image:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred during image editing",
    }
  }
}

// Edit image with Gemini
async function editImageWithGemini(imageUrl: string, prompt: string) {
  try {
    const genAI = getGoogleAIClient()

    // Extract base64 data from data URI safely
    const { base64Data, mimeType } = extractBase64FromDataUri(imageUrl)

    if (!base64Data) {
      throw new Error("Failed to extract image data")
    }

    // Prepare the content parts
    const contents = [
      { text: prompt },
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
    ]

    // Call Gemini for image editing
    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash-exp-image-generation",
      contents,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    })

    // Extract image data from response
    let resultBase64Data = null
    let resultMimeType = "image/png"

    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0]
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            resultBase64Data = part.inlineData.data
            resultMimeType = part.inlineData.mimeType || resultMimeType
            break
          }
        }
      }
    }

    if (!resultBase64Data) {
      throw new Error("No edited image found in response")
    }

    const resultDataUrl = `data:${resultMimeType};base64,${resultBase64Data}`

    return {
      success: true,
      imageUrl: resultDataUrl,
    }
  } catch (error) {
    console.error("Error editing image with Gemini:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred during Gemini editing",
    }
  }
}

// Edit image with OpenAI mask
async function editImageWithOpenAIMask(imageUrl: string, prompt: string, maskUrl: string) {
  try {
    const openai = getOpenAIClient()

    // Extract base64 data from data URIs safely
    const { base64Data: imageBase64 } = extractBase64FromDataUri(imageUrl)
    const { base64Data: maskBase64 } = extractBase64FromDataUri(maskUrl)

    if (!imageBase64 || !maskBase64) {
      throw new Error("Failed to extract image or mask data")
    }

    // Create edit request
    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: Buffer.from(imageBase64, "base64"),
      mask: Buffer.from(maskBase64, "base64"),
      prompt,
      n: 1,
    })

    if (!response.data || response.data.length === 0 || !response.data[0].b64_json) {
      throw new Error("No image data returned from OpenAI")
    }

    const dataUri = `data:image/png;base64,${response.data[0].b64_json}`

    return {
      success: true,
      imageUrl: dataUri,
    }
  } catch (error) {
    console.error("Error editing image with OpenAI:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred during OpenAI editing",
    }
  }
}

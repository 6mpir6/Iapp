"use client"

import type React from "react"
import { useState, useCallback } from "react"

interface ImageDataProcessorProps {
  onProcessComplete: (processedData: {
    imageBase64: string
    maskBase64?: string
    mimeType: string
  }) => void
  children: React.ReactNode
}

/**
 * Component that processes image data from various formats
 */
export function ImageDataProcessor({ onProcessComplete, children }: ImageDataProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const processImageData = useCallback(
    async (imageUrl: string, maskUrl?: string) => {
      setIsProcessing(true)

      try {
        // Process main image
        const { base64Data: imageBase64, mimeType } = extractImageData(imageUrl)

        // Process mask if provided
        let maskBase64: string | undefined = undefined
        if (maskUrl) {
          const { base64Data } = extractImageData(maskUrl)
          maskBase64 = base64Data
        }

        onProcessComplete({
          imageBase64,
          maskBase64,
          mimeType,
        })
      } catch (error) {
        console.error("Error processing image data:", error)
      } finally {
        setIsProcessing(false)
      }
    },
    [onProcessComplete],
  )

  return <div className={isProcessing ? "opacity-50 pointer-events-none" : ""}>{children}</div>
}

/**
 * Extracts base64 data and mime type from various image formats
 */
function extractImageData(dataUri: string): { base64Data: string; mimeType: string } {
  if (!dataUri) {
    return { base64Data: "", mimeType: "image/png" }
  }

  try {
    // Handle data URI format
    if (dataUri.startsWith("data:")) {
      const parts = dataUri.split(",")
      if (parts.length > 1) {
        const base64Data = parts[1]
        let mimeType = "image/png"

        const mimeMatch = parts[0].match(/data:(.*?);base64/)
        if (mimeMatch && mimeMatch[1]) {
          mimeType = mimeMatch[1]
        }

        return { base64Data, mimeType }
      }
    }

    // Handle URLs
    if (dataUri.startsWith("http")) {
      return { base64Data: dataUri, mimeType: "image/png" }
    }

    // Handle raw base64 data
    if (/^[A-Za-z0-9+/=]+$/.test(dataUri)) {
      return { base64Data: dataUri, mimeType: "image/png" }
    }

    // Default fallback
    return { base64Data: dataUri, mimeType: "image/png" }
  } catch (error) {
    console.error("Error extracting image data:", error)
    return { base64Data: "", mimeType: "image/png" }
  }
}

/**
 * Hook for using image data processing in client components
 */
export function useImageDataProcessor() {
  const extractBase64FromDataUri = useCallback((dataUri: string) => {
    return extractImageData(dataUri)
  }, [])

  return { extractBase64FromDataUri }
}

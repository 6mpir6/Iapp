"use client"

import { useState, useCallback, useEffect } from "react"
import { generateVideo, getVideoStatus } from "@/actions/video-generation"
import type { VideoTheme, Scene } from "./types"

// Update the ProductData interface to match what our API expects
interface ProductData {
  productName: string
  productDescription: string
  normalPrice: string
  discountedPrice: string
  cta: string
  website: string
  logoUrl?: string | null
}

export function useVideoGeneration() {
  const [videoTheme, setVideoTheme] = useState<VideoTheme>("social-reel")
  const [productData, setProductData] = useState<ProductData>({
    productName: "",
    productDescription: "",
    normalPrice: "",
    discountedPrice: "",
    cta: "",
    website: "",
    logoUrl: null,
  })
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [generationId, setGenerationId] = useState<string | null>(null)
  const [pollingCount, setPollingCount] = useState(0) // Track polling attempts

  // Update the startVideoGeneration function to properly format the product data
  const startVideoGeneration = useCallback(
    async ({
      scenes,
      theme,
      productData,
    }: {
      scenes: Scene[]
      theme: VideoTheme
      productData?: ProductData
    }) => {
      try {
        setIsGeneratingVideo(true)
        setVideoProgress(0)
        setVideoUrl(null)
        setVideoError(null)
        setPollingCount(0)

        // Format product data for API
        const formattedProductData =
          theme === "product-showcase" && productData
            ? {
                productName: productData.productName || "",
                productDescription: productData.productDescription || "",
                normalPrice: productData.normalPrice || "",
                discountedPrice: productData.discountedPrice || "",
                cta: productData.cta || "",
                website: productData.website || "",
                logoUrl: productData.logoUrl || null, // Add logo URL if you have one
              }
            : undefined

        const response = await generateVideo({
          scenes,
          theme,
          productData: formattedProductData,
        })

        if (!response.success) {
          throw new Error(response.error || "Failed to start video generation")
        }

        setGenerationId(response.generationId)
      } catch (error) {
        console.error("Error starting video generation:", error)
        setVideoError(error instanceof Error ? error.message : "Unknown error occurred")
        setIsGeneratingVideo(false)
      }
    },
    [],
  )

  // Reset video state
  const resetVideoState = useCallback(() => {
    setVideoUrl(null)
    setVideoError(null)
    setVideoProgress(0)
    setIsGeneratingVideo(false)
    setGenerationId(null)
    setPollingCount(0)
  }, [])

  // Poll for video status
  useEffect(() => {
    if (!generationId || !isGeneratingVideo) return

    const MAX_POLLING_ATTEMPTS = 30 // Maximum number of polling attempts (10 minutes at 20s intervals)

    const checkStatus = async () => {
      try {
        if (pollingCount >= MAX_POLLING_ATTEMPTS) {
          throw new Error("Video generation timed out after multiple attempts")
        }

        const response = await getVideoStatus(generationId)

        if (!response.success) {
          throw new Error(response.error || "Failed to get video status")
        }

        setVideoProgress(response.progress)

        if (response.status === "completed") {
          setVideoUrl(response.videoUrl || null)
          setIsGeneratingVideo(false)
        } else if (response.status === "failed") {
          throw new Error(response.error || "Video generation failed")
        } else {
          // Still processing, increment polling count
          setPollingCount((prev) => prev + 1)
        }
      } catch (error) {
        console.error("Error checking video status:", error)
        setVideoError(error instanceof Error ? error.message : "Unknown error occurred")
        setIsGeneratingVideo(false)
      }
    }

    // Check status immediately
    checkStatus()

    // Then check every 20 seconds
    const interval = setInterval(checkStatus, 20000)

    return () => clearInterval(interval)
  }, [generationId, isGeneratingVideo, pollingCount])

  return {
    videoTheme,
    setVideoTheme,
    productData,
    setProductData,
    isGeneratingVideo,
    videoProgress,
    videoUrl,
    videoError,
    startVideoGeneration,
    resetVideoState,
  }
}

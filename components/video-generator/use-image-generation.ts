"use client"

import { useState, useCallback } from "react"
import { generateImage as generateImageAction } from "@/actions/image-generation"
import { editImage as editImageAction } from "@/actions/image-generation"
import { generateImageCaption } from "@/actions/gemini-image-understanding"
import type { AspectRatio, GenerationMode } from "./types"

export function useImageGeneration() {
  // Generation mode and input state
  const [generationMode, setGenerationMode] = useState<GenerationMode>("basic")
  const [prompt, setPrompt] = useState("")
  const [negativePrompt, setNegativePrompt] = useState("")
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9")

  // Image state
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null)

  // Caption state
  const [currentCaption, setCurrentCaption] = useState("")
  const [isCaptionLoading, setIsCaptionLoading] = useState(false)

  // Edit state
  const [editMode, setEditMode] = useState(false)
  const [editPrompt, setEditPrompt] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Function to generate caption using Gemini
  const generateCaption = useCallback(async () => {
    const imageUrl = editedImageUrl || generatedImageUrl
    if (!imageUrl) return

    setIsCaptionLoading(true)
    setCurrentCaption("")

    try {
      console.log("Generating caption for image using Gemini...")
      const captionResult = await generateImageCaption({
        imageUrl,
        style: "social media reel caption",
      })

      console.log("Caption generation result:", captionResult)

      if (captionResult.success && captionResult.caption) {
        setCurrentCaption(captionResult.caption)
      } else {
        console.error("Failed to generate caption:", captionResult.error)
        // Don't show alert, just set a default caption
        setCurrentCaption("Add your caption here...")
      }
    } catch (error) {
      console.error("Error generating caption", error)
      // Don't show alert, just set a default caption
      setCurrentCaption("Add your caption here...")
    } finally {
      setIsCaptionLoading(false)
    }
  }, [generatedImageUrl, editedImageUrl])

  // Function to start image generation
  const startImageGeneration = useCallback(async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    setGeneratedImageUrl(null)
    setEditedImageUrl(null)
    setCurrentCaption("")
    setError(null)

    try {
      // First try with the specified mode
      let response = await generateImageAction({
        prompt,
        negativePrompt,
        aspectRatio,
        mode: generationMode,
      })

      // If basic mode fails, try with advanced mode
      if (!response.success && generationMode === "basic") {
        console.log("Basic mode failed, trying advanced mode...")
        response = await generateImageAction({
          prompt,
          negativePrompt,
          aspectRatio,
          mode: "advanced",
        })
      }

      // If advanced mode fails too or was the original mode, use a placeholder
      if (!response.success) {
        console.error("Both image generation modes failed:", response.error)

        // Create a placeholder image with the prompt text
        const placeholderUrl = `/placeholder.svg?height=512&width=${
          aspectRatio === "16:9" ? 910 : aspectRatio === "9:16" ? 288 : 512
        }&text=${encodeURIComponent(prompt)}`

        setGeneratedImageUrl(placeholderUrl)
        setCurrentCaption(prompt) // Use the prompt as the caption
        setError("Image generation failed. Using placeholder image.")
      } else {
        setGeneratedImageUrl(response.imageUrl)

        // Automatically generate caption using Gemini
        setIsCaptionLoading(true)
        try {
          const captionResponse = await generateImageCaption({
            imageUrl: response.imageUrl,
            style: "social media",
          })

          if (captionResponse.success && captionResponse.caption) {
            setCurrentCaption(captionResponse.caption)
          } else {
            console.error("Failed to generate caption:", captionResponse.error)
            setCurrentCaption(prompt) // Use the prompt as the caption
          }
        } catch (error) {
          console.error("Error generating caption:", error)
          setCurrentCaption(prompt) // Use the prompt as the caption
        } finally {
          setIsCaptionLoading(false)
        }
      }
    } catch (error) {
      console.error("Error generating image:", error)
      setError(error instanceof Error ? error.message : "Unknown error occurred")

      // Create a placeholder image with the prompt text
      const placeholderUrl = `/placeholder.svg?height=512&width=${
        aspectRatio === "16:9" ? 910 : aspectRatio === "9:16" ? 288 : 512
      }&text=${encodeURIComponent(prompt)}`

      setGeneratedImageUrl(placeholderUrl)
      setCurrentCaption(prompt) // Use the prompt as the caption
    } finally {
      setIsGenerating(false)
    }
  }, [prompt, negativePrompt, aspectRatio, generationMode])

  // Function to edit the image
  const handleEditImage = useCallback(
    async (maskUrl?: string) => {
      if (!generatedImageUrl || (!editPrompt.trim() && !maskUrl)) return

      setIsEditing(true)
      setEditedImageUrl(null)
      setError(null)

      try {
        const response = await editImageAction({
          imageUrl: generatedImageUrl,
          prompt: editPrompt,
          maskUrl,
        })

        if (response.success && response.imageUrl) {
          setEditedImageUrl(response.imageUrl)
          setEditMode(false)

          // Automatically generate caption for edited image using Gemini
          setIsCaptionLoading(true)
          try {
            const captionResponse = await generateImageCaption({
              imageUrl: response.imageUrl,
              style: "social media",
            })

            if (captionResponse.success && captionResponse.caption) {
              setCurrentCaption(captionResponse.caption)
            } else {
              console.error("Failed to generate caption for edited image:", captionResponse.error)
              // Keep the existing caption
            }
          } catch (error) {
            console.error("Error generating caption for edited image:", error)
            // Keep the existing caption
          } finally {
            setIsCaptionLoading(false)
          }
        } else {
          setError(response.error || "Failed to edit image")
          // Keep the original image
          setEditMode(false)
        }
      } catch (error) {
        console.error("Error editing image:", error)
        setError(error instanceof Error ? error.message : "Unknown error occurred")
        // Keep the original image
        setEditMode(false)
      } finally {
        setIsEditing(false)
      }
    },
    [generatedImageUrl, editPrompt],
  )

  // Function to reset image state
  const resetImageState = useCallback(() => {
    setGeneratedImageUrl(null)
    setEditedImageUrl(null)
    setCurrentCaption("")
    setEditMode(false)
    setEditPrompt("")
    setIsEditing(false)
  }, [])

  // Function to set caption loading state
  const setCaptionLoading = useCallback((loading: boolean) => {
    setIsCaptionLoading(loading)
  }, [])

  return {
    generationMode,
    setGenerationMode,
    prompt,
    setPrompt,
    negativePrompt,
    setNegativePrompt,
    aspectRatio,
    setAspectRatio,
    isGenerating,
    generatedImageUrl,
    setGeneratedImageUrl,
    startImageGeneration,
    currentCaption,
    setCurrentCaption,
    isCaptionLoading,
    setCaptionLoading,
    editMode,
    setEditMode,
    editPrompt,
    setEditPrompt,
    handleEditImage,
    isEditing,
    editedImageUrl,
    resetImageState,
    generateCaption,
    error,
  }
}

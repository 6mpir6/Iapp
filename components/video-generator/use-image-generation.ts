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
        alert(`Caption generation failed: ${captionResult.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error generating caption", error)
      alert("An unexpected error occurred during caption generation.")
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
      const response = await generateImageAction({
        prompt,
        negativePrompt,
        aspectRatio,
        mode: generationMode,
      })

      if (response.success && response.imageUrl) {
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
          }
        } catch (error) {
          console.error("Error generating caption:", error)
        } finally {
          setIsCaptionLoading(false)
        }
      } else {
        setError(response.error || "Failed to generate image")
      }
    } catch (error) {
      console.error("Error generating image:", error)
      setError(error instanceof Error ? error.message : "Unknown error occurred")
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
            }
          } catch (error) {
            console.error("Error generating caption for edited image:", error)
          } finally {
            setIsCaptionLoading(false)
          }
        } else {
          setError(response.error || "Failed to edit image")
        }
      } catch (error) {
        console.error("Error editing image:", error)
        setError(error instanceof Error ? error.message : "Unknown error occurred")
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
  }
}

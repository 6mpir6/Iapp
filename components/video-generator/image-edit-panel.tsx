"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Wand2, Loader2, Film, Video } from "lucide-react"
import { createRunwayVideo, getRunwayVideoStatus } from "@/actions/runway-api"

interface ImageEditPanelProps {
  onEditModeChange: (mode: boolean) => void
  editPrompt: string
  onEditPromptChange: (prompt: string) => void
  onApplyEdit: () => void
  isEditing: boolean
  disabled: boolean
  imageUrl?: string | null
  onCreateVideo?: (videoUrl: string) => void
}

export function ImageEditPanel({
  onEditModeChange,
  editPrompt,
  onEditPromptChange,
  onApplyEdit,
  isEditing,
  disabled,
  imageUrl,
  onCreateVideo,
}: ImageEditPanelProps) {
  const [isCreatingVideo, setIsCreatingVideo] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [generationId, setGenerationId] = useState<string | null>(null)
  const [pollingStatus, setPollingStatus] = useState<string | null>(null)

  const handleCreateVideo = async () => {
    if (!imageUrl) {
      setVideoError("No image available for video creation")
      return
    }

    setIsCreatingVideo(true)
    setVideoError(null)
    setPollingStatus("Starting video generation...")

    try {
      console.log("Creating video from image:", imageUrl.substring(0, 50) + "...")

      const response = await createRunwayVideo({
        prompt: editPrompt || "Cinematic camera movement",
        image: imageUrl,
      })

      if (!response.success || response.error) {
        setVideoError(response.error || "Failed to start video generation")
        setIsCreatingVideo(false)
        return
      }

      if (response.generationId) {
        setGenerationId(response.generationId)
        setPollingStatus(`Video generation started. Status: ${response.status || "PENDING"}`)
      } else {
        setVideoError("No generation ID returned")
        setIsCreatingVideo(false)
      }
    } catch (error) {
      setVideoError(error instanceof Error ? error.message : "Unknown error")
      setIsCreatingVideo(false)
    }
  }

  // Poll for video status
  useEffect(() => {
    if (!generationId || !isCreatingVideo) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await getRunwayVideoStatus(generationId)

        if (!response.success || response.error) {
          setVideoError(response.error || "Video generation failed")
          setIsCreatingVideo(false)
          clearInterval(pollInterval)
          return
        }

        if (response.status) {
          setPollingStatus(`Status: ${response.status}`)
        }

        if (response.videoUrl) {
          if (onCreateVideo) {
            onCreateVideo(response.videoUrl)
          }
          setIsCreatingVideo(false)
          setPollingStatus("Video created successfully!")
          clearInterval(pollInterval)
        }
      } catch (error) {
        setVideoError(error instanceof Error ? error.message : "Unknown error during polling")
        setIsCreatingVideo(false)
        clearInterval(pollInterval)
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(pollInterval)
  }, [generationId, isCreatingVideo, onCreateVideo])

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onEditModeChange(true)}
            disabled={disabled || isEditing || isCreatingVideo}
            className="flex-1"
          >
            Edit with Mask
          </Button>
          <Button
            variant="outline"
            onClick={handleCreateVideo}
            disabled={disabled || isEditing || isCreatingVideo || !imageUrl}
            className="flex-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30"
          >
            {isCreatingVideo ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Film className="mr-2 h-4 w-4" />
                Create Video
              </>
            )}
          </Button>
        </div>
        <Input
          placeholder="Describe your edit or video motion..."
          value={editPrompt}
          onChange={(e) => onEditPromptChange(e.target.value)}
          disabled={disabled || isEditing || isCreatingVideo}
        />
      </div>
      <Button
        onClick={onApplyEdit}
        disabled={disabled || isEditing || isCreatingVideo || !editPrompt.trim()}
        className="w-full"
      >
        {isEditing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Applying Edit...
          </>
        ) : (
          <>
            <Wand2 className="mr-2 h-4 w-4" />
            Apply Text Edit
          </>
        )}
      </Button>

      {isCreatingVideo && pollingStatus && (
        <div className="text-sm text-blue-600 dark:text-blue-400 mt-2 flex items-center">
          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          {pollingStatus}
        </div>
      )}

      {!isCreatingVideo && pollingStatus === "Video created successfully!" && (
        <div className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center">
          <Video className="mr-2 h-3 w-3" />
          {pollingStatus}
        </div>
      )}

      {videoError && <div className="text-sm text-red-500 mt-2">{videoError}</div>}
    </div>
  )
}

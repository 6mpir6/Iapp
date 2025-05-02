"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, RefreshCw } from "lucide-react"
import { generateImageCaption } from "@/actions/gemini-image-understanding"

interface CaptionInputProps {
  value: string
  onChange: (value: string) => void
  isLoading: boolean
  disabled?: boolean
  imageUrl?: string | null
}

export function CaptionInput({ value, onChange, isLoading, disabled, imageUrl }: CaptionInputProps) {
  const [isRegenerating, setIsRegenerating] = useState(false)

  const handleRegenerateCaption = async () => {
    if (!imageUrl) return

    setIsRegenerating(true)
    try {
      const result = await generateImageCaption({
        imageUrl,
        style: "social media reel caption",
      })

      if (result.success && result.caption) {
        onChange(result.caption)
      } else {
        console.error("Failed to regenerate caption:", result.error)
      }
    } catch (error) {
      console.error("Error regenerating caption:", error)
    } finally {
      setIsRegenerating(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label htmlFor="caption" className="text-sm font-medium">
          Caption <span className="text-blue-600">(will be displayed and narrated in video)</span>
        </Label>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRegenerateCaption}
          disabled={disabled || isLoading || isRegenerating || !imageUrl}
          className="h-7 px-2 text-xs"
        >
          {isRegenerating || isLoading ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="mr-1 h-3 w-3" />
              Regenerate
            </>
          )}
        </Button>
      </div>
      <Textarea
        id="caption"
        placeholder={isLoading ? "Generating caption..." : "Enter or generate a caption for this image..."}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || isLoading}
        className="resize-none h-20"
      />
      {isLoading && (
        <p className="text-xs text-muted-foreground">AI is analyzing the image and generating a caption...</p>
      )}
    </div>
  )
}

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Wand2 } from "lucide-react"
import { editImage } from "@/actions/image-generation"
import { MaskEditor } from "./mask-editor"
import { useImageDataProcessor } from "./image-data-processor"

interface ImageEditPanelProps {
  imageUrl: string
  onEditComplete: (newImageUrl: string) => void
}

export function ImageEditPanel({ imageUrl, onEditComplete }: ImageEditPanelProps) {
  const [prompt, setPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMaskEditor, setShowMaskEditor] = useState(false)
  const [maskUrl, setMaskUrl] = useState<string | null>(null)

  // Use our helper hook
  const { extractBase64FromDataUri } = useImageDataProcessor()

  const handleEditImage = async () => {
    if (!prompt.trim() || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      // Process the image data on the client side
      const { base64Data: imageBase64, mimeType } = extractBase64FromDataUri(imageUrl)
      let maskBase64 = null

      if (maskUrl) {
        const { base64Data } = extractBase64FromDataUri(maskUrl)
        maskBase64 = base64Data
      }

      // Now we can safely pass the processed data to the server action
      const result = await editImage({
        imageUrl: imageBase64,
        prompt,
        maskUrl: maskBase64,
      })

      if (!result.success || !result.imageUrl) {
        throw new Error(result.error || "Failed to edit image")
      }

      onEditComplete(result.imageUrl)
      setPrompt("")
      setMaskUrl(null)
      setShowMaskEditor(false)
    } catch (error) {
      console.error("Error editing image:", error)
      setError(error instanceof Error ? error.message : "Unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleMaskGenerated = (maskDataUrl: string) => {
    setMaskUrl(maskDataUrl)
    setShowMaskEditor(false)
  }

  return (
    <div className="space-y-4">
      {showMaskEditor ? (
        <MaskEditor
          imageUrl={imageUrl}
          onMaskGenerated={handleMaskGenerated}
          onCancel={() => setShowMaskEditor(false)}
        />
      ) : (
        <>
          <div className="space-y-2">
            <label htmlFor="edit-prompt" className="block text-sm font-medium">
              Edit Instructions
            </label>
            <Textarea
              id="edit-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe how you want to edit this image..."
              className="min-h-[100px]"
              disabled={isLoading}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setShowMaskEditor(true)} disabled={isLoading}>
              Use Mask Editor
            </Button>

            {maskUrl && (
              <Button variant="outline" onClick={() => setMaskUrl(null)} disabled={isLoading} className="text-red-500">
                Clear Mask
              </Button>
            )}
          </div>

          {maskUrl && (
            <div className="mt-2">
              <p className="text-sm text-green-600 mb-2">Mask applied! White areas will be edited.</p>
              <div className="relative w-32 h-32 border border-gray-300 rounded overflow-hidden">
                <img src={maskUrl || "/placeholder.svg"} alt="Mask preview" className="object-contain w-full h-full" />
              </div>
            </div>
          )}

          <Button onClick={handleEditImage} disabled={isLoading || !prompt.trim()} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Editing...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Apply Edit
              </>
            )}
          </Button>

          {error && <div className="p-3 text-sm bg-red-100 border border-red-300 text-red-800 rounded">{error}</div>}
        </>
      )}
    </div>
  )
}

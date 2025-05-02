"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { PexelsImagePicker } from "./pexels-image-picker"
import { generateBulkImages } from "@/actions/generate-images"
import { Loader2, ImageIcon } from "lucide-react"

interface ImageReplacementModalProps {
  isOpen: boolean
  onClose: () => void
  onImageSelect: (imageDataUri: string, source: "pexels" | "gemini", sourceId?: string) => void
  imageId: string
  currentImageDescription?: string
}

export function ImageReplacementModal({
  isOpen,
  onClose,
  onImageSelect,
  imageId,
  currentImageDescription = "",
}: ImageReplacementModalProps) {
  const [activeTab, setActiveTab] = useState<"pexels" | "gemini">("pexels")
  const [pexelsQuery, setPexelsQuery] = useState(currentImageDescription || "")
  const [geminiPrompt, setGeminiPrompt] = useState(currentImageDescription || "")
  const [selectedPexelsImage, setSelectedPexelsImage] = useState<{ url: string; id?: string } | null>(null)
  const [generatedImages, setGeneratedImages] = useState<Array<{ url: string; id: string }>>([])
  const [selectedGeminiImage, setSelectedGeminiImage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isInserting, setIsInserting] = useState(false)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      // Enhance the description for better search results
      const enhancedDescription = currentImageDescription
        ? currentImageDescription.replace(/placeholder/gi, "").trim()
        : ""

      setPexelsQuery(enhancedDescription || "")
      setGeminiPrompt(enhancedDescription || "")
      setSelectedPexelsImage(null)
      setSelectedGeminiImage(null)
      setGeneratedImages([])
    }
  }, [isOpen, currentImageDescription])

  // Handle Pexels image selection
  const handlePexelsImageSelect = (imageDataUri: string, pexelsId?: string) => {
    setSelectedPexelsImage({ url: imageDataUri, id: pexelsId })
  }

  // Handle Gemini image generation
  const handleGenerateImages = async () => {
    if (!geminiPrompt.trim()) return

    setIsGenerating(true)
    setGeneratedImages([])
    setSelectedGeminiImage(null)

    try {
      const result = await generateBulkImages({
        prompt: geminiPrompt,
        count: 4, // Generate 4 images at once
      })

      setGeneratedImages(result.images)
    } catch (error) {
      console.error("Error generating images:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  // Handle image selection and insertion
  const handleInsert = () => {
    setIsInserting(true)

    try {
      if (activeTab === "pexels" && selectedPexelsImage) {
        onImageSelect(selectedPexelsImage.url, "pexels", selectedPexelsImage.id)
      } else if (activeTab === "gemini" && selectedGeminiImage) {
        onImageSelect(selectedGeminiImage, "gemini")
      }
    } finally {
      setIsInserting(false)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
        <DialogHeader>
          <DialogTitle>Replace Image</DialogTitle>
          <DialogDescription>Choose a replacement image from Pexels or generate one with Gemini</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "pexels" | "gemini")}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="pexels">Pexels Photos</TabsTrigger>
            <TabsTrigger value="gemini">Generate with Gemini</TabsTrigger>
          </TabsList>

          <TabsContent value="pexels" className="space-y-4">
            <PexelsImagePicker
              onImageSelect={handlePexelsImageSelect}
              defaultQuery={pexelsQuery}
              selectedImageUrl={selectedPexelsImage?.url}
            />
          </TabsContent>

          <TabsContent value="gemini" className="space-y-4">
            <div className="flex gap-2 mb-4">
              <Input
                value={geminiPrompt}
                onChange={(e) => setGeminiPrompt(e.target.value)}
                placeholder="Describe the image you want to generate..."
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleGenerateImages()}
              />
              <Button
                onClick={handleGenerateImages}
                disabled={isGenerating || !geminiPrompt.trim()}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Images"
                )}
              </Button>
            </div>

            {isGenerating ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-emerald-500" />
              </div>
            ) : generatedImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 bg-white dark:bg-transparent">
                {generatedImages.map((image) => (
                  <div
                    key={image.id}
                    className={`relative aspect-square overflow-hidden rounded-md border-2 cursor-pointer transition-all ${
                      selectedGeminiImage === image.url
                        ? "border-emerald-500 shadow-lg"
                        : "border-gray-300 dark:border-gray-700 hover:border-gray-500 dark:hover:border-gray-500"
                    }`}
                    onClick={() => setSelectedGeminiImage(image.url)}
                  >
                    <img
                      src={image.url || "/placeholder.svg"}
                      alt={`Generated image ${image.id}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <ImageIcon className="h-12 w-12 mb-4 opacity-50" />
                <p>Enter a prompt and click Generate to create images with Gemini</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleInsert}
            disabled={
              isInserting ||
              (activeTab === "pexels" && !selectedPexelsImage) ||
              (activeTab === "gemini" && !selectedGeminiImage)
            }
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isInserting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Replacing...
              </>
            ) : (
              "Replace Image"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { UnsplashImagePicker } from "./unsplash-image-picker"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Loader2 } from "lucide-react"

interface UnsplashModalProps {
  isOpen: boolean
  onClose: () => void
  onImageSelect: (imageDataUri: string, unsplashId?: string) => void
  defaultQuery?: string
  placeholderId?: string
}

export function UnsplashModal({ isOpen, onClose, onImageSelect, defaultQuery, placeholderId }: UnsplashModalProps) {
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null)
  const [selectedUnsplashId, setSelectedUnsplashId] = useState<string | null>(null)
  const [isInserting, setIsInserting] = useState(false)

  const handleImageSelect = (imageDataUri: string, unsplashId?: string) => {
    setSelectedImageUri(imageDataUri)
    setSelectedUnsplashId(unsplashId || null)
  }

  const handleInsert = () => {
    if (!selectedImageUri) return

    setIsInserting(true)
    try {
      onImageSelect(selectedImageUri, selectedUnsplashId || undefined)
      // Reset state after successful insertion
      setSelectedImageUri(null)
      setSelectedUnsplashId(null)
      onClose()
    } catch (error) {
      console.error("Error inserting image:", error)
    } finally {
      setIsInserting(false)
    }
  }

  const handleClose = () => {
    setSelectedImageUri(null)
    setSelectedUnsplashId(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select an image from Unsplash</DialogTitle>
          <DialogDescription>Search for high-quality, royalty-free images to use in your website.</DialogDescription>
        </DialogHeader>

        <UnsplashImagePicker
          onImageSelect={handleImageSelect}
          defaultQuery={defaultQuery}
          placeholderId={placeholderId}
          selectedImageUrl={selectedImageUri}
        />

        <DialogFooter className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleInsert}
            disabled={!selectedImageUri || isInserting}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isInserting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Inserting...
              </>
            ) : (
              "Insert Image"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

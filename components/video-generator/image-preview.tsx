import { Loader2, ImageIcon } from "lucide-react"
import Image from "next/image"
import type { AspectRatio } from "./types"

interface ImagePreviewProps {
  imageUrl: string | null
  aspectRatio: AspectRatio
  isLoading: boolean
  isEmpty: boolean
}

export function ImagePreview({ imageUrl, aspectRatio, isLoading, isEmpty }: ImagePreviewProps) {
  const aspectRatioPadding = {
    "16:9": "56.25%", // (9 / 16) * 100
    "1:1": "100%", // (1 / 1) * 100
    "9:16": "177.78%", // (16 / 9) * 100
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
      <div className="relative w-full" style={{ paddingTop: aspectRatioPadding[aspectRatio] }}>
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Generating...</span>
          </div>
        ) : isEmpty ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
            <span className="mt-2 text-sm text-muted-foreground">Image preview will appear here</span>
          </div>
        ) : (
          imageUrl && (
            <div className="absolute inset-0">
              <Image
                src={imageUrl || "/placeholder.svg"}
                alt="Generated preview"
                fill
                objectFit="contain"
                className="pointer-events-none"
                unoptimized
              />
            </div>
          )
        )}
      </div>
    </div>
  )
}

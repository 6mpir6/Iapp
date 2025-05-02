"use client"

import { useState, useEffect } from "react"
import { searchBingImages, bingImageToDataUri } from "@/actions/bing-image-search"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Search, ImageIcon } from "lucide-react"

interface BingImagePickerProps {
  onImageSelect: (imageDataUri: string, bingId?: string) => void
  defaultQuery?: string
  selectedImageUrl?: string | null
}

export function BingImagePicker({ onImageSelect, defaultQuery = "", selectedImageUrl }: BingImagePickerProps) {
  const [query, setQuery] = useState(defaultQuery)
  const [images, setImages] = useState<
    Array<{
      id: string
      url: string
      thumbnailUrl: string
      name: string
    }>
  >([])
  const [loading, setLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [processingImage, setProcessingImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  // Search for images when the query changes
  const handleSearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setPage(0)

    try {
      const response = await searchBingImages({
        query,
        count: 12,
        offset: 0,
        mkt: "en-US",
        safeSearch: "Moderate",
      })

      setImages(
        response.images.map((img) => ({
          id: img.id,
          url: img.contentUrl,
          thumbnailUrl: img.thumbnailUrl,
          name: img.name,
        })),
      )

      setHasMore(response.images.length < response.totalEstimatedMatches)
    } catch (err) {
      setError("Failed to search for images. Please try again.")
      console.error("Search error:", err)
    } finally {
      setLoading(false)
    }
  }

  // Load more images
  const handleLoadMore = async () => {
    if (loading) return

    setLoading(true)
    try {
      const response = await searchBingImages({
        query,
        count: 12,
        offset: (page + 1) * 12,
        mkt: "en-US",
        safeSearch: "Moderate",
      })

      setImages((prev) => [
        ...prev,
        ...response.images.map((img) => ({
          id: img.id,
          url: img.contentUrl,
          thumbnailUrl: img.thumbnailUrl,
          name: img.name,
        })),
      ])

      setPage(page + 1)
      setHasMore(response.images.length < response.totalEstimatedMatches)
    } catch (err) {
      setError("Failed to load more images. Please try again.")
      console.error("Load more error:", err)
    } finally {
      setLoading(false)
    }
  }

  // Get initial images on load if defaultQuery is provided
  useEffect(() => {
    if (defaultQuery) {
      setQuery(defaultQuery)
      handleSearch()
    }
  }, [defaultQuery])

  // Handle selecting an image
  const handleSelectImage = async (image: { id: string; url: string; name: string }) => {
    setSelectedImage(image.url)
    setProcessingImage(image.id)

    try {
      const dataUri = await bingImageToDataUri(image.url)
      onImageSelect(dataUri, image.id)
      setProcessingImage(null)
    } catch (err) {
      setError("Failed to process the selected image. Please try another one.")
      console.error("Error processing image:", err)
      setProcessingImage(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Search for images (e.g., nature, office, coffee)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={loading || !query.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
          Search
        </Button>
      </div>

      {error && <div className="p-4 bg-red-900/20 border border-red-800 text-red-400 rounded-md">{error}</div>}

      {loading && images.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <ImageIcon className="h-12 w-12 mb-4 opacity-50" />
          <p>No images found. Try a different search term.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className={`relative aspect-square overflow-hidden rounded-md border-2 cursor-pointer transition-all ${
                  selectedImageUrl === image.url || selectedImage === image.url
                    ? "border-emerald-500 shadow-lg"
                    : "border-gray-700 hover:border-gray-500"
                }`}
                onClick={() => handleSelectImage(image)}
              >
                <img
                  src={image.thumbnailUrl || "/placeholder.svg"}
                  alt={image.name || "Bing image"}
                  className="w-full h-full object-cover"
                />
                {processingImage === image.id && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-xs text-white truncate">
                  {image.name}
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-4">
              <Button onClick={handleLoadMore} disabled={loading} variant="outline">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
          )}
        </>
      )}

      <div className="text-xs text-gray-400 text-center mt-2">
        Images provided by{" "}
        <a
          href="https://www.bing.com/images"
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:underline"
        >
          Bing Image Search
        </a>
      </div>
    </div>
  )
}

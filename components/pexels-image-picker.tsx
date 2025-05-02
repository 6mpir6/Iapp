"use client"

import { useState, useEffect } from "react"
import { searchPexelsPhotos, pexelsPhotoToDataUri, type PexelsPhoto } from "@/actions/pexels-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Search, ImageIcon } from "lucide-react"

interface PexelsImagePickerProps {
  onImageSelect: (imageDataUri: string, pexelsId?: string) => void
  defaultQuery?: string
  placeholderId?: string
  selectedImageUrl?: string | null
}

export function PexelsImagePicker({
  onImageSelect,
  defaultQuery = "",
  placeholderId,
  selectedImageUrl,
}: PexelsImagePickerProps) {
  const [query, setQuery] = useState(defaultQuery)
  const [photos, setPhotos] = useState<PexelsPhoto[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<PexelsPhoto | null>(null)
  const [processingPhoto, setProcessingPhoto] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  // Search for photos when the query changes
  const handleSearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setPage(1)

    try {
      const response = await searchPexelsPhotos(query, 1, 15)
      setPhotos(response.photos)
      setHasMore(response.total_results > response.photos.length)
    } catch (err) {
      setError("Failed to search for photos. Please try again.")
      console.error("Search error:", err)
    } finally {
      setLoading(false)
    }
  }

  // Load more photos
  const handleLoadMore = async () => {
    if (loading) return

    setLoading(true)
    try {
      const nextPage = page + 1
      const response = await searchPexelsPhotos(query, nextPage, 15)
      setPhotos((prev) => [...prev, ...response.photos])
      setPage(nextPage)
      setHasMore(response.total_results > photos.length + response.photos.length)
    } catch (err) {
      setError("Failed to load more photos. Please try again.")
      console.error("Load more error:", err)
    } finally {
      setLoading(false)
    }
  }

  // Get random photos on initial load if defaultQuery is provided
  useEffect(() => {
    if (defaultQuery) {
      setQuery(defaultQuery)
      handleSearch()
    }
  }, [defaultQuery])

  // Handle selecting a photo
  const handleSelectPhoto = async (photo: PexelsPhoto) => {
    setSelectedPhoto(photo)
    setProcessingPhoto(photo.id)

    try {
      const dataUri = await pexelsPhotoToDataUri(photo)
      onImageSelect(dataUri, photo.id)
      setProcessingPhoto(null)
    } catch (err) {
      setError("Failed to process the selected image. Please try another one.")
      console.error("Error processing photo:", err)
      setProcessingPhoto(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Search for photos (e.g., nature, office, coffee)"
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

      {loading && photos.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <ImageIcon className="h-12 w-12 mb-4 opacity-50" />
          <p>No photos found. Try a different search term.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className={`relative aspect-square overflow-hidden rounded-md border-2 cursor-pointer transition-all ${
                  selectedImageUrl === photo.src.medium || selectedPhoto?.id === photo.id
                    ? "border-emerald-500 shadow-lg"
                    : "border-gray-700 hover:border-gray-500"
                }`}
                onClick={() => handleSelectPhoto(photo)}
              >
                <img
                  src={photo.src.medium || "/placeholder.svg"}
                  alt={photo.alt || "Pexels photo"}
                  className="w-full h-full object-cover"
                />
                {processingPhoto === photo.id && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-xs text-white truncate">
                  Photo by {photo.photographer}
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
        Photos provided by{" "}
        <a
          href="https://www.pexels.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:underline"
        >
          Pexels
        </a>
      </div>
    </div>
  )
}

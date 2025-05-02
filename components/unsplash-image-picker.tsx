"use client"

import { useState, useEffect } from "react"
import {
  searchUnsplashPhotos,
  getRandomUnsplashPhoto,
  unsplashPhotoToDataUri,
  type UnsplashPhoto,
} from "@/actions/unsplash-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Search, ImageIcon } from "lucide-react"

interface UnsplashImagePickerProps {
  onImageSelect: (imageDataUri: string, unsplashId?: string) => void
  defaultQuery?: string
  placeholderId?: string
  selectedImageUrl?: string | null
}

export function UnsplashImagePicker({
  onImageSelect,
  defaultQuery = "",
  placeholderId,
  selectedImageUrl,
}: UnsplashImagePickerProps) {
  const [query, setQuery] = useState(defaultQuery)
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<UnsplashPhoto | null>(null)
  const [processingPhoto, setProcessingPhoto] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Search for photos when the query changes
  const handleSearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await searchUnsplashPhotos(query, 1, 12)
      setPhotos(response.results)
    } catch (err) {
      setError("Failed to search for photos. Please try again.")
      console.error("Search error:", err)
    } finally {
      setLoading(false)
    }
  }

  // Get random photos on initial load if defaultQuery is provided
  useEffect(() => {
    if (defaultQuery) {
      const loadRandomPhotos = async () => {
        setLoading(true)
        try {
          const randomPhotos = await getRandomUnsplashPhoto(defaultQuery, 6)
          setPhotos(randomPhotos)
        } catch (err) {
          console.error("Error loading random photos:", err)
        } finally {
          setLoading(false)
        }
      }

      loadRandomPhotos()
    }
  }, [defaultQuery])

  // Handle selecting a photo
  const handleSelectPhoto = (photo: UnsplashPhoto) => {
    setSelectedPhoto(photo)
    setProcessingPhoto(photo.id)

    unsplashPhotoToDataUri(photo)
      .then((dataUri) => {
        onImageSelect(dataUri, photo.id) // Pass the photo ID
        setProcessingPhoto(null)
      })
      .catch((err) => {
        setError("Failed to process the selected image. Please try another one.")
        console.error("Error processing photo:", err)
        setProcessingPhoto(null)
      })
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

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <ImageIcon className="h-12 w-12 mb-4 opacity-50" />
          <p>No photos found. Try a different search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className={`relative aspect-square overflow-hidden rounded-md border-2 cursor-pointer transition-all ${
                selectedImageUrl === photo.urls.small
                  ? "border-emerald-500 shadow-lg"
                  : "border-gray-700 hover:border-gray-500"
              }`}
              onClick={() => handleSelectPhoto(photo)}
            >
              <img
                src={photo.urls.small || "/placeholder.svg"}
                alt={photo.alt_description || "Unsplash photo"}
                className="w-full h-full object-cover"
              />
              {processingPhoto === photo.id && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-xs text-white truncate">
                Photo by {photo.user.name}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-gray-400 text-center mt-2">
        Photos provided by{" "}
        <a
          href="https://unsplash.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:underline"
        >
          Unsplash
        </a>
      </div>
    </div>
  )
}

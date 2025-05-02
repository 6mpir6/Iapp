"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button" // Assuming shadcn/ui
import { Textarea } from "@/components/ui/textarea" // Assuming shadcn/ui
import { editImage } from "@/actions/generate-images" // Keep for Gemini Edit (needs update later maybe)
import { remixIdeogramImage } from "@/actions/ideogram-api"
import { generateGeminiImage } from "@/actions/gemini-api" // <--- Import the new Gemini action
import { analyzeImages } from "@/actions/analyze-images" // Assuming this exists and works
import { generateStabilityVideo, checkVideoGenerationStatus } from "@/actions/stability-video-api" // Import the updated API
import { Loader2, Download, RefreshCw, ImageIcon, Wand2, Sparkles, X, Lightbulb, Zap, Film } from "lucide-react"

// --- Constants ---

const styleOptions = [
  // ... (keep if Advanced Edit (Ideogram) is used)
  { id: "AUTO", name: "Auto" },
  { id: "REALISTIC", name: "Realistic" },
  { id: "GENERAL", name: "General" },
  { id: "ANIME", name: "Anime" },
  { id: "DESIGN", name: "Design" },
  { id: "RENDER_3D", name: "3D Render" },
]

const aspectRatioOptions = [
  // ... (keep if Advanced Edit (Ideogram) is used)
  { id: "ASPECT_1_1", name: "Square (1:1)" },
  { id: "ASPECT_16_9", name: "Landscape (16:9)" },
  { id: "ASPECT_9_16", name: "Portrait (9:16)" },
  { id: "ASPECT_4_3", name: "Standard (4:3)" },
  { id: "ASPECT_3_4", name: "Portrait (3:4)" },
]

const MAX_UPLOAD_IMAGES = 4
const VIDEO_POLL_INTERVAL_MS = 10000 // 10 seconds

// --- Component ---

export function ImageGenerator() {
  // --- State Variables ---
  const [images, setImages] = useState<string[]>([]) // Stores image URLs (data: or http:)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false) // For image generation/editing/upload processing
  const [isAnalyzing, setIsAnalyzing] = useState(false) // For image analysis
  const [error, setError] = useState<string | null>(null) // General operational errors
  const [mode, setMode] = useState<"generate" | "edit">("generate")
  const [useAdvancedEdit, setUseAdvancedEdit] = useState(false) // Ideogram vs Gemini edit

  // Video Generation State
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoGenerationId, setVideoGenerationId] = useState<string | null>(null) // Internal tracking ID from our API
  const videoPollingRef = useRef<NodeJS.Timeout | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null) // Video-specific errors

  // Analysis State
  const [imageAnalysis, setImageAnalysis] = useState<string | null>(null)
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([])

  // Prompt State
  const [generatePrompt, setGeneratePrompt] = useState("")
  const [editPrompt, setEditPrompt] = useState("")

  // --- State specific to Ideogram Advanced Edit ---
  const [imageWeight, setImageWeight] = useState(50)
  const [selectedStyle, setSelectedStyle] = useState<string>("REALISTIC")
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>("ASPECT_1_1")
  // --- No need for style/aspect ratio state for Gemini *generation* ---

  // --- Effects ---

  // Reset edit prompt when switching back to generate mode
  useEffect(() => {
    if (mode === "generate") {
      setEditPrompt("")
    }
  }, [mode])

  // Clean up polling interval on unmount or if video generation stops unexpectedly
  useEffect(() => {
    return () => {
      clearPolling() // Use the helper function
    }
  }, []) // Empty dependency array ensures this runs only on unmount

  // --- Derived State ---
  const currentImage = images.length > 0 ? images[selectedImageIndex] : null

  // --- Helper Functions ---

  // Reads a File object and returns a Promise resolving with a Data URL string
  const readFileAsDataURL = (file: File): Promise<string> => {
    // ... (keep existing implementation)
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        return reject(new Error(`Invalid file type: ${file.type}. Please upload images.`))
      }
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result)
        } else {
          reject(new Error("Failed to read file as data URL."))
        }
      }
      reader.onerror = (error) => {
        console.error("FileReader error:", error)
        reject(new Error("Failed to read file."))
      }
      reader.readAsDataURL(file)
    })
  }

  // --- Core Action Handlers ---

  // Handles file input changes, validates files, and updates state
  const handleFilesSelected = async (selectedFiles: FileList | null) => {
    // ... (keep existing implementation)
    if (!selectedFiles || selectedFiles.length === 0) return

    handleResetPartial()
    setIsLoading(true)

    const files = Array.from(selectedFiles).slice(0, MAX_UPLOAD_IMAGES)
    const imagePromises: Promise<string>[] = []
    const validFiles: File[] = []

    for (const file of files) {
      if (file.type.startsWith("image/")) {
        imagePromises.push(readFileAsDataURL(file))
        validFiles.push(file)
      } else {
        console.warn(`Skipping non-image file: ${file.name} (${file.type})`)
      }
    }

    if (imagePromises.length === 0) {
      setError(
        `No valid image files were selected. Please upload JPEG, PNG, or WEBP files (up to ${MAX_UPLOAD_IMAGES}).`,
      )
      setIsLoading(false)
      setMode("generate")
      return
    }

    try {
      const newImages = await Promise.all(imagePromises)
      setImages(newImages)
      setSelectedImageIndex(0)
      setMode("edit")

      if (newImages.length > 1) {
        analyzeUploadedImages(newImages)
      }
    } catch (error) {
      console.error("Error processing uploaded files:", error)
      setError(error instanceof Error ? error.message : "Failed to process the uploaded images.")
      setMode("generate")
      setImages([])
    } finally {
      setIsLoading(false)
    }
  }

  // Analyzes provided images using the backend action
  const analyzeUploadedImages = async (imagesToAnalyze: string[] = images) => {
    // ... (keep existing implementation)
    if (imagesToAnalyze.length === 0 || isAnalyzing) return

    setIsAnalyzing(true)
    setError(null)
    setImageAnalysis(null)
    setSuggestedPrompts([])

    try {
      const result = await analyzeImages({ images: imagesToAnalyze })
      if (result.error) {
        throw new Error(result.error)
      }
      setImageAnalysis(result.analysis)
      setSuggestedPrompts(result.suggestedPrompts)
    } catch (error) {
      console.error("Error analyzing images:", error)
      setError(error instanceof Error ? error.message : "An unknown error occurred during image analysis.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  // --- Updated to use Gemini ---
  const handleGenerateImage = async () => {
    if (!generatePrompt.trim() || isLoading || isGeneratingVideo) return

    handleResetPartial()
    setIsLoading(true)
    setError(null) // Clear previous errors specifically

    try {
      console.log("Calling Gemini action with prompt:", generatePrompt)
      // Call the new server action
      const result = await generateGeminiImage({
        prompt: generatePrompt,
        // No need to pass style/aspect ratio here for Gemini
      })

      console.log("Gemini action result:", result)

      if (result.error) {
        throw new Error(result.error)
      }

      if (!result.imageUrl) {
        throw new Error("Image generation succeeded but no image URL was returned.")
      }

      // Gemini returns a Data URL (base64 encoded image)
      setImages([result.imageUrl])
      setSelectedImageIndex(0)
      setMode("edit") // Switch to edit mode
      // Optionally display result.textResponse somewhere if needed
      if (result.textResponse) {
        console.log("Gemini Text Response:", result.textResponse)
        // You could store this in state if you want to display it
      }
    } catch (error) {
      console.error("Error generating image with Gemini:", error)
      setError(error instanceof Error ? error.message : "Unknown error generating image.")
      setMode("generate") // Stay in generate mode on error
      setImages([]) // Clear any potential partial results
    } finally {
      setIsLoading(false)
    }
  }

  // --- Edit Image Handler (Keep existing logic, Gemini vs Ideogram choice) ---
  const handleEditImage = async () => {
    if (!currentImage || !editPrompt.trim() || isLoading || isGeneratingVideo) return

    setIsLoading(true)
    setError(null)
    setVideoUrl(null)
    setVideoError(null)

    try {
      let resultUrl: string
      const originalImageIndex = selectedImageIndex

      if (useAdvancedEdit) {
        // --- Ideogram Remix (Keep this as is) ---
        console.log("Using Advanced Edit (Ideogram Remix)")
        resultUrl = await remixIdeogramImage({
          prompt: editPrompt,
          imageFile: currentImage,
          aspectRatio: selectedAspectRatio, // Use state for Ideogram Remix
          imageWeight, // Use state for Ideogram Remix
          styleType: selectedStyle, // Use state for Ideogram Remix
        })
        if (!resultUrl || typeof resultUrl !== "string" || resultUrl.toLowerCase().startsWith("error")) {
          throw new Error(resultUrl || "Failed to edit image with Advanced Edit. Check parameters or try again.")
        }
      } else {
        // --- Standard Edit (using existing `editImage` action) ---
        // NOTE: You might want to eventually replace `editImage` with a Gemini-based
        // image *editing* action if the Gemini API supports that well (e.g., using image+text input).
        // For now, we keep the existing `editImage` action.
        console.log("Using Standard Edit (current editImage action)")
        const isDataUrl = currentImage.startsWith("data:image/")
        const isPlaceholder = currentImage.startsWith("/placeholder.svg")

        if (isPlaceholder) {
          throw new Error("Cannot edit a placeholder image. Please upload or generate a real image first.")
        }

        const result = await editImage({
          imageUrl: currentImage,
          prompt: editPrompt,
          isExternalUrl: !isDataUrl,
        })

        if (!result || !result.url || result.url.toLowerCase().startsWith("error")) {
          throw new Error(result?.url || "Failed to edit image. Please try a different prompt.")
        }
        resultUrl = result.url
      }

      // Update state
      setImages((prevImages) => {
        const newImages = [...prevImages]
        if (originalImageIndex < newImages.length) {
          newImages[originalImageIndex] = resultUrl
        } else {
          console.warn("Selected image index became invalid during edit operation.")
        }
        return newImages
      })

      setEditPrompt("")
      setImageAnalysis(null)
      setSuggestedPrompts([])
    } catch (error) {
      console.error("Error editing image:", error)
      setError(error instanceof Error ? error.message : "Unknown error occurred while editing image.")
    } finally {
      setIsLoading(false)
    }
  }

  // Initiates video generation for the current image using Stability AI backend
  const handleCreateVideo = async () => {
    // ... (keep existing implementation)
    if (!currentImage || isLoading || isGeneratingVideo) return

    setIsGeneratingVideo(true)
    setVideoError(null)
    setError(null)
    setVideoUrl(null)
    setVideoGenerationId(null)

    clearPolling() // Clear before starting

    console.log("Initiating video generation for image...")

    try {
      const result = await generateStabilityVideo({
        image: currentImage,
      })

      if (result.status === "failed" || !result.id) {
        throw new Error(
          result.error || "Failed to start video generation. Server might be unavailable or check API key.",
        )
      }
      setVideoGenerationId(result.id)
      console.log(`Video generation started. Tracking ID: ${result.id}`)
      startPolling(result.id)
    } catch (initError) {
      console.error("Error initiating video creation:", initError)
      const errorMsg = initError instanceof Error ? initError.message : "Unknown error starting video creation."
      setVideoError(errorMsg)
      setIsGeneratingVideo(false)
      setVideoGenerationId(null)
      clearPolling()
    }
  }

  // --- Polling Logic ---

  // Starts the polling process for a given internal tracking ID
  const startPolling = (id: string) => {
    // ... (keep existing implementation)
    clearPolling() // Ensure no duplicate intervals

    const poll = async () => {
      if (videoGenerationId !== id || !isGeneratingVideo) {
        console.log(`Polling stopped or ID changed (${id}). Clearing interval.`)
        clearPolling()
        return
      }

      try {
        console.log(`Polling status for video ID: ${id}`)
        const statusResult = await checkVideoGenerationStatus(id)

        if (videoGenerationId !== id || !isGeneratingVideo) {
          console.log(`Polling result ignored as state changed during fetch for ${id}.`)
          clearPolling()
          return
        }

        if (statusResult.status === "completed" && statusResult.videoUrl) {
          console.log(`Video generation completed for ID: ${id}`)
          setVideoUrl(statusResult.videoUrl)
          setIsGeneratingVideo(false)
          setVideoGenerationId(null)
          setVideoError(null)
          clearPolling()
        } else if (statusResult.status === "failed") {
          console.error(`Video generation failed for ID: ${id}. Error: ${statusResult.error}`)
          setVideoError(statusResult.error || "Video generation failed on the server.")
          setIsGeneratingVideo(false)
          setVideoGenerationId(null)
          clearPolling()
        } else if (statusResult.status === "pending") {
          console.log(`Video generation pending for ID: ${id}. Continuing poll.`)
        } else {
          console.error(`Unexpected status for ID ${id}: ${statusResult.status}`)
          setVideoError(`Unexpected status received: ${statusResult.status ?? "Unknown"}`)
          setIsGeneratingVideo(false)
          setVideoGenerationId(null)
          clearPolling()
        }
      } catch (pollError) {
        console.error(`Error during polling check for video status (ID: ${id}):`, pollError)
        setVideoError(pollError instanceof Error ? pollError.message : "Error checking video status.")
        setIsGeneratingVideo(false)
        setVideoGenerationId(null)
        clearPolling()
      }
    }

    setTimeout(() => poll(), 2000) // Initial check
    videoPollingRef.current = setInterval(poll, VIDEO_POLL_INTERVAL_MS)
  }

  // Helper to clear the polling interval and ref
  const clearPolling = () => {
    // ... (keep existing implementation)
    if (videoPollingRef.current) {
      clearInterval(videoPollingRef.current)
      videoPollingRef.current = null
      console.log("Polling interval cleared.")
    }
  }

  // --- UI Interaction Handlers ---

  // Applies a suggested prompt to the appropriate input field
  const applySuggestedPrompt = (prompt: string) => {
    /* ... keep ... */
    if (mode === "edit") {
      setEditPrompt(prompt)
    } else {
      setGeneratePrompt(prompt)
    }
    const inputId = mode === "edit" ? "edit-prompt" : "generate-prompt"
    document.getElementById(inputId)?.focus()
  }

  // Removes an image from the `images` state array
  const removeImage = (indexToRemove: number) => {
    /* ... keep ... */
    setImages((prevImages) => prevImages.filter((_, i) => i !== indexToRemove))

    if (selectedImageIndex === indexToRemove) {
      setSelectedImageIndex((prevIdx) => Math.max(0, prevIdx - 1))
    } else if (selectedImageIndex > indexToRemove) {
      setSelectedImageIndex((prevIdx) => prevIdx - 1)
    }

    if (images.length === 1) {
      handleReset()
    } else {
      if (images.length === 2) {
        setImageAnalysis(null)
        setSuggestedPrompts([])
      }
    }
  }

  // Resets *most* state, suitable for clearing results but keeping prompts/options
  const handleResetPartial = () => {
    /* ... keep ... */
    setImages([])
    setSelectedImageIndex(0)
    setError(null)
    setVideoError(null)
    setImageAnalysis(null)
    setSuggestedPrompts([])
    setVideoUrl(null)
    setVideoGenerationId(null)
    setIsLoading(false)
    setIsAnalyzing(false)
    setIsGeneratingVideo(false)
    clearPolling()
  }

  // Resets the entire component state to initial values
  const handleReset = () => {
    /* ... keep ... */
    handleResetPartial()
    setGeneratePrompt("")
    setEditPrompt("")
    setMode("generate")
    setUseAdvancedEdit(false)
    // Reset Ideogram options if needed, keep defaults
    setSelectedStyle("REALISTIC")
    setSelectedAspectRatio("ASPECT_1_1")
    setImageWeight(50)
    console.log("Component state reset.")
  }

  // Triggers download for an image URL or Data URI
  const downloadImage = (imageUrl: string | null) => {
    /* ... keep ... */
    if (!imageUrl) return
    try {
      const link = document.createElement("a")
      link.href = imageUrl
      let extension = "png" // Default to PNG for Data URLs unless specified
      if (imageUrl.startsWith("data:image/jpeg")) extension = "jpg"
      else if (imageUrl.startsWith("data:image/webp")) extension = "webp"
      else if (imageUrl.startsWith("data:image/png")) extension = "png"
      else {
        // Fallback for http URLs
        const match = imageUrl.match(/\.(jpe?g|png|webp|gif)(?=\?|$)/i)
        if (match) extension = match[1]
      }
      link.download = `ai-image-${Date.now()}.${extension}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      console.error("Download failed:", e)
      setError("Could not initiate download.")
    }
  }

  // Triggers download for the generated video Data URI
  const downloadVideo = () => {
    /* ... keep ... */
    if (!videoUrl) return
    try {
      const link = document.createElement("a")
      link.href = videoUrl
      link.download = `ai-video-${Date.now()}.mp4`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      console.error("Video download failed:", e)
      setVideoError("Could not initiate video download.")
    }
  }

  // --- Rendering Logic ---

  // Renders the image preview area (loading, placeholder, single image, grid)
  const renderImageGrid = () => {
    // ... (keep existing implementation, it handles Data URLs fine)
    // Image Loading State
    if (isLoading && !isGeneratingVideo && mode === "generate") {
      // Show generation loading
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Generating Image with Gemini...</p>
        </div>
      )
    }
    // General processing/upload loading
    if (isLoading && !isGeneratingVideo && mode !== "generate") {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Processing...</p>
        </div>
      )
    }

    // No Images State
    if (images.length === 0) {
      if (!isGeneratingVideo && !videoUrl) {
        return (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400 text-center p-4">
            <ImageIcon className="h-16 w-16 mb-4 opacity-20" />
            <p>Describe the image you want to generate</p>
            <p className="text-sm mt-1">or upload an image to edit/animate</p>
          </div>
        )
      }
      return null
    }

    // Single Image Display
    if (images.length === 1) {
      // ... (keep single image display logic)
      return (
        <div className="relative group w-full max-w-lg mx-auto">
          <img
            src={images[0] || "/placeholder.svg"}
            alt="Generated or uploaded image"
            className="max-w-full max-h-[450px] object-contain rounded-lg mx-auto shadow-md border border-gray-200 dark:border-gray-700"
          />
          <button
            onClick={() => removeImage(0)}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 hover:bg-black/80 z-10"
            title="Remove image"
            aria-label="Remove image"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )
    }

    // Multiple Images Grid
    // ... (keep multi-image display logic)
    const gridCols = images.length === 2 ? "grid-cols-2" : "grid-cols-2"
    const imgHeight = images.length <= 2 ? "h-[300px]" : "h-[200px]"
    return (
      <div className={`grid ${gridCols} gap-3 w-full max-w-2xl mx-auto`}>
        {images.map((image, index) => (
          <div
            key={index}
            className={`relative group cursor-pointer rounded-md overflow-hidden transition-all duration-200 ease-in-out ${selectedImageIndex === index ? "ring-2 ring-offset-2 ring-emerald-500 dark:ring-offset-gray-900" : "ring-1 ring-gray-300 dark:ring-gray-700 hover:ring-emerald-400"}`}
            onClick={() => setSelectedImageIndex(index)}
            role="button"
            aria-label={`Select image ${index + 1}`}
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setSelectedImageIndex(index)}
          >
            <img
              src={image || "/placeholder.svg"}
              alt={`Image ${index + 1}`}
              className={`w-full ${imgHeight} object-contain bg-gray-200 dark:bg-gray-700`}
              loading="lazy"
            />
            <button
              onClick={(e) => {
                e.stopPropagation()
                removeImage(index)
              }}
              className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 hover:bg-black/80 z-10"
              title="Remove image"
              aria-label={`Remove image ${index + 1}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    )
  }

  // --- Main Component Return JSX ---
  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <header className="text-center">
        {/* ... keep header ... */}
        <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-gray-900 dark:text-white">AI Image & Video Tool</h1>
        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">
          Generate (Gemini), edit, and animate images with AI.
        </p>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-col gap-8">
        {/* Top Section: Preview & Controls */}
        <section
          aria-labelledby="preview-heading"
          className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 flex flex-col items-center justify-center min-h-[500px] shadow-sm"
        >
          {/* ... (keep preview section structure, renderImageGrid handles display) ... */}
          <h2 id="preview-heading" className="sr-only">
            Image and Video Preview
          </h2>

          <div className="w-full flex justify-center items-center flex-grow mb-4 min-h-[300px]">
            {renderImageGrid()}
          </div>

          {/* Action Buttons */}
          {images.length > 0 && !isLoading && (
            <div className="flex flex-wrap gap-3 mt-4 justify-center border-t border-gray-200 dark:border-gray-700 pt-4 w-full max-w-3xl">
              {/* ... keep Download, Analyze, Create Video buttons ... */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadImage(currentImage)}
                disabled={isGeneratingVideo || !currentImage}
                title={
                  currentImage
                    ? `Download selected image ${images.length > 1 ? `(${selectedImageIndex + 1}/${images.length})` : ""}`
                    : "No image selected"
                }
              >
                <Download className="h-4 w-4 mr-2" />
                Download {images.length > 1 ? `(${selectedImageIndex + 1}/${images.length})` : "Image"}
              </Button>

              {images.length > 1 && !imageAnalysis && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => analyzeUploadedImages()}
                  disabled={isAnalyzing || isGeneratingVideo}
                  title="Analyze images to get description and prompt ideas"
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Lightbulb className="h-4 w-4 mr-2" />
                  )}
                  Analyze Images
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={handleCreateVideo}
                disabled={isGeneratingVideo || isLoading || !currentImage}
                title={currentImage ? "Generate a short video from the selected image" : "Select an image first"}
              >
                {isGeneratingVideo ? (
                  <>
                    {" "}
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating...{" "}
                  </>
                ) : (
                  <>
                    {" "}
                    <Film className="h-4 w-4 mr-2" /> Create Video{" "}
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Video Display Area */}
          {videoUrl && !isGeneratingVideo && (
            /* ... keep video display ... */
            <div className="mt-6 w-full max-w-md flex flex-col items-center border-t border-gray-200 dark:border-gray-700 pt-5">
              <p className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Generated Video:</p>
              <video
                key={videoUrl}
                src={videoUrl}
                controls
                preload="metadata"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 shadow-md bg-black"
                onLoadedMetadata={(e) => (e.currentTarget.volume = 0.5)}
              />
              <Button size="sm" variant="outline" className="mt-3" onClick={downloadVideo}>
                <Download className="h-4 w-4 mr-2" />
                Download Video
              </Button>
            </div>
          )}

          {/* Video Loading/Error */}
          {isGeneratingVideo && (
            /* ... keep video loading ... */
            <div className="mt-6 text-base text-gray-600 dark:text-gray-400 flex items-center justify-center border-t border-gray-200 dark:border-gray-700 pt-5 w-full max-w-md">
              <Loader2 className="h-5 w-5 animate-spin mr-3 text-emerald-500" />
              <span>Generating video... (this can take a minute or two)</span>
            </div>
          )}
          {videoError && !isGeneratingVideo && (
            /* ... keep video error ... */
            <div className="mt-6 p-3 bg-red-100 border border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300 rounded-md text-sm w-full max-w-md text-center shadow">
              <span className="font-medium">Video Error:</span> {videoError}
            </div>
          )}
        </section>

        {/* Analysis Results Section */}
        {imageAnalysis && !isLoading && !isGeneratingVideo && (
          /* ... keep analysis section ... */
          <section
            aria-labelledby="analysis-heading"
            className="bg-blue-50 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-800/50 rounded-lg p-4 sm:p-6 shadow-sm"
          >
            {/* ... content ... */}
            <h3
              id="analysis-heading"
              className="text-lg font-semibold mb-3 flex items-center text-blue-800 dark:text-blue-200"
            >
              <Lightbulb className="h-5 w-5 mr-2 text-yellow-400" />
              Image Analysis Results
            </h3>
            <div className="text-sm text-gray-700 dark:text-gray-300 mb-4 max-h-40 overflow-y-auto pretty-scrollbar pr-2 border-b dark:border-blue-800/60 pb-3">
              {imageAnalysis}
            </div>

            {suggestedPrompts.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center text-gray-800 dark:text-gray-200">
                  <Zap className="h-4 w-4 mr-1.5 text-emerald-500" />
                  Suggested Prompts for Editing:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {suggestedPrompts.map((prompt, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => applySuggestedPrompt(prompt)}
                      title={`Apply prompt: "${prompt}"`}
                      className="text-xs bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/50 dark:border-emerald-800/60 dark:text-emerald-300 dark:hover:bg-emerald-800/70"
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Controls Section: Generate / Edit */}
        <section
          aria-labelledby="controls-heading"
          className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-5 sm:p-6 shadow-md space-y-6"
        >
          <h2 id="controls-heading" className="sr-only">
            Image Generation and Editing Controls
          </h2>

          {/* --- Generate Mode UI (Updated for Gemini) --- */}
          {mode === "generate" && (
            <div className="space-y-5">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">1. Generate New Image (Gemini)</h3>
              {/* Prompt Input (same) */}
              <div className="relative">
                {/* ... keep prompt textarea ... */}
                <label
                  htmlFor="generate-prompt"
                  className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
                >
                  Image Description
                </label>
                <Textarea
                  id="generate-prompt"
                  value={generatePrompt}
                  onChange={(e) => setGeneratePrompt(e.target.value)}
                  placeholder="Describe the image you want to create (e.g., 'A photorealistic cat wearing sunglasses', '3D render of a futuristic city'). Be descriptive about style and aspect ratio."
                  className="min-h-28 bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:border-emerald-500 focus:ring-emerald-500 text-base"
                  rows={4}
                  disabled={isLoading || isGeneratingVideo}
                  aria-label="Image description prompt"
                />
                {/* Upload Button (same) */}
                <div className="absolute top-8 right-3">
                  {/* ... keep upload button ... */}
                  <label
                    htmlFor="file-upload-generate"
                    className="cursor-pointer group"
                    title={`Upload up to ${MAX_UPLOAD_IMAGES} image(s) instead`}
                  >
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${isLoading || isGeneratingVideo ? "bg-gray-200 dark:bg-gray-600 cursor-not-allowed" : "bg-gray-100 group-hover:bg-gray-200 dark:bg-gray-600 dark:group-hover:bg-gray-500"}`}
                    >
                      <ImageIcon
                        className={`h-5 w-5 ${isLoading || isGeneratingVideo ? "text-gray-400 dark:text-gray-500" : "text-gray-600 dark:text-gray-300"}`}
                      />
                    </div>
                    <input
                      id="file-upload-generate"
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={(e) => handleFilesSelected(e.target.files)}
                      disabled={isLoading || isGeneratingVideo}
                    />
                  </label>
                </div>
              </div>

              {/* Remove Advanced Generation Options (Style/Aspect Ratio) for Gemini */}
              {/* If Gemini API evolves to accept these, they can be added back */}
              {/* <details> ... </details> */}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Tip: Include details like style (e.g., 'photorealistic', 'anime', 'watercolor') and aspect ratio (e.g.,
                'wide aspect ratio', 'square image') directly in your prompt for Gemini.
              </p>

              {/* Generate Button (same) */}
              <div className="flex justify-end mt-5">
                <Button
                  onClick={handleGenerateImage} // Now calls the Gemini handler
                  disabled={isLoading || isGeneratingVideo || !generatePrompt.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[160px] text-base px-6 py-2.5"
                  size="lg"
                >
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
                  {isLoading ? "Generating..." : "Generate Image"}
                </Button>
              </div>
            </div>
          )}

          {/* --- Edit Mode UI (Largely Unchanged) --- */}
          {mode === "edit" && images.length > 0 && (
            <div className="space-y-5 border-t border-gray-200 dark:border-gray-700 pt-6">
              {/* Edit Header & Reset Button (same) */}
              {/* ... keep edit header ... */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                  2. Edit Image{" "}
                  {images.length > 1 ? (
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                      ({selectedImageIndex + 1} of {images.length})
                    </span>
                  ) : (
                    ""
                  )}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={isLoading || isGeneratingVideo}
                  title="Clear images and start over"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Start Over
                </Button>
              </div>

              {/* Edit Prompt Input (same) */}
              {/* ... keep edit prompt textarea ... */}
              <div className="relative">
                <label
                  htmlFor="edit-prompt"
                  className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
                >
                  Editing Instructions
                </label>
                <Textarea
                  id="edit-prompt"
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="Describe edits (standard edit) or provide a new prompt (advanced edit)..."
                  className="min-h-24 bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-600 focus:border-emerald-500 focus:ring-emerald-500 text-base"
                  rows={3}
                  disabled={isLoading || isGeneratingVideo}
                  aria-label="Image editing instructions"
                />
                {/* Upload Button inside Edit Textarea (same) */}
                <div className="absolute top-8 right-3">
                  {/* ... keep upload button ... */}
                  <label
                    htmlFor="file-upload-edit"
                    className="cursor-pointer group"
                    title={`Upload different image(s) (up to ${MAX_UPLOAD_IMAGES})`}
                  >
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${isLoading || isGeneratingVideo ? "bg-gray-200 dark:bg-gray-600 cursor-not-allowed" : "bg-gray-100 group-hover:bg-gray-200 dark:bg-gray-600 dark:group-hover:bg-gray-500"}`}
                    >
                      <ImageIcon
                        className={`h-5 w-5 ${isLoading || isGeneratingVideo ? "text-gray-400 dark:text-gray-500" : "text-gray-600 dark:text-gray-300"}`}
                      />
                    </div>
                    <input
                      id="file-upload-edit"
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={(e) => handleFilesSelected(e.target.files)}
                      disabled={isLoading || isGeneratingVideo}
                    />
                  </label>
                </div>
              </div>

              {/* Edit Options & Apply Button (same structure, keeps Ideogram advanced option) */}
              {/* ... keep advanced edit toggle and apply button ... */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-3">
                {/* Advanced Edit Toggle */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="advanced-edit"
                    checked={useAdvancedEdit}
                    onChange={(e) => setUseAdvancedEdit(e.target.checked)}
                    disabled={isLoading || isGeneratingVideo}
                    className="h-4 w-4 rounded border-gray-300 bg-white text-emerald-600 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-emerald-600 dark:ring-offset-gray-800 disabled:opacity-50 cursor-pointer"
                  />
                  <label
                    htmlFor="advanced-edit"
                    className={`ml-2 text-sm cursor-pointer select-none ${isLoading || isGeneratingVideo ? "text-gray-400 dark:text-gray-500" : "text-gray-700 dark:text-gray-300"}`}
                  >
                    Use Advanced Edit (Ideogram Remix) {/* Clarify it's Ideogram */}
                  </label>
                </div>
                {/* Apply Edit Button */}
                <Button
                  onClick={handleEditImage}
                  disabled={isLoading || isGeneratingVideo || !editPrompt.trim() || !currentImage}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto min-w-[150px] text-base px-6 py-2.5"
                  size="lg"
                >
                  {isLoading && mode === "edit" ? ( // Show loading only when editing
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-5 w-5" />
                  )}
                  {isLoading && mode === "edit" ? "Applying..." : "Apply Edit"}
                </Button>
              </div>

              {/* Advanced Edit Options Panel (conditional, for Ideogram) */}
              {useAdvancedEdit && (
                /* ... keep Ideogram advanced options panel ... */
                <div className="bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600/50 rounded-lg p-4 space-y-4 mt-4 transition-all animate-in fade-in duration-300">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Advanced Edit Options (Ideogram Remix)
                  </h4>
                  {/* Style Selection */}
                  <div>
                    {/* ... keep style buttons ... */}
                    <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">Style</label>
                    <div className="flex flex-wrap gap-2">
                      {styleOptions.map((style) => (
                        <Button
                          key={style.id}
                          variant={selectedStyle === style.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedStyle(style.id)}
                          disabled={isLoading || isGeneratingVideo}
                          className={`text-xs ${selectedStyle === style.id ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                        >
                          {style.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {/* Image Weight Slider */}
                  <div>
                    {/* ... keep weight slider ... */}
                    <label
                      htmlFor="image-weight"
                      className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400"
                    >
                      Image Influence: <span className="font-semibold">{imageWeight}%</span>
                    </label>
                    <input
                      type="range"
                      id="image-weight"
                      min="0"
                      max="100"
                      step="1"
                      value={imageWeight}
                      onChange={(e) => setImageWeight(Number.parseInt(e.target.value))}
                      disabled={isLoading || isGeneratingVideo}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 accent-emerald-500 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                      aria-label="Image influence weight slider"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Higher value preserves more of the original image structure.
                    </p>
                  </div>
                  {/* Keep Aspect Ratio here for Ideogram Remix */}
                  <div>
                    <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">
                      Aspect Ratio (for Ideogram Remix)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {aspectRatioOptions.map((ratio) => (
                        <Button
                          key={ratio.id}
                          variant={selectedAspectRatio === ratio.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedAspectRatio(ratio.id)}
                          disabled={isLoading || isGeneratingVideo}
                          className={`text-xs ${selectedAspectRatio === ratio.id ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                        >
                          {ratio.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* General Error Display Area (same) */}
          {error && (
            /* ... keep error display ... */
            <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300 rounded-md text-sm shadow">
              <span className="font-medium">Error:</span> {error}
            </div>
          )}
        </section>
      </main>

      {/* Optional Footer */}
      {/* ... */}
    </div> // End Root Container
  )
}

// Optional Global Styles (keep if used)
// <style jsx global>{`...`}</style>

"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { AspectRatioSelector } from "./aspect-ratio-selector"
import { ImagePreview } from "./image-preview"
import { TimelineScene } from "./timeline-scene"
import { VideoPreview } from "./video-preview"
import { ProductShowcaseForm } from "./product-showcase-form"
import { MovieForm } from "./movie-form"
import { ImageEditPanel } from "./image-edit-panel"
import { MaskEditor } from "./mask-editor"
import type { AspectRatio, GenerationMode, Scene, VideoTheme } from "./types"
import { CaptionInput } from "./caption-input"
import { useMobile } from "@/hooks/use-mobile"
import { useImageGeneration } from "./use-image-generation"
import { Progress } from "@/components/ui/progress"
import { Loader2, Upload, Film, ImageIcon, PlusCircle, Volume2, Clapperboard } from "lucide-react"
import { generateCreatomateVideo, getCreatomateRenderStatus } from "@/actions/generate-creatomate-video"
import { generateVeoVideo } from "@/actions/veo-api"
import { stitchVideos, checkStitchingStatus } from "@/actions/stitch-videos"

export default function VideoGenerator() {
  const { isMobile } = useMobile()

  // Image generation state
  const {
    generationMode,
    setGenerationMode,
    prompt,
    setPrompt,
    negativePrompt,
    setNegativePrompt,
    aspectRatio,
    setAspectRatio,
    isGenerating,
    generatedImageUrl,
    startImageGeneration,
    currentCaption,
    setCurrentCaption,
    isCaptionLoading,
    editMode,
    setEditMode,
    editPrompt,
    setEditPrompt,
    handleEditImage,
    isEditing,
    editedImageUrl,
    resetImageState,
    setCaptionLoading,
    setGeneratedImageUrl,
    generateCaption,
  } = useImageGeneration()

  // Timeline scenes state
  const [scenes, setScenes] = useState<Scene[]>([])
  const [draggedSceneId, setDraggedSceneId] = useState<string | null>(null)

  // Video generation state
  const [videoTheme, setVideoTheme] = useState<VideoTheme>("social-reel")
  const [productData, setProductData] = useState({
    productName: "",
    productDescription: "",
    normalPrice: "",
    discountedPrice: "",
    cta: "",
    website: "",
    logoUrl: null as string | null,
  })

  // Movie generation state
  const [movieData, setMovieData] = useState({
    prompt: "",
    numberOfClips: 3,
    clipDuration: 5,
    transitionDuration: 1,
  })

  // Cinematic Real Estate state
  const [cinematicData, setCinematicData] = useState({
    description: "Los Angeles, CA 90045\nCall (123) 555-1234 to arrange a viewing today",
    subtext: "Just Listed",
    brandName: "My Brand Realtors",
    name: "Elisabeth Parker",
    email: "elisabeth@mybrand.com",
    phoneNumber: "(123) 555-1234",
  })

  // Narration state
  const [enableNarration, setEnableNarration] = useState(false)

  // Creatomate API state
  const [renderId, setRenderId] = useState<string | null>(null)
  const [renderStatus, setRenderStatus] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)
  const [polling, setPolling] = useState(false)

  // Veo API state
  const [generatedClips, setGeneratedClips] = useState<string[]>([])

  // File input refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const multipleFileInputRef = useRef<HTMLInputElement>(null)

  // Timeline manipulation functions
  const addSceneToTimeline = useCallback(() => {
    if (!generatedImageUrl && !editedImageUrl) return

    const newScene: Scene = {
      id: `scene-${Date.now()}`,
      imageUrl: editedImageUrl || generatedImageUrl || "",
      caption: currentCaption || undefined,
      aspectRatio,
      isVideo: false, // Default to false
    }

    setScenes((prevScenes) => [...prevScenes, newScene])
    resetImageState()
  }, [generatedImageUrl, editedImageUrl, currentCaption, aspectRatio, resetImageState])

  const removeScene = useCallback((sceneId: string) => {
    setScenes((prevScenes) => prevScenes.filter((scene) => scene.id !== sceneId))
  }, [])

  const updateSceneCaption = useCallback((sceneId: string, caption: string) => {
    setScenes((prevScenes) => prevScenes.map((scene) => (scene.id === sceneId ? { ...scene, caption } : scene)))
  }, [])

  const moveScene = useCallback((sceneId: string, direction: "left" | "right") => {
    setScenes((prevScenes) => {
      const sceneIndex = prevScenes.findIndex((scene) => scene.id === sceneId)
      if (sceneIndex === -1) return prevScenes

      const newIndex = direction === "left" ? sceneIndex - 1 : sceneIndex + 1
      if (newIndex < 0 || newIndex >= prevScenes.length) return prevScenes

      const newScenes = [...prevScenes]
      ;[newScenes[sceneIndex], newScenes[newIndex]] = [newScenes[newIndex], newScenes[sceneIndex]]
      return newScenes
    })
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setScenes((prevScenes) => {
        const oldIndex = prevScenes.findIndex((scene) => scene.id === active.id)
        const newIndex = prevScenes.findIndex((scene) => scene.id === over.id)
        return arrayMove(prevScenes, oldIndex, newIndex)
      })
    }

    setDraggedSceneId(null)
  }, [])

  // File upload handlers
  const handleSingleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      resetImageState()

      const reader = new FileReader()
      reader.onload = async (event) => {
        if (typeof event.target?.result !== "string") return

        const imageDataUrl = event.target.result
        const imageAspectRatio = await getImageAspectRatio(imageDataUrl)
        setAspectRatio(imageAspectRatio || "16:9")

        setGeneratedImageUrl(imageDataUrl)

        // Always generate caption with Gemini
        try {
          setCaptionLoading(true)
          const captionResponse = await generateCaption({
            imageUrl: imageDataUrl,
            style: "social media",
          })

          if (captionResponse.success) {
            setCurrentCaption(captionResponse.caption || "")
          }
        } catch (error) {
          console.error("Error generating caption", error)
        } finally {
          setCaptionLoading(false)
        }
      }

      reader.readAsDataURL(file)

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    },
    [resetImageState, setAspectRatio, setGeneratedImageUrl, setCurrentCaption, setCaptionLoading, generateCaption],
  )

  const handleMultipleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (files.length === 0) return

      // Process each file
      files.forEach((file) => {
        const reader = new FileReader()
        reader.onload = async (event) => {
          if (typeof event.target?.result !== "string") return

          const imageDataUrl = event.target.result
          const imageAspectRatio = await getImageAspectRatio(imageDataUrl)

          // Always generate caption with Gemini
          let caption = ""
          try {
            const captionResponse = await generateCaption({
              imageUrl: imageDataUrl,
              style: "social media",
            })

            if (captionResponse.success) {
              caption = captionResponse.caption || ""
            }
          } catch (error) {
            console.error("Error generating caption", error)
          }

          // Add to timeline
          const newScene: Scene = {
            id: `scene-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            imageUrl: imageDataUrl,
            caption,
            aspectRatio: imageAspectRatio || "16:9",
          }

          setScenes((prevScenes) => [...prevScenes, newScene])
        }

        reader.readAsDataURL(file)
      })

      // Reset file input
      if (multipleFileInputRef.current) {
        multipleFileInputRef.current.value = ""
      }
    },
    [setScenes, generateCaption],
  )

  // Helper function to get aspect ratio from image
  const getImageAspectRatio = async (imageUrl: string): Promise<AspectRatio | null> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const ratio = img.width / img.height
        if (ratio > 1.7) resolve("16:9")
        else if (ratio < 0.6) resolve("9:16")
        else resolve("1:1")
      }
      img.onerror = () => resolve(null)
      img.src = imageUrl
    })
  }

  // Reset video state
  const resetVideoState = useCallback(() => {
    setVideoUrl(null)
    setVideoError(null)
    setVideoProgress(0)
    setIsGeneratingVideo(false)
    setRenderId(null)
    setRenderStatus(null)
    setPolling(false)
    setGeneratedClips([])
  }, [])

  const addVideoToTimeline = useCallback(
    (videoUrl: string, thumbnailUrl: string) => {
      const newScene: Scene = {
        id: `scene-${Date.now()}`,
        imageUrl: thumbnailUrl, // Use the image as thumbnail
        videoUrl: videoUrl, // Store the video URL
        caption: currentCaption || "Video scene",
        aspectRatio,
        isVideo: true,
      }

      setScenes((prevScenes) => [...prevScenes, newScene])
      resetImageState()
    },
    [currentCaption, aspectRatio, resetImageState],
  )

  // Generate video handler - Using our updated generateCreatomateVideo function
  const handleGenerateVideo = useCallback(async () => {
    if (videoTheme === "movie") {
      await handleGenerateMovieVideo()
      return
    }

    if (scenes.length === 0) return

    setIsGeneratingVideo(true)
    setVideoError(null)
    setVideoUrl(null)
    setRenderId(null)
    setRenderStatus(null)
    setVideoProgress(0)

    try {
      // Add a fallback mechanism for production environments
      const isProduction = process.env.NODE_ENV === "production"

      if (isProduction) {
        try {
          // First, test the Creatomate connection
          const testResponse = await fetch("/api/test-creatomate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ test: true }),
          })

          if (!testResponse.ok) {
            throw new Error("Creatomate API connection test failed")
          }
        } catch (testError) {
          console.warn("Using fallback video generation method due to API test failure:", testError)
          // You could implement a fallback here or continue with the normal flow
          // For now, we'll just log the warning and continue
        }
      }
      // Prepare slides for Creatomate
      const slides = scenes.map((scene) => ({
        frameUrl: scene.imageUrl,
        caption: scene.caption,
      }))

      // Generate voiceover text from captions
      let voiceoverText = ""
      if (videoTheme === "social-reel") {
        // Create a more engaging voiceover that includes all captions
        const captionTexts = scenes.map((scene, index) => (scene.caption ? `${scene.caption}` : `Item ${index + 1}`))

        voiceoverText = `${captionTexts.join(". ")}`
      } else if (videoTheme === "product-showcase" && productData) {
        // For product showcase, use the first scene's caption as the main voiceover if available
        const firstCaption = scenes[0]?.caption

        voiceoverText =
          firstCaption ||
          `Introducing our amazing ${productData.productName || "product"}. 
          ${productData.productDescription || ""}. 
          Now only $${productData.discountedPrice || "79.99"} from $${productData.normalPrice || "99.99"}. 
          ${productData.cta || "Shop Now"}!`
      }

      // Call the generateCreatomateVideo function
      const response = await generateCreatomateVideo({
        slides,
        template: videoTheme,
        aspectRatio: scenes[0].aspectRatio,
        productData: {
          ...(videoTheme === "product-showcase"
            ? {
                productName: productData.productName || "Product Name",
                productDescription: productData.productDescription || "Product Description",
                normalPrice: productData.normalPrice || "99.99",
                discountedPrice: productData.discountedPrice || "79.99",
                cta: productData.cta || "Shop Now",
                website: productData.website || "www.example.com",
                logoUrl: productData.logoUrl,
              }
            : {}),
          voiceoverText: voiceoverText,
        },
        generateNarration: enableNarration,
      })

      if (response.success && response.renders && response.renders.length > 0) {
        const render = response.renders[0]
        setRenderId(render.id)
        setRenderStatus(render.status)
        setPolling(true)
        setVideoProgress(10) // Initial progress
      } else {
        throw new Error(response.error || "Failed to generate video")
      }
    } catch (error) {
      console.error("Error generating video:", error)
      setVideoError(error instanceof Error ? error.message : "Unknown error occurred")
      setIsGeneratingVideo(false)
    }
  }, [scenes, videoTheme, productData, enableNarration, movieData])

  // Generate movie video using Veo API and Creatomate for stitching
  const handleGenerateMovieVideo = useCallback(async () => {
    setIsGeneratingVideo(true)
    setVideoError(null)
    setVideoUrl(null)
    setRenderId(null)
    setRenderStatus(null)
    setVideoProgress(0)
    setGeneratedClips([])

    try {
      // Step 1: Generate video clips with Veo API
      setVideoProgress(5)
      setRenderStatus("generating clips")

      const veoResponse = await generateVeoVideo({
        prompt: movieData.prompt,
        aspectRatio: aspectRatio === "1:1" ? "16:9" : aspectRatio, // Veo only supports 16:9 and 9:16
        numberOfClips: movieData.numberOfClips,
        clipDuration: movieData.clipDuration,
      })

      if (!veoResponse.success) {
        throw new Error(veoResponse.error || "Failed to generate video clips")
      }

      setGeneratedClips(veoResponse.videoUrls)
      setVideoProgress(50)
      setRenderStatus("stitching clips")

      // Step 2: Stitch videos together with Creatomate
      const stitchResponse = await stitchVideos({
        videoUrls: veoResponse.videoUrls,
        transitionDuration: movieData.transitionDuration,
        aspectRatio: aspectRatio === "1:1" ? "16:9" : aspectRatio, // Match the aspect ratio used for generation
      })

      if (!stitchResponse.success) {
        throw new Error(stitchResponse.error || "Failed to stitch video clips")
      }

      setRenderId(stitchResponse.renderId)
      setRenderStatus(stitchResponse.status)
      setPolling(true)

      if (stitchResponse.url) {
        setVideoUrl(stitchResponse.url)
        setVideoProgress(100)
        setIsGeneratingVideo(false)
      } else {
        setVideoProgress(70) // Initial progress for stitching
      }
    } catch (error) {
      console.error("Error generating movie video:", error)
      setVideoError(error instanceof Error ? error.message : "Unknown error occurred")
      setIsGeneratingVideo(false)
    }
  }, [movieData, aspectRatio])

  // Poll for render status updates
  useEffect(() => {
    if (!polling || !renderId) return

    const pollInterval = setInterval(async () => {
      try {
        // Use the appropriate status check based on the video theme
        const response =
          videoTheme === "movie" ? await checkStitchingStatus(renderId) : await getCreatomateRenderStatus(renderId)

        if (response.success) {
          setRenderStatus(response.status || null)

          // Update progress based on status
          switch (response.status) {
            case "planned":
              setVideoProgress(10)
              break
            case "waiting":
              setVideoProgress(30)
              break
            case "transcribing":
              setVideoProgress(50)
              break
            case "rendering":
              setVideoProgress(70)
              break
            case "succeeded":
              setVideoProgress(100)
              break
            default:
              setVideoProgress(20)
          }

          // If render is complete, stop polling and set video URL
          if (response.status === "succeeded" && response.url) {
            setVideoUrl(response.url)
            setPolling(false)
            setIsGeneratingVideo(false)
          }

          // If render failed, stop polling and show error
          if (response.status === "failed") {
            setVideoError(response.error || response.errorMessage || "Video generation failed")
            setPolling(false)
            setIsGeneratingVideo(false)
          }
        } else {
          setVideoError(response.error || "Failed to check render status")
          setPolling(false)
          setIsGeneratingVideo(false)
        }
      } catch (err) {
        setVideoError(err instanceof Error ? err.message : "An unknown error occurred")
        setPolling(false)
        setIsGeneratingVideo(false)
      }
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(pollInterval)
  }, [polling, renderId, videoTheme])

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            <Film className="h-6 w-6" /> AI Video Generator
          </CardTitle>
          <CardDescription className="text-center">
            Create stunning videos with AI-generated scenes and captions
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Step 1: Image Generation (only show for non-movie themes) */}
          {videoTheme !== "movie" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">1. Generate Scene Images</h2>
                <Tabs
                  value={generationMode}
                  onValueChange={(value) => setGenerationMode(value as GenerationMode)}
                  className="w-[300px]"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="basic">Basic (Google)</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced (OpenAI)</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column: Controls */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="prompt">Prompt</Label>
                    <Textarea
                      id="prompt"
                      placeholder="Describe the scene you want to generate..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      disabled={isGenerating || isEditing}
                      className="min-h-[100px]"
                    />
                  </div>

                  {generationMode === "advanced" && (
                    <div className="space-y-2">
                      <Label htmlFor="negative-prompt">Negative Prompt (Optional)</Label>
                      <Input
                        id="negative-prompt"
                        placeholder="What to avoid in the generated image..."
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        disabled={isGenerating || isEditing}
                      />
                    </div>
                  )}

                  <AspectRatioSelector
                    value={aspectRatio}
                    onChange={setAspectRatio}
                    disabled={isGenerating || isEditing}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => startImageGeneration()}
                      disabled={isGenerating || isEditing || !prompt.trim()}
                      className="w-full"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>Generate Image</>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isGenerating || isEditing}
                      className="w-full"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Image
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleSingleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                    </Button>
                  </div>

                  <Button
                    variant="secondary"
                    onClick={() => multipleFileInputRef.current?.click()}
                    disabled={isGenerating || isEditing}
                    className="w-full"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Multiple Images to Timeline
                    <input
                      type="file"
                      ref={multipleFileInputRef}
                      onChange={handleMultipleImageUpload}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                  </Button>
                </div>

                {/* Right column: Preview */}
                <div className="space-y-4">
                  <ImagePreview
                    imageUrl={editedImageUrl || generatedImageUrl}
                    aspectRatio={aspectRatio}
                    isLoading={isGenerating}
                    isEmpty={!generatedImageUrl && !editedImageUrl}
                  />

                  {(generatedImageUrl || editedImageUrl) && !editMode && (
                    <div className="space-y-4">
                      <CaptionInput
                        value={currentCaption}
                        onChange={setCurrentCaption}
                        isLoading={isCaptionLoading}
                        disabled={!generatedImageUrl && !editedImageUrl}
                        imageUrl={editedImageUrl || generatedImageUrl}
                      />

                      <ImageEditPanel
                        onEditModeChange={setEditMode}
                        editPrompt={editPrompt}
                        onEditPromptChange={setEditPrompt}
                        onApplyEdit={handleEditImage}
                        isEditing={isEditing}
                        disabled={isGenerating}
                        imageUrl={editedImageUrl || generatedImageUrl}
                        onCreateVideo={(videoUrl) =>
                          addVideoToTimeline(videoUrl, editedImageUrl || generatedImageUrl || "")
                        }
                      />

                      <Button
                        onClick={addSceneToTimeline}
                        disabled={isGenerating || isEditing}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add to Timeline
                      </Button>
                    </div>
                  )}

                  {generatedImageUrl && editMode && (
                    <MaskEditor
                      imageUrl={generatedImageUrl}
                      aspectRatio={aspectRatio}
                      onMaskApplied={handleEditImage}
                      onCancel={() => setEditMode(false)}
                      disabled={isEditing}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Timeline (only show for non-movie themes) */}
          {videoTheme !== "movie" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">
                2. Scene Timeline ({scenes.length} {scenes.length === 1 ? "scene" : "scenes"})
              </h2>

              {scenes.length === 0 ? (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">No scenes added yet</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Generate or upload images and add them to your timeline.
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                  <DndContext sensors={[]} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={scenes.map((scene) => scene.id)} strategy={horizontalListSortingStrategy}>
                      <div className="overflow-x-auto pb-2">
                        <div className="flex gap-4 min-w-max">
                          {scenes.map((scene, index) => (
                            <TimelineScene
                              key={scene.id}
                              scene={scene}
                              index={index}
                              onMove={moveScene}
                              onDelete={removeScene}
                              onCaptionChange={updateSceneCaption}
                              disabled={isGeneratingVideo}
                              isDragging={draggedSceneId === scene.id}
                              setIsDragging={(isDragging) => {
                                if (isDragging) setDraggedSceneId(scene.id)
                                else if (draggedSceneId === scene.id) setDraggedSceneId(null)
                              }}
                              isMobile={isMobile}
                              isLast={index === scenes.length - 1}
                              isFirst={index === 0}
                            />
                          ))}
                        </div>
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Video Generation */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{videoTheme !== "movie" ? "3. " : ""}Generate Video</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left column: Video settings */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="video-theme">Video Theme</Label>
                  <Select
                    value={videoTheme}
                    onValueChange={(value) => {
                      setVideoTheme(value as VideoTheme)
                      resetVideoState()
                    }}
                    disabled={isGeneratingVideo}
                  >
                    <SelectTrigger id="video-theme">
                      <SelectValue placeholder="Select a theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="social-reel">Social Media Reel</SelectItem>
                      <SelectItem value="product-showcase">Product Showcase</SelectItem>
                      <SelectItem value="movie">AI Movie (Veo)</SelectItem>
                      <SelectItem value="cinematic">Cinematic Real Estate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {videoTheme === "product-showcase" && (
                  <ProductShowcaseForm data={productData} onChange={setProductData} disabled={isGeneratingVideo} />
                )}

                {videoTheme === "movie" && (
                  <>
                    <MovieForm data={movieData} onChange={setMovieData} disabled={isGeneratingVideo} />

                    <AspectRatioSelector value={aspectRatio} onChange={setAspectRatio} disabled={isGeneratingVideo} />

                    {generatedClips.length > 0 && (
                      <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-3 text-sm text-blue-800 dark:text-blue-200">
                        <p className="font-medium">Generated {generatedClips.length} video clips</p>
                        <p className="mt-1">
                          Clips will be stitched together with {movieData.transitionDuration}s fade transitions
                        </p>
                      </div>
                    )}
                  </>
                )}

                {videoTheme === "cinematic" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="description">Property Description</Label>
                      <Textarea
                        id="description"
                        value={cinematicData.description}
                        onChange={(e) => setCinematicData({ ...cinematicData, description: e.target.value })}
                        placeholder="Property address and call to action"
                        disabled={isGeneratingVideo}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subtext">Subtext</Label>
                      <Input
                        id="subtext"
                        value={cinematicData.subtext}
                        onChange={(e) => setCinematicData({ ...cinematicData, subtext: e.target.value })}
                        placeholder="Just Listed, Open House, etc."
                        disabled={isGeneratingVideo}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="brandName">Brand Name</Label>
                        <Input
                          id="brandName"
                          value={cinematicData.brandName}
                          onChange={(e) => setCinematicData({ ...cinematicData, brandName: e.target.value })}
                          placeholder="Your real estate brand"
                          disabled={isGeneratingVideo}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="name">Agent Name</Label>
                        <Input
                          id="name"
                          value={cinematicData.name}
                          onChange={(e) => setCinematicData({ ...cinematicData, name: e.target.value })}
                          placeholder="Your name"
                          disabled={isGeneratingVideo}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          value={cinematicData.email}
                          onChange={(e) => setCinematicData({ ...cinematicData, email: e.target.value })}
                          placeholder="your@email.com"
                          disabled={isGeneratingVideo}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phoneNumber">Phone Number</Label>
                        <Input
                          id="phoneNumber"
                          value={cinematicData.phoneNumber}
                          onChange={(e) => setCinematicData({ ...cinematicData, phoneNumber: e.target.value })}
                          placeholder="(123) 456-7890"
                          disabled={isGeneratingVideo}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Narration option (only for non-movie themes) */}
                {videoTheme !== "movie" && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="narration-mode"
                      checked={enableNarration}
                      onCheckedChange={setEnableNarration}
                      disabled={isGeneratingVideo}
                    />
                    <Label htmlFor="narration-mode" className="flex items-center cursor-pointer">
                      <Volume2 className="mr-2 h-4 w-4" />
                      Generate AI Narration from Captions
                    </Label>
                  </div>
                )}

                {videoTheme !== "movie" && enableNarration && (
                  <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-3 text-sm text-blue-800 dark:text-blue-200">
                    <p>Captions will be converted to spoken narration using ElevenLabs AI voices.</p>
                    <p className="mt-1 font-medium">Captions will also be displayed as text in the video.</p>
                    {scenes.some((scene) => !scene.caption) && (
                      <p className="mt-1 text-amber-600 dark:text-amber-400">
                        <strong>Warning:</strong> Some scenes don't have captions. Add captions to all scenes for best
                        results.
                      </p>
                    )}
                  </div>
                )}

                {videoTheme === "social-reel" && scenes.length < 3 && (
                  <div className="text-amber-500 text-sm">
                    Social Media Reel requires at least 3 scenes. Please add more images to your timeline.
                  </div>
                )}

                <Button
                  onClick={handleGenerateVideo}
                  disabled={
                    (videoTheme !== "movie" && scenes.length === 0) ||
                    isGeneratingVideo ||
                    (videoTheme === "product-showcase" && !productData.productName) ||
                    (videoTheme === "social-reel" && scenes.length < 3) ||
                    (videoTheme === "movie" && !movieData.prompt)
                  }
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  {isGeneratingVideo ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Video...
                    </>
                  ) : (
                    <>
                      Generate{" "}
                      {videoTheme === "movie" ? (
                        <>
                          <Clapperboard className="mx-1 h-4 w-4" /> Movie
                        </>
                      ) : (
                        <>
                          {enableNarration ? "Narrated " : ""}
                          {videoTheme.replace("-", " ")} Video
                        </>
                      )}
                    </>
                  )}
                </Button>

                {isGeneratingVideo && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Processing... {renderStatus && `(${renderStatus})`}</span>
                      <span>{Math.round(videoProgress)}%</span>
                    </div>
                    <Progress value={videoProgress} />
                    {videoTheme === "movie" && videoProgress < 50 && (
                      <p className="text-xs text-muted-foreground">
                        Generating video clips with Google Veo. This may take several minutes...
                      </p>
                    )}
                    {enableNarration && videoProgress < 50 && (
                      <p className="text-xs text-muted-foreground">
                        Generating narration takes a bit longer. Please be patient...
                      </p>
                    )}
                  </div>
                )}

                {videoError && (
                  <div className="p-4 rounded-md bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-sm">
                    {videoError}
                  </div>
                )}

                {videoTheme !== "movie" && scenes.length === 0 && (
                  <p className="text-sm text-red-500">Add at least one scene to generate a video</p>
                )}

                {videoTheme === "product-showcase" && !productData.productName && scenes.length > 0 && (
                  <p className="text-sm text-red-500">Product Name is required for Product Showcase</p>
                )}

                {videoTheme === "movie" && !movieData.prompt && (
                  <p className="text-sm text-red-500">Movie prompt is required</p>
                )}
              </div>

              {/* Right column: Video preview */}
              <div>
                <VideoPreview videoUrl={videoUrl} />
                {videoUrl && (
                  <div className="mt-4 text-center">
                    <a
                      href={videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      Open video in new tab
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

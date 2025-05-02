"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { generateProductShowcase, checkRenderStatus } from "@/actions/creatomate-api"
import type { CreatomateStatus } from "@/actions/creatomate-api"

export default function CreatomateTest() {
  // Form state for product showcase
  const [productImageUrl, setProductImageUrl] = useState(
    "https://creatomate.com/files/assets/fe61553c-4274-4586-affe-54cffe99ccdc",
  )
  const [productName, setProductName] = useState("Nike RN Flyknit")
  const [productDescription, setProductDescription] = useState(
    "Unleash your inner athlete with these high-performance running shoes.",
  )
  const [normalPrice, setNormalPrice] = useState("109.99")
  const [discountedPrice, setDiscountedPrice] = useState("89.99")
  const [cta, setCta] = useState("Follow us for more discount alerts!")
  const [website, setWebsite] = useState("www.mywebsite.com")

  // Render state
  const [renderId, setRenderId] = useState<string | null>(null)
  const [renderStatus, setRenderStatus] = useState<CreatomateStatus | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [polling, setPolling] = useState(false)

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setVideoUrl(null)
    setRenderId(null)
    setRenderStatus(null)

    try {
      const response = await generateProductShowcase({
        productImageUrl,
        productName,
        productDescription,
        normalPrice,
        discountedPrice,
        cta,
        website,
      })

      if (response.success && response.renderId) {
        setRenderId(response.renderId)
        setRenderStatus(response.status || null)
        setPolling(true)
      } else {
        setError(response.error || "Failed to generate video")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  // Poll for render status updates
  useEffect(() => {
    if (!polling || !renderId) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await checkRenderStatus(renderId)

        if (response.success) {
          setRenderStatus(response.status || null)

          // If render is complete, stop polling and set video URL
          if (response.status === "succeeded" && response.url) {
            setVideoUrl(response.url)
            setPolling(false)
          }

          // If render failed, stop polling and show error
          if (response.status === "failed") {
            setError(response.error || "Video generation failed")
            setPolling(false)
          }
        } else {
          setError(response.error || "Failed to check render status")
          setPolling(false)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred")
        setPolling(false)
      }
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(pollInterval)
  }, [polling, renderId])

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Creatomate API Test</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Product Showcase Video</CardTitle>
            <CardDescription>Generate a product showcase video using Creatomate</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Product Image URL</label>
                <Input
                  value={productImageUrl}
                  onChange={(e) => setProductImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Product Name</label>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Product Name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Product Description</label>
                <Textarea
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  placeholder="Product Description"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Normal Price</label>
                  <Input
                    value={normalPrice}
                    onChange={(e) => setNormalPrice(e.target.value)}
                    placeholder="99.99"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Discounted Price</label>
                  <Input
                    value={discountedPrice}
                    onChange={(e) => setDiscountedPrice(e.target.value)}
                    placeholder="79.99"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Call to Action</label>
                <Input
                  value={cta}
                  onChange={(e) => setCta(e.target.value)}
                  placeholder="Follow us for more!"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Website</label>
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="www.example.com"
                  required
                />
              </div>

              <Button type="submit" disabled={loading || polling} className="w-full">
                {loading ? "Generating..." : polling ? "Processing..." : "Generate Video"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Video Preview</CardTitle>
            <CardDescription>
              {renderStatus ? `Status: ${renderStatus}` : "Submit the form to generate a video"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center min-h-[300px]">
            {error && (
              <div className="text-red-500 text-center p-4 border border-red-200 rounded-md bg-red-50 w-full">
                {error}
              </div>
            )}

            {!error && !videoUrl && !loading && !polling && !renderId && (
              <div className="text-center p-8">
                <img
                  src="/video-preview.png"
                  alt="Video preview placeholder"
                  className="max-w-full h-auto mb-4 opacity-50"
                />
                <p className="text-gray-500">
                  Fill out the form and click "Generate Video" to create a product showcase
                </p>
              </div>
            )}

            {(loading || polling) && (
              <div className="text-center p-8">
                <div className="animate-pulse flex flex-col items-center">
                  <div className="h-32 w-32 bg-gray-200 rounded-full mb-4"></div>
                  <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>
                </div>
                <p className="mt-4 text-gray-500">
                  {loading ? "Initiating video generation..." : `Rendering video (${renderStatus})...`}
                </p>
              </div>
            )}

            {videoUrl && (
              <div className="w-full">
                <video src={videoUrl} controls className="w-full h-auto rounded-md shadow-lg" autoPlay>
                  Your browser does not support the video tag.
                </video>
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
              </div>
            )}
          </CardContent>
          {renderId && <CardFooter className="text-xs text-gray-500">Render ID: {renderId}</CardFooter>}
        </Card>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect, useRef } from "react"
import { generateWebsite } from "@/actions/generate-website"
import { generateWebsiteAdvanced } from "@/actions/generate-website-advanced"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Loader2,
  Code,
  Layers,
  FileText,
  ImageIcon,
  Search,
  Wand2,
  Palette,
  Zap,
  Grid,
  Maximize2,
  Layout,
  Sun,
  Moon,
  MessageSquare,
} from "lucide-react"
import { editImage } from "@/actions/generate-images"
import { CodePreviewFallback } from "./code-preview-fallback"
import { WebsitePreview } from "./website-preview"
import { WebsitePreviewAdvanced } from "./website-preview-advanced"
import { ImageReplacementModal } from "./image-replacement-modal"
import { FileAttachment } from "./file-attachment"
import { WebsiteChat } from "./website-chat"

// Dynamically import CodePreview with no SSR
const CodePreview = dynamic(() => import("./code-preview"), {
  ssr: false,
  loading: () => <CodePreviewFallback html="" css="" js="" />,
})

// Define the generation steps
const GENERATION_STEPS = [
  { id: "planning", label: "Planning", icon: Layers },
  { id: "code", label: "Code Generation", icon: Code },
  { id: "content", label: "Content Generation", icon: FileText },
  { id: "images", label: "Image Planning", icon: Palette },
  { id: "generate-images", label: "Image Generation", icon: ImageIcon },
  { id: "integrate", label: "Content Integration", icon: FileText },
  { id: "analysis", label: "Website Analysis", icon: Search },
  { id: "enhance", label: "Enhancing", icon: Zap },
  { id: "finalize", label: "Finalizing", icon: Wand2 },
]

export function WebsiteBuilder() {
  const [prompt, setPrompt] = useState("")
  const [generatedCode, setGeneratedCode] = useState<{
    html: string
    css: string
    js: string
    isPartial?: boolean
    plan?: any
    contentBlocks?: any[]
    interactiveElements?: string[]
    thinking?: string // Add thinking field
  } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<string | null>(null)
  const [generationId, setGenerationId] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [statusMessages, setStatusMessages] = useState<string[]>([])
  const [thinking, setThinking] = useState<string | null>(null) // Add thinking state
  const [showThinking, setShowThinking] = useState(false) // Add state to toggle thinking display
  const [generatedImagePreviews, setGeneratedImagePreviews] = useState<
    Array<{ id: string; url: string; pexelsId?: string; description?: string }>
  >([])
  const [useAdvancedGeneration, setUseAdvancedGeneration] = useState(true)
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "chat">("preview")
  const statusContainerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Add state for file attachments
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])

  // Add state for code generation updates
  const [codeUpdates, setCodeUpdates] = useState<{
    html: string
    css: string
    js: string
    json: string
  }>({
    html: "",
    css: "",
    js: "",
    json: "",
  })
  const [showCodeGeneration, setShowCodeGeneration] = useState(false)
  const [showStreamingOutput, setShowStreamingOutput] = useState(true)

  // Gemini edit modal state
  const [geminiEditModalOpen, setGeminiEditModalOpen] = useState(false)
  const [currentImageToEdit, setCurrentImageToEdit] = useState<{ id: string; url: string } | null>(null)
  const [editPrompt, setEditPrompt] = useState("")
  const [isEditing, setIsEditing] = useState(false)

  // Add state for image replacement modal
  const [imageReplacementModalOpen, setImageReplacementModalOpen] = useState(false)
  const [currentImageToReplace, setCurrentImageToReplace] = useState<{ id: string; url: string; alt: string } | null>(
    null,
  )

  // Add state for theme selector modal
  const [themeModalOpen, setThemeModalOpen] = useState(false)

  // Add state for feature selection
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    "Multi-page structure (3+ pages)",
    "Grid layout",
    "Popup modals",
    "Expandable content",
    "Dark/Light mode toggle",
  ])

  // Auto-scroll to the bottom of the status container when new messages are added
  useEffect(() => {
    if (statusContainerRef.current) {
      statusContainerRef.current.scrollTop = statusContainerRef.current.scrollHeight
    }
  }, [statusMessages])

  // Poll for finalized results if we have a partial response
  useEffect(() => {
    if (!generationId || !generatedCode?.isPartial || isPolling) return

    const pollForResults = async () => {
      setIsPolling(true)
      try {
        // Poll every 2 seconds for the final result
        const interval = setInterval(async () => {
          const finalResult = await checkGenerationStatus(generationId)
          if (finalResult) {
            clearInterval(interval)
            setGeneratedCode(finalResult)
            setIsPolling(false)
            addStatus("Website generation completed!")
          }
        }, 2000)

        // Stop polling after 2 minutes as a safety measure
        setTimeout(() => {
          clearInterval(interval)
          setIsPolling(false)
        }, 120000)
      } catch (err) {
        console.error("Error polling for results:", err)
        setIsPolling(false)
      }
    }

    pollForResults()
  }, [generationId, generatedCode?.isPartial, isPolling])

  // Update the useEffect for polling updates to better handle thinking and code generation
  useEffect(() => {
    if (!generationId || !isGenerating) return

    let isMounted = true
    const pollForUpdates = async () => {
      try {
        const interval = setInterval(async () => {
          if (!isMounted) return

          const updates = await fetchGenerationUpdates(generationId)

          if (updates.statusMessages && updates.statusMessages.length > 0) {
            setStatusMessages((prev) => {
              // Only add new messages that aren't already in the list
              const newMessages = updates.statusMessages.filter((msg) => !prev.includes(msg))
              return [...prev, ...newMessages]
            })
          }

          // Update thinking if available
          if (updates.thinking) {
            setThinking(updates.thinking)
            // If thinking is updated and showThinking is false, add a status message to notify the user
            if (!showThinking && updates.thinking !== thinking) {
              setStatusMessages((prev) => {
                const message = "💭 AI thinking process updated. Click 'Show AI Thinking' to view."
                return prev.includes(message) ? prev : [...prev, message]
              })
            }
          }

          // Update code generation if available
          if (updates.codeUpdates) {
            setCodeUpdates((prev) => ({
              html: updates.codeUpdates.html || prev.html,
              css: updates.codeUpdates.css || prev.css,
              js: updates.codeUpdates.js || prev.js,
              json: updates.codeUpdates.json || prev.json,
            }))

            // If code is updated and showCodeGeneration is false, add a status message to notify the user
            if (
              !showCodeGeneration &&
              (updates.codeUpdates.html ||
                updates.codeUpdates.css ||
                updates.codeUpdates.js ||
                updates.codeUpdates.json)
            ) {
              setStatusMessages((prev) => {
                const message = "📝 Code generation in progress. Click 'Show Code Generation' to view."
                return prev.includes(message) ? prev : [...prev, message]
              })
            }
          }

          if (updates.imagePreviewsUrls && updates.imagePreviewsUrls.length > 0) {
            setGeneratedImagePreviews((prev) => {
              // Merge new image previews with existing ones, avoiding duplicates
              const existingIds = new Set(prev.map((img) => img.id))
              const newImages = updates.imagePreviewsUrls.filter((img) => !existingIds.has(img.id))
              if (newImages.length > 0) {
                console.log(`Adding ${newImages.length} new image previews:`, newImages)
              }
              return [...prev, ...newImages]
            })
          }

          // If generation is complete, stop polling
          if (updates.isComplete) {
            clearInterval(interval)
          }
        }, 1000)

        // Stop polling after 5 minutes as a safety measure
        setTimeout(() => {
          clearInterval(interval)
        }, 300000)

        return () => {
          clearInterval(interval)
          isMounted = false
        }
      } catch (err) {
        console.error("Error polling for updates:", err)
      }
    }

    pollForUpdates()

    return () => {
      isMounted = false
    }
  }, [generationId, isGenerating, thinking, showThinking, showCodeGeneration])

  // Add a status message
  const addStatus = (message: string) => {
    setStatusMessages((prev) => [...prev, message])
    console.log(message)
  }

  // Process file attachments
  const processAttachedFiles = async () => {
    if (attachedFiles.length === 0) return []

    const fileAttachments = []

    for (const file of attachedFiles) {
      try {
        // Convert file to base64
        const base64Data = await readFileAsBase64(file)

        fileAttachments.push({
          data: base64Data,
          mimeType: file.type,
        })
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error)
        addStatus(`⚠️ Warning: Could not process file ${file.name}. Skipping.`)
      }
    }

    return fileAttachments
  }

  // Helper function to read file as base64
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(",")[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Handle website generation
  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    setError(null)
    setStatusMessages([])
    setThinking(null) // Reset thinking
    setShowThinking(false) // Reset thinking display
    setShowCodeGeneration(false) // Reset code generation display
    setCodeUpdates({ html: "", css: "", js: "", json: "" }) // Reset code updates
    setGeneratedImagePreviews([])
    setGeneratedCode(null)
    setActiveTab("preview")

    // Add selected features to the prompt
    const enhancedPrompt = `${prompt}\n\nPlease include these features: ${selectedFeatures.join(", ")}.`

    addStatus(`Starting ${useAdvancedGeneration ? "advanced" : "standard"} website generation process...`)
    addStatus(`Including features: ${selectedFeatures.join(", ")}`)

    // Process file attachments if any
    let fileAttachments = []
    if (attachedFiles.length > 0) {
      addStatus(`Processing ${attachedFiles.length} attached files...`)
      fileAttachments = await processAttachedFiles()
      addStatus(`✅ ${fileAttachments.length} files processed and ready for generation.`)
    }

    try {
      // Call the appropriate generate function
      const result = useAdvancedGeneration
        ? await generateWebsiteAdvanced(enhancedPrompt, fileAttachments)
        : await generateWebsite(enhancedPrompt, fileAttachments)

      // Set the generated code and generation ID
      setGeneratedCode(result.code)
      if (result.generationId) {
        setGenerationId(result.generationId)
        addStatus(`Generation process started with ID: ${result.generationId}`)
      }

      // If the result has thinking, set it
      if (result.code.thinking) {
        setThinking(result.code.thinking)
      }

      // If the result is final, add a completion message
      if (!result.code.isPartial) {
        addStatus("Website generation completed!")
      }
    } catch (err) {
      console.error("Generation error:", err)
      setError(typeof err === "string" ? err : err instanceof Error ? err.message : "Failed to generate website")
      addStatus("Error occurred during generation.")
    } finally {
      setIsGenerating(false)
      setCurrentStep(null)
    }
  }

  // Function to check the status of a generation
  const checkGenerationStatus = async (id: string) => {
    try {
      const response = await fetch(`/api/generation-status?id=${id}`)
      if (!response.ok) return null

      const data = await response.json()
      if (data.status === "completed") {
        return data.result
      }
      return null
    } catch (error) {
      console.error("Error checking generation status:", error)
      return null
    }
  }

  // Function to fetch generation updates (status messages, thinking, code, and image previews)
  const fetchGenerationUpdates = async (id: string) => {
    try {
      const response = await fetch(`/api/generation-updates?id=${id}`)
      if (!response.ok)
        return {
          statusMessages: [],
          thinking: null,
          codeUpdates: {},
          imagePreviewsUrls: [],
          isComplete: false,
        }

      return await response.json()
    } catch (error) {
      console.error("Error fetching generation updates:", error)
      return {
        statusMessages: [],
        thinking: null,
        codeUpdates: {},
        imagePreviewsUrls: [],
        isComplete: false,
      }
    }
  }

  // Function to handle image editing
  async function handleEditImage(imageId: string, imageUrl: string) {
    try {
      // Show loading state on the image
      const statusMessage = `Preparing to edit image ${imageId}...`
      setStatusMessages((prev) => [...prev, statusMessage])

      // Set the current image to edit and open the Gemini edit modal directly
      setCurrentImageToEdit({ id: imageId, url: imageUrl })
      setEditPrompt("")
      setGeminiEditModalOpen(true)

      return null
    } catch (error) {
      console.error("Error preparing image edit:", error)
      setStatusMessages((prev) => [
        ...prev,
        `Failed to prepare image edit for ${imageId}: ${error instanceof Error ? error.message : "Unknown error"}`,
      ])
      return null
    }
  }

  // Add function to handle image replacement request
  const handleReplaceImageRequest = (imageId: string, imageUrl: string, alt: string) => {
    setCurrentImageToReplace({ id: imageId, url: imageUrl, alt })
    setImageReplacementModalOpen(true)
  }

  // Add function to handle image replacement
  const handleReplaceImage = (newImageUrl: string, source: "pexels" | "gemini", sourceId?: string) => {
    if (!currentImageToReplace) return

    try {
      setStatusMessages((prev) => [...prev, `Replacing image ${currentImageToReplace.id} with ${source} image...`])

      // Update the image preview in the UI
      setGeneratedImagePreviews((prev) =>
        prev.map((img) => (img.id === currentImageToReplace.id ? { ...img, url: newImageUrl } : img)),
      )

      // Update the image in the HTML
      if (generatedCode) {
        const updatedHtml = replaceImageInHtml(generatedCode.html, currentImageToReplace.id, newImageUrl)
        setGeneratedCode({
          ...generatedCode,
          html: updatedHtml,
        })

        // Force a refresh of the preview
        setTimeout(() => {
          handleRefresh()
        }, 100)
      }

      setStatusMessages((prev) => [...prev, `✅ Successfully replaced image with ${source} image`])
      setCurrentImageToReplace(null)
    } catch (error) {
      console.error(`Error replacing image:`, error)
      setStatusMessages((prev) => [
        ...prev,
        `❌ Failed to replace image: ${error instanceof Error ? error.message : "Unknown error"}`,
      ])
      setCurrentImageToReplace(null)
    }
  }

  // Function to handle Gemini image editing
  const handleGeminiEdit = async () => {
    if (!currentImageToEdit || !editPrompt.trim()) return

    try {
      setIsEditing(true)
      setGeminiEditModalOpen(false)
      setStatusMessages((prev) => [...prev, `Editing image with Gemini: "${editPrompt}"`])

      // Call the editImage function
      const result = await editImage({
        imageUrl: currentImageToEdit.url,
        prompt: editPrompt,
      })

      // Check if the result is a placeholder (error occurred)
      if (result.url.includes("ImgEditErr")) {
        throw new Error("Gemini couldn't edit the image. Please try a different prompt.")
      }

      // Update the image preview in the UI
      setGeneratedImagePreviews((prev) =>
        prev.map((img) => (img.id === currentImageToEdit.id ? { ...img, url: result.url } : img)),
      )

      // Update the image in the HTML
      if (generatedCode) {
        const updatedHtml = replaceImageInHtml(generatedCode.html, currentImageToEdit.id, result.url)
        setGeneratedCode({
          ...generatedCode,
          html: updatedHtml,
        })

        // Force a refresh of the preview
        setTimeout(() => {
          handleRefresh()
        }, 100)
      }

      setStatusMessages((prev) => [...prev, `✅ Successfully edited image with Gemini`])
      setCurrentImageToEdit(null)
      setEditPrompt("")
    } catch (error) {
      console.error(`Error in Gemini edit:`, error)
      setStatusMessages((prev) => [
        ...prev,
        `❌ Failed to edit with Gemini: ${error instanceof Error ? error.message : "Unknown error"}`,
      ])
      setCurrentImageToEdit(null)
      setEditPrompt("")
    } finally {
      setIsEditing(false)
    }
  }

  // Find the handleTextEdit function and replace it with this improved version
  // Function to handle text editing
  const handleTextEdit = (elementId: string, newText: string) => {
    if (!generatedCode) return

    try {
      console.log(`Updating text for element ${elementId} with new text: ${newText}`)

      // Create a more robust regex to find the element with the specified ID
      // This pattern will match any HTML element with the given ID and capture its content
      const elementRegex = new RegExp(`(<[^>]+id=["']${elementId}["'][^>]*>)(.*?)(<\/[^>]+>)`, "s")

      // Check if the regex matches
      if (!elementRegex.test(generatedCode.html)) {
        console.warn(`Element with ID ${elementId} not found using primary regex pattern`)

        // Try an alternative approach for elements that might have nested content
        const altRegex = new RegExp(`<([^>]+)\\s+id=["']${elementId}["'][^>]*>(.*?)<\\/\\1>`, "s")

        if (!altRegex.test(generatedCode.html)) {
          console.warn(`Element with ID ${elementId} not found using alternative regex pattern`)

          // Try a third approach for elements with more complex structure
          const thirdRegex = new RegExp(`<([^>]+)\\s+id=["']${elementId}["'][^>]*>([\\s\\S]*?)<\\/\\1>`, "s")

          if (!thirdRegex.test(generatedCode.html)) {
            console.warn(`Element with ID ${elementId} not found using third regex pattern`)
            setStatusMessages((prev) => [...prev, `❌ Could not find element with ID: ${elementId}`])
            return
          }

          // Update using the third pattern
          const updatedHtml = generatedCode.html.replace(thirdRegex, (match, tag, content) => {
            return `<${tag} id="${elementId}">${newText}</${tag}>`
          })

          // Update the generated code
          setGeneratedCode({
            ...generatedCode,
            html: updatedHtml,
          })
        } else {
          // Update using the alternative pattern
          const updatedHtml = generatedCode.html.replace(altRegex, (match, tag, content) => {
            return `<${tag} id="${elementId}">${newText}</${tag}>`
          })

          // Update the generated code
          setGeneratedCode({
            ...generatedCode,
            html: updatedHtml,
          })
        }
      } else {
        // Use the primary regex approach
        const updatedHtml = generatedCode.html.replace(elementRegex, (match, openTag, content, closeTag) => {
          return `${openTag}${newText}${closeTag}`
        })

        // Update the generated code
        setGeneratedCode({
          ...generatedCode,
          html: updatedHtml,
        })
      }

      // Add a status message
      setStatusMessages((prev) => [...prev, `✅ Successfully updated text content for element: ${elementId}`])
    } catch (error) {
      console.error(`Error updating text:`, error)
      setStatusMessages((prev) => [
        ...prev,
        `❌ Failed to update text: ${error instanceof Error ? error.message : "Unknown error"}`,
      ])
    }
  }

  // Function to handle code updates from chat
  const handleCodeUpdate = (html: string, css: string, js: string) => {
    if (!generatedCode) return

    setGeneratedCode({
      ...generatedCode,
      html,
      css,
      js,
    })

    setStatusMessages((prev) => [...prev, `✅ Code updated via chat`])
  }

  // Function to handle theme changes
  const handleApplyTheme = (theme: any) => {
    if (!generatedCode) return

    try {
      setStatusMessages((prev) => [...prev, `Applying theme: ${theme.name}...`])

      // Create a new CSS with updated colors
      let updatedCss = generatedCode.css

      // Replace color values in CSS
      Object.entries(theme.colors).forEach(([key, value]) => {
        // Replace common color patterns
        if (key === "primary") {
          updatedCss = updatedCss.replace(/#[0-9a-fA-F]{3,6}(?=.*?primary)/g, value as string)
        }
        if (key === "secondary") {
          updatedCss = updatedCss.replace(/#[0-9a-fA-F]{3,6}(?=.*?secondary)/g, value as string)
        }
        if (key === "accent") {
          updatedCss = updatedCss.replace(/#[0-9a-fA-F]{3,6}(?=.*?accent)/g, value as string)
        }
        if (key === "background") {
          updatedCss = updatedCss.replace(/background-color:\s*#[0-9a-fA-F]{3,6}/g, `background-color: ${value}`)
          updatedCss = updatedCss.replace(/background:\s*#[0-9a-fA-F]{3,6}/g, `background: ${value}`)
        }
        if (key === "text") {
          updatedCss = updatedCss.replace(/color:\s*#[0-9a-fA-F]{3,6}/g, `color: ${value}`)
        }
      })

      // Add theme-specific CSS
      updatedCss += `\n\n/* Theme: ${theme.name} */\n`
      updatedCss += `:root {\n`
      Object.entries(theme.colors).forEach(([key, value]) => {
        updatedCss += `  --color-${key}: ${value};\n`
      })
      updatedCss += `}\n`

      // Update body styles for dark themes
      if (theme.id === "dark") {
        updatedCss += `\nbody {\n  background-color: ${theme.colors.background};\n  color: ${theme.colors.text};\n}\n`
      }

      // Update the generated code
      setGeneratedCode({
        ...generatedCode,
        css: updatedCss,
      })

      setStatusMessages((prev) => [...prev, `✅ Successfully applied theme: ${theme.name}`])
    } catch (error) {
      console.error(`Error applying theme:`, error)
      setStatusMessages((prev) => [
        ...prev,
        `❌ Failed to apply theme: ${error instanceof Error ? error.message : "Unknown error"}`,
      ])
    }
  }

  // Helper function to replace an image in the HTML
  function replaceImageInHtml(html: string, imageId: string, newImageUrl: string): string {
    // Create a regex to find the image tag with the specified ID
    const imgRegex = new RegExp(`<img[^>]*id=["']${imageId}["'][^>]*>`, "g")

    // Replace the image tag with a new one that has the updated src
    return html.replace(imgRegex, (match) => {
      // Keep all attributes except src
      const updatedTag = match.replace(/src=["'][^"']*["']/, `src="${newImageUrl}"`)
      return updatedTag
    })
  }

  // Get website title from generated code
  const getWebsiteTitle = (): string => {
    if (!generatedCode?.html) return "generated-website"

    const titleMatch = generatedCode.html.match(/<title>(.*?)<\/title>/)
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1].trim().toLowerCase().replace(/\s+/g, "-")
    }

    // If no title found, use the prompt
    return prompt.trim().toLowerCase().replace(/\s+/g, "-").substring(0, 30) || "generated-website"
  }

  // Update the formatThinking function to better format thinking text
  const formatThinking = (text: string | null): string => {
    if (!text) return ""

    // Convert thinking text to markdown format
    return text
      .replace(/\n\n/g, "\n\n")
      .replace(/\*\*(.*?)\*\*/g, "**$1**") // Bold
      .replace(/Step (\d+):/g, "**Step $1:**") // Bold steps
      .replace(/- /g, "* ") // Convert to markdown list items
      .replace(/Let me think/g, "**Let me think**") // Bold thinking phrases
      .replace(/I'll analyze/g, "**I'll analyze**") // Bold thinking phrases
      .replace(/First, I need to/g, "**First, I need to**") // Bold thinking phrases
      .replace(/Let's break this down/g, "**Let's break this down**") // Bold thinking phrases
  }

  // Format code for display
  const formatCodeForDisplay = (code: string, language: string): string => {
    if (!code) return ""
    return `\`\`\`${language}\n${code}\n\`\`\``
  }

  // Toggle a feature in the selected features list
  const toggleFeature = (feature: string) => {
    setSelectedFeatures((prev) => (prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]))
  }

  // Function to refresh the iframe
  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.location.reload()
    }
  }

  return (
    <div className="flex flex-col h-full gap-8 text-gray-900 dark:text-white">
      <div className="text-center max-w-3xl mx-auto pt-12 pb-8">
        <h2 className="text-4xl font-bold mb-4">What website do you want to build?</h2>
        <p className="text-gray-400">
          Describe your website and our AI will generate the HTML, CSS, and JavaScript code for you.
        </p>
      </div>

      <div className="flex flex-col gap-4 max-w-3xl mx-auto w-full">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your website (e.g., 'Create a landing page for a coffee shop with a hero section, about us, and contact form')"
          className="min-h-32 bg-white/90 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:border-emerald-500"
        />

        {/* File attachment component */}
        <FileAttachment onFilesSelected={setAttachedFiles} maxFiles={5} maxSizeInMB={10} />

        {/* Feature selection */}
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4 rounded-md">
          <h3 className="text-sm font-medium mb-3 text-gray-300 flex items-center">
            <Layout className="h-4 w-4 mr-2" />
            Select Interactive Features:
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => toggleFeature("Multi-page structure (3+ pages)")}
              className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 ${
                selectedFeatures.includes("Multi-page structure (3+ pages)")
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <Layers className="h-3 w-3" />
              Multi-page structure (3+ pages)
            </button>
            <button
              onClick={() => toggleFeature("Grid layout")}
              className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 ${
                selectedFeatures.includes("Grid layout")
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <Grid className="h-3 w-3" />
              Grid layout
            </button>
            <button
              onClick={() => toggleFeature("Popup modals")}
              className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 ${
                selectedFeatures.includes("Popup modals")
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <Maximize2 className="h-3 w-3" />
              Popup modals
            </button>
            <button
              onClick={() => toggleFeature("Expandable content")}
              className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 ${
                selectedFeatures.includes("Expandable content")
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <Zap className="h-3 w-3" />
              Expandable content
            </button>
            <button
              onClick={() => toggleFeature("Dark/Light mode toggle")}
              className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 ${
                selectedFeatures.includes("Dark/Light mode toggle")
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <div className="flex items-center mr-1">
                <Sun className="h-3 w-3" />
                <Moon className="h-3 w-3 ml-0.5" />
              </div>
              Dark/Light mode toggle
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="advanced-generation"
              checked={useAdvancedGeneration}
              onChange={(e) => setUseAdvancedGeneration(e.target.checked)}
              className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="advanced-generation" className="text-sm text-gray-300">
              Use advanced multi-step generation
            </label>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <input
              type="checkbox"
              id="show-streaming"
              checked={showStreamingOutput}
              onChange={(e) => setShowStreamingOutput(e.target.checked)}
              className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="show-streaming" className="text-sm text-gray-300">
              Show streaming output
            </label>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim() || isPolling}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>Generate Website</>
            )}
          </Button>
        </div>
      </div>

      {generatedCode && (
        <div className="mt-8 w-full">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("preview")}
                className={`px-4 py-2 rounded-t-md ${
                  activeTab === "preview"
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setActiveTab("code")}
                className={`px-4 py-2 rounded-t-md ${
                  activeTab === "code"
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                Code
              </button>
              <button
                onClick={() => setActiveTab("chat")}
                className={`px-4 py-2 rounded-t-md flex items-center gap-1 ${
                  activeTab === "chat"
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                Chat
              </button>
            </div>
          </div>

          {activeTab === "preview" ? (
            useAdvancedGeneration ? (
              <WebsitePreviewAdvanced
                html={generatedCode.html}
                css={generatedCode.css}
                js={generatedCode.js}
                interactiveElements={generatedCode.interactiveElements}
                plan={generatedCode.plan}
                onEditImageRequest={handleEditImage}
                onReplaceImageRequest={handleReplaceImageRequest}
                onTextEdit={handleTextEdit}
                onApplyTheme={handleApplyTheme}
                iframeRef={iframeRef}
              />
            ) : (
              <WebsitePreview
                html={generatedCode.html}
                css={generatedCode.css}
                js={generatedCode.js}
                onEditImageRequest={handleEditImage}
                onReplaceImageRequest={handleReplaceImageRequest}
                onTextEdit={handleTextEdit}
                onApplyTheme={handleApplyTheme}
                iframeRef={iframeRef}
              />
            )
          ) : activeTab === "code" ? (
            <CodePreview
              html={generatedCode.html || ""}
              css={generatedCode.css || ""}
              js={generatedCode.js || ""}
              websiteTitle={getWebsiteTitle()}
            />
          ) : (
            <WebsiteChat
              generationId={generationId || ""}
              initialHtml={generatedCode.html}
              initialCss={generatedCode.css}
              initialJs={generatedCode.js}
              onCodeUpdate={handleCodeUpdate}
            />
          )}
        </div>
      )}

      {/* Gemini Edit Modal */}
      {geminiEditModalOpen && currentImageToEdit && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4">Edit Image with Gemini</h3>

            <div className="mb-4">
              <img
                src={currentImageToEdit.url || "/placeholder.svg"}
                alt="Image to edit"
                className="w-full h-auto max-h-64 object-contain mb-4 rounded"
              />

              <Textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="Describe how you want to edit this image (e.g., 'Add a blue sky background')"
                className="min-h-24 bg-gray-700 border-gray-600"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setGeminiEditModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleGeminiEdit}
                disabled={!editPrompt.trim() || isEditing}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isEditing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Editing...
                  </>
                ) : (
                  "Edit with Gemini"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Image Replacement Modal */}
      {imageReplacementModalOpen && currentImageToReplace && (
        <ImageReplacementModal
          isOpen={imageReplacementModalOpen}
          onClose={() => setImageReplacementModalOpen(false)}
          onImageSelect={(newImageUrl, source, sourceId) =>
            handleReplaceImage(newImageUrl, source as "pexels" | "gemini", sourceId)
          }
          imageId={currentImageToReplace.id}
          currentImageDescription={currentImageToReplace.alt}
        />
      )}

      {/* Status messages container */}
      {showStreamingOutput && (
        <div className="mt-8 w-full">
          <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">Generation Status</h3>
          <div
            ref={statusContainerRef}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-4 h-64 overflow-y-auto text-gray-800 dark:text-gray-200"
          >
            {statusMessages.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">Status messages will appear here during generation...</p>
            ) : (
              statusMessages.map((message, index) => (
                <div key={index} className="mb-1 text-sm">
                  {message}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

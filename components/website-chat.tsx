"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Send, Code, RefreshCw } from "lucide-react"
import { FileAttachment } from "./file-attachment"

interface WebsiteChatProps {
  generationId: string
  initialHtml: string
  initialCss: string
  initialJs: string
  onCodeUpdate: (html: string, css: string, js: string) => void
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  files?: File[]
  isStreaming?: boolean
  hasCodeChanges?: boolean
}

export function WebsiteChat({ generationId, initialHtml, initialCss, initialJs, onCodeUpdate }: WebsiteChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Your website has been generated! How would you like to improve it? I'll make targeted changes to the existing code based on your requests.",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [currentHtml, setCurrentHtml] = useState(initialHtml)
  const [currentCss, setCurrentCss] = useState(initialCss)
  const [currentJs, setCurrentJs] = useState(initialJs)
  const [codeUpdated, setCodeUpdated] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Log when code state changes
  useEffect(() => {
    console.log("Chat component code state updated:", {
      htmlLength: currentHtml.length,
      cssLength: currentCss.length,
      jsLength: currentJs.length,
    })
  }, [currentHtml, currentCss, currentJs])

  // Initialize current code state from props
  useEffect(() => {
    if (initialHtml && initialHtml !== currentHtml) setCurrentHtml(initialHtml)
    if (initialCss && initialCss !== currentCss) setCurrentCss(initialCss)
    if (initialJs && initialJs !== currentJs) setCurrentJs(initialJs)
  }, [initialHtml, initialCss, initialJs])

  // Verify code updates to ensure they're valid before applying
  const verifyAndApplyCodeUpdates = (updates: { html?: string; css?: string; js?: string }) => {
    let hasValidChanges = false
    let updatedHtml = currentHtml
    let updatedCss = currentCss
    let updatedJs = currentJs

    // Only update HTML if it's provided and not empty
    if (updates.html && updates.html.trim()) {
      // Basic validation - check if it contains at least some HTML structure
      if (updates.html.includes("<") && updates.html.includes(">")) {
        updatedHtml = updates.html
        hasValidChanges = true
        console.log("HTML update verified and applied")
      } else {
        console.warn("HTML update rejected - invalid structure")
      }
    }

    // Only update CSS if it's provided and not empty
    if (updates.css && updates.css.trim()) {
      // Basic validation - check if it contains CSS rules
      if (updates.css.includes("{") && updates.css.includes("}")) {
        updatedCss = updates.css
        hasValidChanges = true
        console.log("CSS update verified and applied")
      } else {
        console.warn("CSS update rejected - invalid structure")
      }
    }

    // Only update JS if it's provided and not empty
    if (updates.js && updates.js.trim()) {
      // Basic validation - just check if it's not empty
      updatedJs = updates.js
      hasValidChanges = true
      console.log("JS update verified and applied")
    }

    if (hasValidChanges) {
      // Update local state
      setCurrentHtml(updatedHtml)
      setCurrentCss(updatedCss)
      setCurrentJs(updatedJs)
      setCodeUpdated(true)

      // Update the preview via parent component
      onCodeUpdate(updatedHtml, updatedCss, updatedJs)
      return true
    }

    return false
  }

  // Handle sending a message to the AI
  const handleSendMessage = async () => {
    if (!input.trim() && attachedFiles.length === 0) return

    // Add user message to chat
    const userMessage: ChatMessage = {
      role: "user",
      content: input,
      files: attachedFiles.length > 0 ? [...attachedFiles] : undefined,
    }

    setMessages((prev) => [...prev, userMessage])

    // Add placeholder for assistant response
    const assistantPlaceholder: ChatMessage = {
      role: "assistant",
      content: "",
      isStreaming: true,
    }

    setMessages((prev) => [...prev, assistantPlaceholder])

    // Clear input and files
    setInput("")
    setAttachedFiles([])
    setIsLoading(true)

    try {
      // Process files if any
      const fileContents: { data: string; mimeType: string }[] = []

      if (attachedFiles.length > 0) {
        for (const file of attachedFiles) {
          const data = await readFileAsBase64(file)
          fileContents.push({
            data,
            mimeType: file.type,
          })
        }
      }

      // Prepare the request with the CURRENT code state (not the initial state)
      // Log the current code state to verify what's being sent
      console.log("Sending current code state to API:", {
        htmlLength: currentHtml.length,
        cssLength: currentCss.length,
        jsLength: currentJs.length,
      })

      const requestBody = {
        generationId,
        message: input,
        files: fileContents,
        currentCode: {
          html: currentHtml,
          css: currentCss,
          js: currentJs,
        },
      }

      // Call the API with streaming
      const response = await fetch("/api/chat-with-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) throw new Error("Response body is null")

      let accumulatedContent = ""
      const codeUpdates: { html?: string; css?: string; js?: string } = {}
      let hasCodeChanges = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // Decode the chunk
        const chunk = new TextDecoder().decode(value)

        // Split by newlines in case multiple JSON objects are in one chunk
        const lines = chunk.split("\n").filter((line) => line.trim() !== "")

        for (const line of lines) {
          try {
            // Parse the JSON line
            const data = JSON.parse(line)

            if (data.type === "content") {
              // Update the accumulated content
              accumulatedContent += data.content

              // Update the last message
              setMessages((prev) => {
                const newMessages = [...prev]
                newMessages[newMessages.length - 1].content = accumulatedContent
                return newMessages
              })
            } else if (data.type === "code") {
              // Store code updates
              if (data.html) {
                codeUpdates.html = data.html
                hasCodeChanges = true
              }
              if (data.css) {
                codeUpdates.css = data.css
                hasCodeChanges = true
              }
              if (data.js) {
                codeUpdates.js = data.js
                hasCodeChanges = true
              }
            } else if (data.type === "error") {
              // Handle error messages
              setMessages((prev) => {
                const newMessages = [...prev]
                newMessages[newMessages.length - 1].content = `Error: ${data.message || "An error occurred"}`
                newMessages[newMessages.length - 1].isStreaming = false
                return newMessages
              })
            }
          } catch (e) {
            console.error("Error parsing chunk:", e, "Raw line:", line)
          }
        }
      }

      // Apply code updates if any
      if (hasCodeChanges) {
        const codeUpdateApplied = verifyAndApplyCodeUpdates(codeUpdates)

        // Mark that this message had code changes if updates were applied
        if (codeUpdateApplied) {
          setMessages((prev) => {
            const newMessages = [...prev]
            newMessages[newMessages.length - 1].hasCodeChanges = true
            return newMessages
          })
        }
      }

      // Mark streaming as complete
      setMessages((prev) => {
        const newMessages = [...prev]
        newMessages[newMessages.length - 1].isStreaming = false
        return newMessages
      })
    } catch (error) {
      console.error("Error in chat:", error)

      // Update the last message with error
      setMessages((prev) => {
        const newMessages = [...prev]
        newMessages[newMessages.length - 1] = {
          role: "assistant",
          content: "Sorry, I encountered an error while processing your request. Please try again.",
        }
        return newMessages
      })
    } finally {
      setIsLoading(false)
    }
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

  // Function to refresh the preview with current code
  const handleRefreshPreview = () => {
    if (codeUpdated) {
      onCodeUpdate(currentHtml, currentCss, currentJs)
      setCodeUpdated(false)
    }
  }

  return (
    <div className="flex flex-col h-[600px] bg-gray-900 border border-gray-700 rounded-md overflow-hidden">
      <div className="p-4 border-b border-gray-800 bg-gray-800 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Code className="h-4 w-4" />
            Chat with AI to Refine Your Website
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            I'll make targeted changes to your existing code while preserving the overall structure.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="bg-gray-700 hover:bg-gray-600"
          onClick={handleRefreshPreview}
          disabled={!codeUpdated}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh Preview
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === "user" ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-100"
              }`}
            >
              {message.content ||
                (message.isStreaming && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                ))}

              {message.files && message.files.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/20 text-xs">
                  <p>Attached files:</p>
                  <ul className="list-disc pl-4 mt-1">
                    {message.files.map((file, i) => (
                      <li key={i}>{file.name}</li>
                    ))}
                  </ul>
                </div>
              )}

              {message.hasCodeChanges && (
                <div className="mt-2 pt-2 border-t border-emerald-500/30 text-xs text-emerald-400">
                  <div className="flex items-center gap-1">
                    <Code className="h-3 w-3" />
                    <span>Code updated and applied to preview</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-800 bg-gray-800">
        <FileAttachment onFilesSelected={setAttachedFiles} maxFiles={3} maxSizeInMB={10} />

        <div className="flex gap-2 mt-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe the changes you want to make to the website..."
            className="min-h-[80px] bg-gray-700 border-gray-600 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
          />

          <Button
            onClick={handleSendMessage}
            disabled={isLoading || (!input.trim() && attachedFiles.length === 0)}
            className="self-end bg-emerald-600 hover:bg-emerald-700"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

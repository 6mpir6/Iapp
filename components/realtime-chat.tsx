"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Send, Loader2, X, MessageSquare, ShoppingCart, Eye, Upload } from "lucide-react"
import { products } from "@/data/products"
import { useRouter } from "next/navigation"
import { knowledgeBase } from "@/lib/knowledge-base"
import { useTheme } from "@/components/theme-provider"

type Voice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" | "sage" | "ballad" | "coral" | "verse"

interface Message {
  role: "user" | "assistant"
  content: string
  id: string
  products?: string[] // Product IDs for recommendations
}

interface FunctionCallArguments {
  name: string
  arguments: any
  call_id: string
}

// Simple cart store
type CartItem = {
  id: string
  name: string
  price: number
  quantity: number
  imageUrl?: string
}

export default function RealtimeChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [selectedVoice, setSelectedVoice] = useState<Voice>("alloy")
  const [pendingFunctionCall, setPendingFunctionCall] = useState<FunctionCallArguments | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [cartNotification, setCartNotification] = useState(false)
  const [referencePhotoPromptSent, setReferencePhotoPromptSent] = useState(false)

  const { theme, setTheme } = useTheme()

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const microphoneStreamRef = useRef<MediaStream | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const router = useRouter()

  const voices: Voice[] = ["alloy", "echo", "fable", "onyx", "nova", "shimmer", "sage", "ballad", "coral", "verse"]

  // Function to scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, currentTranscript])

  // Initialize audio element
  useEffect(() => {
    if (!audioElementRef.current) {
      const audioEl = document.createElement("audio")
      audioEl.autoplay = true
      document.body.appendChild(audioEl)
      audioElementRef.current = audioEl
    }

    return () => {
      if (audioElementRef.current) {
        if (document.body.contains(audioElementRef.current)) {
          document.body.removeChild(audioElementRef.current)
        }
        audioElementRef.current = null
      }
    }
  }, [])

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem("cart")
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart))
      } catch (e) {
        console.error("Failed to parse cart from localStorage:", e)
      }
    }
  }, [])

  // Save cart to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cartItems))
  }, [cartItems])

  // Add to cart function
  const addToCart = (productId: string, quantity = 1) => {
    const product = products.find((p) => p.id === productId)
    if (!product) {
      console.error(`Product with ID ${productId} not found`)
      return false
    }

    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === productId)

      if (existingItem) {
        // Update quantity if item already exists
        return prevItems.map((item) => (item.id === productId ? { ...item, quantity: item.quantity + quantity } : item))
      } else {
        // Add new item
        return [
          ...prevItems,
          {
            id: product.id,
            name: product.name,
            price: product.price,
            quantity,
            imageUrl: product.imageUrl,
          },
        ]
      }
    })

    // Show notification
    setCartNotification(true)
    setTimeout(() => setCartNotification(false), 3000)

    return true
  }

  // Search products function with improved relevance
  const searchProducts = (query: string, category?: string, maxResults = 4) => {
    // Convert query to lowercase for case-insensitive matching
    const lowerQuery = query.toLowerCase()

    // Split query into keywords
    const keywords = lowerQuery.split(/\s+/).filter((k) => k.length > 2)

    // Score and filter products
    const scoredProducts = products
      .map((product) => {
        // Start with a base score
        let score = 0

        // Category match is a strong signal
        if (category && product.category.toLowerCase() === category.toLowerCase()) {
          score += 10
        }

        // Exact name match is the strongest signal
        if (product.name.toLowerCase().includes(lowerQuery)) {
          score += 20
        }

        // Description match is good too
        if (product.description?.toLowerCase().includes(lowerQuery)) {
          score += 5
        }

        // Count keyword matches in name and description
        keywords.forEach((keyword) => {
          if (product.name.toLowerCase().includes(keyword)) {
            score += 3
          }
          if (product.description?.toLowerCase().includes(keyword)) {
            score += 1
          }
        })

        return { product, score }
      })
      .filter((item) => item.score > 0) // Only keep products with some relevance
      .sort((a, b) => b.score - a.score) // Sort by descending score
      .slice(0, maxResults) // Take only the requested number of results
      .map((item) => item.product) // Extract just the product

    return scoredProducts
  }

  // Handle function calls
  const handleFunctionCall = useCallback(
    async (functionCall: FunctionCallArguments) => {
      setPendingFunctionCall(functionCall)

      let result = {}

      try {
        switch (functionCall.name) {
          case "recommend_products": {
            const { query, category, max = 4 } = JSON.parse(functionCall.arguments)
            const recommendedProducts = searchProducts(query, category, max)

            result = {
              product_ids: recommendedProducts.map((p) => p.id),
              success: recommendedProducts.length > 0,
              message:
                recommendedProducts.length > 0
                  ? `Found ${recommendedProducts.length} products matching "${query}"`
                  : `No products found matching "${query}"`,
            }
            break
          }

          case "add_to_cart": {
            const { product_id, quantity = 1 } = JSON.parse(functionCall.arguments)
            const success = addToCart(product_id, quantity)

            result = {
              success,
              message: success
                ? `Added ${quantity} of product ${product_id} to cart`
                : `Failed to add product ${product_id} to cart`,
            }
            break
          }

          case "initiate_checkout": {
            result = { success: true, message: "Redirecting to checkout" }
            router.push("/store/cart")
            break
          }

          case "start_visualization": {
            const { product_ids } = JSON.parse(functionCall.arguments)
            result = { success: true, message: `Starting visualization with products: ${product_ids.join(", ")}` }
            break
          }

          case "add_product_to_visualization": {
            const { product_id } = JSON.parse(functionCall.arguments)
            result = { success: true, message: `Added product ${product_id} to visualization` }
            break
          }

          case "change_product_color": {
            const { product_id, color } = JSON.parse(functionCall.arguments)
            result = { success: true, message: `Changed color of product ${product_id} to ${color}` }
            break
          }

          case "get_knowledge_base": {
            const { query: kbQuery } = JSON.parse(functionCall.arguments)
            const kbResult = knowledgeBase.find((item) => item.query.toLowerCase().includes(kbQuery.toLowerCase()))
            result = { answer: kbResult ? kbResult.answer : "No information found." }
            break
          }

          default:
            result = { error: "Unknown function" }
        }
      } catch (error) {
        console.error("Error executing function:", error)
        result = { error: "Function execution failed" }
      }

      // Send function result back to the model
      if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
        const event = {
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: functionCall.call_id,
            output: JSON.stringify(result),
          },
        }

        dataChannelRef.current.send(JSON.stringify(event))

        // Request a response from the model
        const responseEvent = {
          type: "response.create",
        }

        dataChannelRef.current.send(JSON.stringify(responseEvent))
      }

      setPendingFunctionCall(null)
    },
    [router],
  )

  // Handle WebRTC data channel messages
  const handleDataChannelMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        console.log("Received event:", data)

        switch (data.type) {
          case "session.created":
            console.log("Session created:", data)
            break

          case "input_audio_buffer.speech_started":
            setIsListening(true)
            break

          case "input_audio_buffer.speech_stopped":
            setIsListening(false)
            break

          case "conversation.item.input_audio_transcription.delta":
            setCurrentTranscript((prev) => prev + data.delta)
            break

          case "conversation.item.input_audio_transcription.completed":
            setCurrentTranscript("")
            setMessages((prev) => [...prev, { role: "user", content: data.transcript, id: data.item_id }])
            break

          case "response.text.delta":
            setIsSpeaking(true)
            setMessages((prev) => {
              const lastMessage = prev[prev.length - 1]

              // If the last message is from the assistant and has the same item_id, append to it
              if (lastMessage && lastMessage.role === "assistant" && lastMessage.id === data.item_id) {
                return [...prev.slice(0, -1), { ...lastMessage, content: lastMessage.content + data.delta }]
              } else {
                // Otherwise, create a new message
                return [...prev, { role: "assistant", content: data.delta, id: data.item_id }]
              }
            })
            break

          case "response.done":
            setIsSpeaking(false)

            // Check if there's a function call in the response
            if (data.response?.output?.length > 0) {
              const output = data.response.output[0]
              if (output.type === "function_call") {
                handleFunctionCall({
                  name: output.name,
                  arguments: output.arguments,
                  call_id: output.call_id,
                })
              }
            }

            // Check if there are product recommendations
            if (data.response?.product_ids) {
              setMessages((prev) => {
                if (prev.length === 0 || prev[prev.length - 1].role !== "assistant") return prev
                const lastMessage = prev[prev.length - 1]
                if (lastMessage.id === data.item_id) {
                  return [...prev.slice(0, -1), { ...lastMessage, products: data.response.product_ids }]
                }
                return prev
              })
            }
            break

          default:
            break
        }
      } catch (error) {
        console.error("Error parsing data channel message:", error, "Raw data:", event.data)
      }
    },
    [handleFunctionCall],
  )

  // Connect to the Realtime API
  const connect = async () => {
    try {
      setIsConnecting(true)

      // Get ephemeral token from our API
      const sessionResponse = await fetch("/api/realtime-session")
      if (!sessionResponse.ok) {
        const errorText = await sessionResponse.text()
        throw new Error(
          `Failed to get session token: ${sessionResponse.status} ${sessionResponse.statusText} - ${errorText}`,
        )
      }
      const sessionData = await sessionResponse.json()

      if (!sessionData.client_secret?.value) {
        throw new Error("Failed to get ephemeral token from session response")
      }

      const ephemeralToken = sessionData.client_secret.value

      // Create peer connection
      const pc = new RTCPeerConnection()
      peerConnectionRef.current = pc

      // Set up audio element to play remote audio
      pc.ontrack = (e) => {
        if (audioElementRef.current && e.streams && e.streams[0]) {
          audioElementRef.current.srcObject = e.streams[0]
        } else {
          console.warn("Audio element or stream not available for track event")
        }
      }

      // Create data channel
      const dc = pc.createDataChannel("oai-events")
      dataChannelRef.current = dc

      dc.onopen = () => {
        console.log("Data channel open")
        setIsConnected(true)
        setIsConnecting(false)

        // Update session with selected voice
        if (dc.readyState === "open") {
          const event = {
            type: "session.update",
            session: {
              voice: selectedVoice,
            },
          }
          dc.send(JSON.stringify(event))
        }
      }

      dc.onclose = () => {
        console.log("Data channel closed")
        disconnect()
      }

      dc.onerror = (error) => {
        console.error("Data channel error:", error)
        disconnect()
      }

      dc.onmessage = handleDataChannelMessage

      // Get microphone access
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        microphoneStreamRef.current = stream

        // Add audio track to peer connection
        stream.getAudioTracks().forEach((track) => {
          if (!pc.getSenders().find((s) => s.track?.kind === track.kind)) {
            pc.addTrack(track, stream)
          }
        })
      } catch (error) {
        console.error("Error accessing microphone:", error)
        alert("Microphone access is required for this application. Please grant permission and try connecting again.")
        pc.close()
        peerConnectionRef.current = null
        dataChannelRef.current = null
        setIsConnecting(false)
        return
      }

      // Create and set local description
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Send offer to OpenAI
      const baseUrl = "https://api.openai.com/v1/realtime"
      const model = "gpt-4o-realtime-preview"
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralToken}`,
          "Content-Type": "application/sdp",
          "OpenAI-Beta": "realtime=v1",
        },
      })

      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text()
        throw new Error(
          `Failed to send SDP offer to OpenAI: ${sdpResponse.status} ${sdpResponse.statusText} - ${errorText}`,
        )
      }

      // Set remote description
      const answerSdp = await sdpResponse.text()
      if (!answerSdp) {
        throw new Error("Received empty SDP answer from OpenAI")
      }
      const answer = {
        type: "answer",
        sdp: answerSdp,
      }

      await pc.setRemoteDescription(answer as RTCSessionDescriptionInit)
      console.log("WebRTC connection established successfully.")
    } catch (error) {
      console.error("Error connecting to Realtime API:", error)
      alert(`Failed to connect: ${error instanceof Error ? error.message : String(error)}`)
      disconnect()
      setIsConnecting(false)
    }
  }

  // Disconnect from the Realtime API
  const disconnect = () => {
    console.log("Disconnecting...")
    if (dataChannelRef.current) {
      dataChannelRef.current.onmessage = null
      dataChannelRef.current.onopen = null
      dataChannelRef.current.onclose = null
      dataChannelRef.current.onerror = null
      if (dataChannelRef.current.readyState === "open") {
        dataChannelRef.current.close()
      }
      dataChannelRef.current = null
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null
      peerConnectionRef.current.onicecandidate = null
      peerConnectionRef.current.onconnectionstatechange = null
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach((track) => track.stop())
      microphoneStreamRef.current = null
    }

    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current.srcObject = null
    }

    setIsConnected(false)
    setIsListening(false)
    setIsSpeaking(false)
    setIsConnecting(false)
  }

  // Send text message
  const sendMessage = () => {
    if (!input.trim() || !dataChannelRef.current || dataChannelRef.current.readyState !== "open") {
      console.warn("Cannot send message: Not connected or input is empty.")
      return
    }

    const message = input.trim()
    setInput("")

    const localId = `local_${Date.now()}`
    setMessages((prev) => [...prev, { role: "user", content: message, id: localId }])

    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: message,
          },
        ],
      },
    }

    dataChannelRef.current.send(JSON.stringify(event))

    const responseEvent = {
      type: "response.create",
    }

    dataChannelRef.current.send(JSON.stringify(responseEvent))
  }

  // Handle quick button clicks
  const handleQuickButtonClick = (message: string) => {
    setInput(message)
    // Focus the input field
    inputRef.current?.focus()
  }

  // Change voice
  const changeVoice = (voice: Voice) => {
    setSelectedVoice(voice)

    if (isConnected && dataChannelRef.current && dataChannelRef.current.readyState === "open") {
      console.log(`Updating voice to: ${voice}`)
      const event = {
        type: "session.update",
        session: {
          voice,
        },
      }
      dataChannelRef.current.send(JSON.stringify(event))
    }
  }

  // Navigate to product detail page
  const goToProductDetail = (productId: string) => {
    router.push(`/store/product/${productId}`)
  }

  // Clean up connection on component unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [])

  // Toggle chat visibility
  const toggleChat = () => {
    setIsMinimized(!isMinimized)
  }

  // Render product card
  const renderProductCard = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return null

    return (
      <div key={product.id} className="bg-gray-700 dark:bg-gray-800 rounded-lg overflow-hidden shadow-md">
        <div className="relative h-32 overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl || "/placeholder.svg"}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-600 flex items-center justify-center text-gray-400">No image</div>
          )}
          {product.badge && (
            <div className="absolute top-0 left-0 bg-emerald-600 text-white text-xs px-2 py-1">{product.badge}</div>
          )}
        </div>

        <div className="p-3">
          <h4 className="font-medium text-sm text-white mb-1 truncate">{product.name}</h4>
          <p className="text-gray-300 text-xs mb-2">${product.price.toFixed(2)}</p>

          <div className="flex flex-col gap-2">
            <div className="flex gap-1">
              <Button
                size="sm"
                className="flex-1 py-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                onClick={() => addToCart(product.id, 1)}
              >
                <ShoppingCart className="h-3 w-3 mr-1" />
                Add to Cart
              </Button>

              <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => goToProductDetail(product.id)}>
                <Eye className="h-3 w-3" />
              </Button>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => {
                setInput(`Visualize product ${product.name}`)
                inputRef.current?.focus()
              }}
            >
              Visualize Product
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Prompt for reference photo on initialization
  useEffect(() => {
    if (!isConnected && !referencePhotoPromptSent) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "To help me visualize products for you, could you upload a photo of yourself (for clothing) or your space (for decor)?",
          id: "reference_photo_prompt",
        },
      ])
      setReferencePhotoPromptSent(true)
    }
  }, [isConnected, referencePhotoPromptSent])

  // Handle file upload for reference photo
  const handleReferencePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      // Store the reference photo in local storage
      localStorage.setItem("referencePhoto", dataUrl)
      // Send a message to the chat
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: "Uploaded reference photo.",
          id: `reference_photo_${Date.now()}`,
        },
      ])
    }
    reader.readAsDataURL(file)
  }

  if (isMinimized) {
    return (
      <button
        onClick={toggleChat}
        className="fixed bottom-4 right-4 bg-emerald-600 text-white p-3 rounded-full shadow-lg hover:bg-emerald-700 transition-all duration-200 z-50"
        aria-label="Open chat assistant"
      >
        <MessageSquare className="h-6 w-6" />
        {cartNotification && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            +1
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="fixed bottom-0 right-0 m-4 w-full max-w-md bg-gray-900 dark:bg-gray-900 border border-gray-700 rounded-md overflow-hidden shadow-lg flex flex-col h-[500px] z-50">
      <div className="p-4 border-b border-gray-800 bg-gray-800 dark:bg-gray-800 flex justify-between items-center flex-shrink-0">
        <h3 className="text-sm font-medium text-white">E-commerce Assistant</h3>
        <div className="flex gap-2 items-center">
          <select
            value={selectedVoice}
            onChange={(e) => changeVoice(e.target.value as Voice)}
            disabled={!isConnected}
            className="bg-gray-700 text-white text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
          >
            {voices.map((v) => (
              <option key={v} value={v}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </option>
            ))}
          </select>

          {isConnected ? (
            <Button variant="destructive" size="sm" onClick={disconnect}>
              Disconnect
            </Button>
          ) : (
            <Button size="sm" onClick={connect} disabled={isConnecting}>
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </Button>
          )}

          <button
            onClick={() => setIsMinimized(true)}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close chat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-950 dark:bg-gray-950">
        {messages.map((message, index) => (
          <div
            key={message.id || index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 shadow ${
                message.role === "user" ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-100"
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.products && message.products.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium mb-2">Recommended Products:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {message.products.map((productId) => renderProductCard(productId))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {currentTranscript && (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-lg p-3 bg-emerald-600/50 text-white/80 italic">{currentTranscript}</div>
          </div>
        )}
        {isSpeaking && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-3 bg-gray-800/50 text-gray-100/80">
              <Loader2 className="h-4 w-4 animate-spin inline-block mr-1" /> Speaking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-800 bg-gray-800 dark:bg-gray-800 flex-shrink-0">
        <div className="flex gap-2 items-center mb-2">
          {isConnected && (
            <Button
              variant="outline"
              size="icon"
              className={`
                ${isListening ? "border-red-500 text-red-500 hover:bg-red-900/50" : "border-gray-600 text-gray-400 hover:bg-gray-700/50"}
                transition-colors duration-150
              `}
              title={isListening ? "Listening..." : "Mic Idle (Always on when connected)"}
              disabled={!isConnected}
            >
              {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
          )}

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder={isConnected ? "Type or speak..." : "Connect first..."}
            className="flex-1 px-4 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-700 text-white placeholder-gray-400 disabled:opacity-50"
            disabled={!isConnected || isConnecting}
          />

          <Button onClick={sendMessage} disabled={!isConnected || !input.trim() || isConnecting}>
            <Send className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickButtonClick("Find a product")}
            disabled={!isConnected}
            className="text-xs bg-gray-700 border-gray-600 hover:bg-gray-600"
          >
            Find a product
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickButtonClick("Visualize a product")}
            disabled={!isConnected}
            className="text-xs bg-gray-700 border-gray-600 hover:bg-gray-600"
          >
            Visualize a product
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickButtonClick("Customer support")}
            disabled={!isConnected}
            className="text-xs bg-gray-700 border-gray-600 hover:bg-gray-600"
          >
            Customer support
          </Button>
        </div>
        {!isConnected && (
          <>
            <input
              type="file"
              id="reference-photo-upload"
              className="hidden"
              accept="image/*"
              onChange={handleReferencePhotoUpload}
              ref={fileInputRef}
            />
            <label
              htmlFor="reference-photo-upload"
              className="inline-flex items-center px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors cursor-pointer mt-2 text-xs"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Reference Photo
            </label>
          </>
        )}
      </div>

      {/* Cart notification */}
      {cartNotification && (
        <div className="absolute top-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded shadow-lg animate-fade-in-out">
          Item added to cart!
        </div>
      )}
    </div>
  )
}

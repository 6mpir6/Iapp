"use client"

import type React from "react"

import { useRef, useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import type { AspectRatio } from "./types"
import { Paintbrush, Eraser, Undo, Redo, Check, X, Trash2 } from "lucide-react"

interface MaskEditorProps {
  imageUrl: string
  aspectRatio: AspectRatio
  onMaskApplied: (maskDataUrl: string) => void
  onCancel: () => void
  disabled?: boolean
}

export function MaskEditor({ imageUrl, aspectRatio, onMaskApplied, onCancel, disabled }: MaskEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushSize, setBrushSize] = useState(20)
  const [tool, setTool] = useState<"brush" | "eraser">("brush")
  const [history, setHistory] = useState<ImageData[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Calculate canvas dimensions based on aspect ratio
  const getCanvasDimensions = useCallback(() => {
    const maxWidth = 512 // Max canvas width
    const width = maxWidth
    let height: number

    if (aspectRatio === "16:9") {
      height = width * (9 / 16)
    } else if (aspectRatio === "9:16") {
      height = width * (16 / 9)
    } else {
      // 1:1
      height = width
    }

    return { width, height }
  }, [aspectRatio])

  const { width, height } = getCanvasDimensions()

  // Initialize canvas with image
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = width
    canvas.height = height

    // Fill with black (transparent in mask)
    ctx.fillStyle = "#000000"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Load the image
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = imageUrl
    img.onload = () => {
      // Draw the image semi-transparently as a reference
      ctx.globalAlpha = 0.3
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      ctx.globalAlpha = 1.0

      // Save initial state to history
      const initialState = ctx.getImageData(0, 0, canvas.width, canvas.height)
      setHistory([initialState])
      setHistoryIndex(0)
    }
  }, [imageUrl, width, height])

  // Drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    draw(e)
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)

    // Save current state to history
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height)

    // Remove any future states if we've gone back in history
    const newHistory = history.slice(0, historyIndex + 1)
    setHistory([...newHistory, currentState])
    setHistoryIndex(newHistory.length)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    ctx.lineWidth = brushSize
    ctx.lineCap = "round"
    ctx.strokeStyle = tool === "brush" ? "#ffffff" : "#000000" // White for brush, black for eraser

    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  // Handle touch events for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault() // Prevent scrolling while drawing
    setIsDrawing(true)

    const touch = e.touches[0]
    drawTouch(touch)
  }

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    stopDrawing()
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawing) return

    const touch = e.touches[0]
    drawTouch(touch)
  }

  const drawTouch = (touch: React.Touch) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top

    ctx.lineWidth = brushSize
    ctx.lineCap = "round"
    ctx.strokeStyle = tool === "brush" ? "#ffffff" : "#000000" // White for brush, black for eraser

    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  // Undo/Redo functions
  const undo = () => {
    if (historyIndex > 0) {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const newIndex = historyIndex - 1
      ctx.putImageData(history[newIndex], 0, 0)
      setHistoryIndex(newIndex)
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const newIndex = historyIndex + 1
      ctx.putImageData(history[newIndex], 0, 0)
      setHistoryIndex(newIndex)
    }
  }

  // Clear canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Fill with black (transparent in mask)
    ctx.fillStyle = "#000000"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Redraw the reference image
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = imageUrl
    img.onload = () => {
      ctx.globalAlpha = 0.3
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      ctx.globalAlpha = 1.0

      // Save to history
      const newState = ctx.getImageData(0, 0, canvas.width, canvas.height)
      setHistory([...history, newState])
      setHistoryIndex(history.length)
    }
  }

  // Generate mask
  const generateMask = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Create a new canvas for the mask only
    const maskCanvas = document.createElement("canvas")
    maskCanvas.width = width
    maskCanvas.height = height

    const maskCtx = maskCanvas.getContext("2d")
    if (!maskCtx) return

    // Copy the current canvas
    maskCtx.drawImage(canvas, 0, 0)

    // Get the mask as data URL
    const maskDataUrl = maskCanvas.toDataURL("image/png")
    onMaskApplied(maskDataUrl)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={tool === "brush" ? "default" : "outline"}
            onClick={() => setTool("brush")}
            className={`${tool === "brush" ? "bg-emerald-600" : ""} px-4 py-2`}
            disabled={disabled}
          >
            <Paintbrush className="h-4 w-4 mr-1" />
            Brush
          </Button>
          <Button
            size="sm"
            variant={tool === "eraser" ? "default" : "outline"}
            onClick={() => setTool("eraser")}
            className={`${tool === "eraser" ? "bg-emerald-600" : ""} px-4 py-2`}
            disabled={disabled}
          >
            <Eraser className="h-4 w-4 mr-1" />
            Eraser
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={undo}
            disabled={disabled || historyIndex <= 0}
            className="px-3 py-2"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={redo}
            disabled={disabled || historyIndex >= history.length - 1}
            className="px-3 py-2"
          >
            <Redo className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={clearCanvas} disabled={disabled} className="px-3 py-2">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <label className="text-sm">Brush Size:</label>
        <input
          type="range"
          min="1"
          max="50"
          value={brushSize}
          onChange={(e) => setBrushSize(Number.parseInt(e.target.value))}
          className="flex-1 h-7"
          disabled={disabled}
        />
        <span className="text-sm">{brushSize}px</span>
      </div>

      <div className="border border-gray-700 rounded-md overflow-hidden">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onMouseMove={draw}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          className={`w-full h-auto cursor-crosshair touch-none ${disabled ? "opacity-50 pointer-events-none" : ""}`}
        />
      </div>

      <div className="text-xs text-muted-foreground">
        <p>Paint white over the areas you want to edit. Black areas will remain unchanged.</p>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={disabled}>
          <X className="mr-1 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={generateMask} disabled={disabled} className="bg-emerald-600 hover:bg-emerald-700">
          <Check className="mr-1 h-4 w-4" />
          Apply Mask
        </Button>
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil, Trash2, ArrowLeft, ArrowRight, GripVertical } from "lucide-react"
import Image from "next/image"
import type { Scene } from "./types"

interface TimelineSceneProps {
  scene: Scene
  index: number
  onMove: (id: string, direction: "left" | "right") => void
  onDelete: (id: string) => void
  onCaptionChange: (id: string, caption: string) => void
  disabled?: boolean
  isDragging: boolean
  setIsDragging: (isDragging: boolean) => void
  isMobile: boolean
  isFirst: boolean
  isLast: boolean
}

export function TimelineScene({
  scene,
  index,
  onMove,
  onDelete,
  onCaptionChange,
  disabled,
  isDragging,
  setIsDragging,
  isMobile,
  isFirst,
  isLast,
}: TimelineSceneProps) {
  const [isEditingCaption, setIsEditingCaption] = useState(false)
  const [captionValue, setCaptionValue] = useState(scene.caption || "")

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: scene.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleStartEditCaption = () => {
    setCaptionValue(scene.caption || "")
    setIsEditingCaption(true)
  }

  const handleSaveCaption = () => {
    onCaptionChange(scene.id, captionValue)
    setIsEditingCaption(false)
  }

  const handleCancelEdit = () => {
    setIsEditingCaption(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex-shrink-0 w-36 flex flex-col gap-1 p-2 bg-white dark:bg-gray-800 rounded-md border ${
        isDragging ? "border-primary shadow-lg" : "border-gray-200 dark:border-gray-700"
      }`}
    >
      {/* Scene thumbnail & number */}
      <div className="relative w-full aspect-video border rounded overflow-hidden">
        <Image
          src={scene.imageUrl || "/placeholder.svg"}
          alt={`Scene ${index + 1}`}
          fill
          objectFit="cover"
          className="pointer-events-none"
          unoptimized
        />
        <div className="absolute top-0 left-0 bg-black bg-opacity-70 text-white text-xs px-1.5 py-0.5 rounded-br">
          {index + 1}
        </div>
        <Button
          variant="destructive"
          size="icon"
          onClick={() => onDelete(scene.id)}
          disabled={disabled}
          className="absolute top-0 right-0 h-6 w-6 rounded-bl"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Drag handle */}
      {!isMobile && (
        <div
          {...attributes}
          {...listeners}
          className="flex items-center justify-center h-6 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      {/* Caption display & edit */}
      <div className="min-h-[40px]">
        {isEditingCaption ? (
          <div className="space-y-1">
            <Input
              type="text"
              value={captionValue}
              onChange={(e) => setCaptionValue(e.target.value)}
              placeholder="Enter caption..."
              className="h-7 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveCaption()
                if (e.key === "Escape") handleCancelEdit()
              }}
            />
            <div className="flex justify-center gap-1">
              <Button size="sm" onClick={handleSaveCaption} className="h-6 px-2 text-xs">
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-6 px-2 text-xs">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1 group">
            {scene.caption ? (
              <p className="text-xs text-gray-700 dark:text-gray-300 w-full truncate" title={scene.caption}>
                <span className="text-xs text-blue-600 dark:text-blue-400 mr-1">📝</span>"{scene.caption}"
              </p>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic w-full truncate text-center">
                No caption (add for voiceover)
              </p>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={handleStartEditCaption}
              disabled={disabled}
              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Move controls */}
      <div className="flex justify-center space-x-1">
        <Button
          size="icon"
          variant="outline"
          onClick={() => onMove(scene.id, "left")}
          disabled={disabled || isFirst}
          className="h-6 w-6"
        >
          <ArrowLeft className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={() => onMove(scene.id, "right")}
          disabled={disabled || isLast}
          className="h-6 w-6"
        >
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

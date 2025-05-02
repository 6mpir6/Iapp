"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Paperclip, X, FileText, ImageIcon, FileVideo, File } from "lucide-react"

interface FileAttachmentProps {
  onFilesSelected: (files: File[]) => void
  acceptedFileTypes?: string
  maxFiles?: number
  maxSizeInMB?: number
  multiple?: boolean
}

export function FileAttachment({
  onFilesSelected,
  acceptedFileTypes = ".pdf,.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.txt,.md,.html,.css,.js",
  maxFiles = 5,
  maxSizeInMB = 20,
  multiple = true,
}: FileAttachmentProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    // Check if adding these files would exceed the max number
    if (selectedFiles.length + files.length > maxFiles) {
      setError(`You can only upload up to ${maxFiles} files`)
      return
    }

    // Check file sizes
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024
    const oversizedFiles = files.filter((file) => file.size > maxSizeInBytes)
    if (oversizedFiles.length > 0) {
      setError(`Some files exceed the ${maxSizeInMB}MB limit: ${oversizedFiles.map((f) => f.name).join(", ")}`)
      return
    }

    // Add files to state
    const newFiles = [...selectedFiles, ...files]
    setSelectedFiles(newFiles)
    onFilesSelected(newFiles)
    setError(null)

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles]
    newFiles.splice(index, 1)
    setSelectedFiles(newFiles)
    onFilesSelected(newFiles)
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />
    if (file.type.startsWith("video/")) return <FileVideo className="h-4 w-4" />
    if (file.type.startsWith("text/") || file.type.includes("javascript") || file.type.includes("css"))
      return <FileText className="h-4 w-4" />
    if (file.type === "application/pdf") return <FileText className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <Paperclip className="h-4 w-4" />
          Attach Files
        </Button>
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {selectedFiles.length > 0
            ? `${selectedFiles.length} file${selectedFiles.length !== 1 ? "s" : ""} selected`
            : `Max ${maxFiles} files, up to ${maxSizeInMB}MB each`}
        </span>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple={multiple}
        accept={acceptedFileTypes}
        className="hidden"
      />

      {error && <div className="text-red-500 text-xs mt-1 mb-2">{error}</div>}

      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 bg-gray-100 border border-gray-300 rounded-md px-3 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
            >
              {getFileIcon(file)}
              <span className="truncate max-w-[150px]">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

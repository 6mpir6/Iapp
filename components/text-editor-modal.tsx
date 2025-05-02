"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"

interface TextEditorModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (newText: string) => void
  initialText: string
  elementType?: string
}

export function TextEditorModal({ isOpen, onClose, onSave, initialText, elementType = "Text" }: TextEditorModalProps) {
  const [text, setText] = useState(initialText)
  const [isSaving, setIsSaving] = useState(false)

  // Reset text when modal opens with new initialText
  useEffect(() => {
    if (isOpen) {
      setText(initialText)
    }
  }, [isOpen, initialText])

  const handleSave = () => {
    setIsSaving(true)
    try {
      // Just use the text as is, without any formatting
      const formattedText = text.trim()
      console.log("Saving edited text:", formattedText)

      // Call onSave with the edited text
      onSave(formattedText)

      // Close the modal after saving
      setTimeout(() => {
        onClose()
      }, 500)
    } catch (error) {
      console.error("Error saving text:", error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {elementType}</DialogTitle>
          <DialogDescription>
            Edit the text content below. Changes will be applied to the website preview.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[150px] text-black" // Ensure text is black in the editor
            placeholder="Enter your text here..."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

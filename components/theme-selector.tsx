"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

// Define theme options
const themeOptions = [
  {
    id: "minimal",
    name: "Minimal",
    colors: {
      primary: "#000000", // black
      secondary: "#ffffff", // white
      accent: "#f0f0f0", // light gray
      background: "#f0f0f0",
      text: "#000000", // black
    },
  },
  {
    id: "dark",
    name: "Dark Mode",
    colors: {
      primary: "#ffffff", // white
      secondary: "#000000", // black
      accent: "#333333", // dark gray
      background: "#000000", // black
      text: "#ffffff", // white
    },
  },
  {
    id: "contrast",
    name: "High Contrast",
    colors: {
      primary: "#000000", // black
      secondary: "#ffffff", // white
      accent: "#ff0000", // red
      background: "#ffffff",
      text: "#000000", // black
    },
  },
  {
    id: "neutral",
    name: "Neutral",
    colors: {
      primary: "#333333", // dark gray
      secondary: "#f5f5f5", // light gray
      accent: "#999999", // medium gray
      background: "#f5f5f5",
      text: "#333333", // dark gray
    },
  },
]

interface ThemeSelectorProps {
  isOpen: boolean
  onClose: () => void
  onApplyTheme: (theme: (typeof themeOptions)[0]) => void
}

export function ThemeSelector({ isOpen, onClose, onApplyTheme }: ThemeSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState(themeOptions[0])
  const [isApplying, setIsApplying] = useState(false)

  const handleApplyTheme = () => {
    setIsApplying(true)
    try {
      onApplyTheme(selectedTheme)
      onClose()
    } catch (error) {
      console.error("Error applying theme:", error)
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-none border border-black">
        <DialogHeader>
          <DialogTitle className="text-xl tracking-tight">Theme</DialogTitle>
          <DialogDescription className="text-sm">Select a theme for your website.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 my-4">
          {themeOptions.map((theme) => (
            <div
              key={theme.id}
              className={`p-4 cursor-pointer transition-all border ${
                selectedTheme.id === theme.id ? "border-black" : "border-gray-300 hover:border-gray-500"
              }`}
              onClick={() => setSelectedTheme(theme)}
            >
              <div className="text-sm font-medium mb-2">{theme.name}</div>
              <div className="flex gap-2">
                <div className="w-6 h-6" style={{ backgroundColor: theme.colors.primary }} title="Primary"></div>
                <div className="w-6 h-6" style={{ backgroundColor: theme.colors.secondary }} title="Secondary"></div>
                <div className="w-6 h-6" style={{ backgroundColor: theme.colors.accent }} title="Accent"></div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border border-black bg-transparent text-black hover:bg-black hover:text-white"
          >
            Cancel
          </Button>
          <Button onClick={handleApplyTheme} disabled={isApplying} className="bg-black text-white">
            {isApplying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Applying...
              </>
            ) : (
              "Apply Theme"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

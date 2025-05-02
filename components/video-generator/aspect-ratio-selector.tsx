"use client"

import type React from "react"

import type { AspectRatio } from "./types"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Smartphone, MonitorSmartphone, Monitor } from "lucide-react"

interface AspectRatioSelectorProps {
  value: AspectRatio
  onChange: (value: AspectRatio) => void
  disabled?: boolean
}

export function AspectRatioSelector({ value, onChange, disabled }: AspectRatioSelectorProps) {
  return (
    <div className="space-y-2">
      <Label>Aspect Ratio</Label>
      <div className="flex gap-3">
        <AspectRatioButton
          ratio="16:9"
          label="Landscape"
          icon={Monitor}
          isSelected={value === "16:9"}
          onClick={() => onChange("16:9")}
          disabled={disabled}
        />
        <AspectRatioButton
          ratio="1:1"
          label="Square"
          icon={MonitorSmartphone}
          isSelected={value === "1:1"}
          onClick={() => onChange("1:1")}
          disabled={disabled}
        />
        <AspectRatioButton
          ratio="9:16"
          label="Portrait"
          icon={Smartphone}
          isSelected={value === "9:16"}
          onClick={() => onChange("9:16")}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

interface AspectRatioButtonProps {
  ratio: AspectRatio
  label: string
  icon: React.ComponentType<{ className?: string }>
  isSelected: boolean
  onClick: () => void
  disabled?: boolean
}

function AspectRatioButton({ ratio, label, icon: Icon, isSelected, onClick, disabled }: AspectRatioButtonProps) {
  return (
    <Button
      variant={isSelected ? "default" : "outline"}
      onClick={onClick}
      disabled={disabled}
      className="flex-1 flex-col py-3 h-auto gap-2"
    >
      <div className="relative">
        <Icon className="h-8 w-8 mx-auto" />
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-[10px] text-muted-foreground">{ratio}</span>
      </div>
    </Button>
  )
}

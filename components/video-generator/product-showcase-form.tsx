"use client"

import type React from "react"

import { useRef } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { ProductShowcaseData } from "./types"
import { Upload, X } from "lucide-react"
import Image from "next/image"

interface ProductShowcaseFormProps {
  data: {
    productName: string
    productDescription: string
    normalPrice: string
    discountedPrice: string
    cta: string
    website: string
    logoUrl?: string | null
  }
  onChange: (data: any) => void
  disabled: boolean
}

export function ProductShowcaseForm({ data, onChange, disabled }: ProductShowcaseFormProps) {
  const logoInputRef = useRef<HTMLInputElement>(null)

  const handleChange = (field: keyof ProductShowcaseData, value: string) => {
    onChange({
      ...data,
      [field]: value,
    })
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        onChange({
          ...data,
          logoUrl: event.target.result,
        })
      }
    }
    reader.readAsDataURL(file)

    // Reset the input
    if (logoInputRef.current) {
      logoInputRef.current.value = ""
    }
  }

  const removeLogo = () => {
    onChange({
      ...data,
      logoUrl: null,
    })
  }

  return (
    <div className="space-y-4 rounded-md border p-4 bg-gray-50 dark:bg-gray-800">
      <h3 className="text-sm font-medium">Product Details</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="product-name">
            Product Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="product-name"
            value={data.productName}
            onChange={(e) => handleChange("productName", e.target.value)}
            placeholder="e.g. Ultra Smart Watch"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-description">Description</Label>
          <Input
            id="product-description"
            value={data.productDescription}
            onChange={(e) => handleChange("productDescription", e.target.value)}
            placeholder="e.g. The perfect companion for your active lifestyle"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="normal-price">Regular Price</Label>
          <Input
            id="normal-price"
            value={data.normalPrice}
            onChange={(e) => handleChange("normalPrice", e.target.value)}
            placeholder="e.g. $199.99"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="discount-price">Sale Price</Label>
          <Input
            id="discount-price"
            value={data.discountedPrice}
            onChange={(e) => handleChange("discountedPrice", e.target.value)}
            placeholder="e.g. $149.99"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cta-text">Call to Action</Label>
          <Input
            id="cta-text"
            value={data.cta}
            onChange={(e) => handleChange("cta", e.target.value)}
            placeholder="e.g. Buy Now!"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website URL</Label>
          <Input
            id="website"
            value={data.website}
            onChange={(e) => handleChange("website", e.target.value)}
            placeholder="e.g. www.yourstore.com"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Brand Logo (Optional)</Label>
        <div className="flex items-center gap-3">
          {data.logoUrl ? (
            <div className="relative h-16 w-16 border rounded-md overflow-hidden bg-white">
              <Image
                src={data.logoUrl || "/placeholder.svg"}
                alt="Brand Logo"
                fill
                objectFit="contain"
                className="p-1"
                unoptimized
              />
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-0 right-0 h-5 w-5 rounded-bl"
                onClick={removeLogo}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => logoInputRef.current?.click()}
              disabled={disabled}
              className="h-16 w-16"
            >
              <Upload className="h-4 w-4" />
            </Button>
          )}
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">
              Upload your brand logo to display in the product showcase video. Transparent PNG recommended.
            </p>
          </div>
          <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
        </div>
      </div>
    </div>
  )
}

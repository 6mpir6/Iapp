export type AspectRatio = "16:9" | "9:16" | "1:1"

export type GenerationMode = "basic" | "advanced"

export type VideoTheme = "social-reel" | "product-showcase"

export interface ImageGenerationOptions {
  prompt: string
  negativePrompt?: string
  aspectRatio: AspectRatio
  mode: GenerationMode
}

export interface ImageEditOptions {
  imageUrl: string
  prompt: string
  maskUrl?: string
}

export interface Scene {
  id: string
  imageUrl: string
  caption?: string
  aspectRatio: AspectRatio
}

export interface ProductShowcaseData {
  productName: string
  productDescription: string
  normalPrice: string
  discountedPrice: string
  cta: string
  website: string
  logoUrl?: string | null
  voiceoverText?: string
}

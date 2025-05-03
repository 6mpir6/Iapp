export type AspectRatio = "16:9" | "9:16" | "1:1"

export type GenerationMode = "basic" | "advanced"

export type VideoTheme = "social-reel" | "product-showcase" | "movie" | "cinematic"

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
  isVideo?: boolean
  videoUrl?: string
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

export interface MovieGenerationData {
  prompt: string
  numberOfClips: number
  clipDuration: number
  transitionDuration: number
}

export interface CinematicData {
  description: string
  subtext: string
  brandName: string
  name: string
  email: string
  phoneNumber: string
}

export interface VideoGenerationOptions {
  scenes: Scene[]
  theme: VideoTheme
  productData?: ProductShowcaseData
  cinematicData?: CinematicData
}

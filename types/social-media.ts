export interface TikTokShareOptions {
  videoUrl: string
  caption: string
  asDraft?: boolean
}

export interface InstagramShareOptions {
  videoUrl: string
  thumbnailUrl?: string
  caption: string
  asReel?: boolean
  shareToFeed?: boolean
}

export interface ShareResult {
  success: boolean
  postId?: string
  postUrl?: string
  error?: string
}

export interface SocialMediaToken {
  id: string
  userId: string
  platform: "tiktok" | "instagram"
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  platformUserId: string
  createdAt: Date
  updatedAt: Date
}

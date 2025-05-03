"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { SocialAccountCard } from "./social-account-card"
import { getSocialAccounts, disconnectSocialAccount } from "@/actions/social-accounts"
import { Loader2 } from "lucide-react"

export interface SocialAccountInfo {
  platform: "tiktok" | "instagram" | "youtube" | "facebook" | "twitter"
  connected: boolean
  username?: string
  profileImage?: string
  accountType?: string
  connectedAt?: string
  lastUsed?: string
  stats?: {
    followers?: number
    posts?: number
  }
}

export function SocialAccountsManager() {
  const [accounts, setAccounts] = useState<SocialAccountInfo[]>([])
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()

  useEffect(() => {
    loadAccounts()

    // Check for connection status and errors from OAuth redirects
    const connected = searchParams.get("connected")
    const error = searchParams.get("error")

    if (connected) {
      toast({
        title: `${connected.charAt(0).toUpperCase() + connected.slice(1)} Connected`,
        description: `Your ${connected} account has been successfully connected.`,
        variant: "default",
      })
    }

    if (error) {
      toast({
        title: "Connection Error",
        description: decodeURIComponent(error),
        variant: "destructive",
      })
    }
  }, [searchParams])

  const loadAccounts = async () => {
    setLoading(true)
    try {
      const accountsData = await getSocialAccounts()
      setAccounts(accountsData)
    } catch (error) {
      console.error("Error loading social accounts:", error)
      toast({
        title: "Error",
        description: "Failed to load social media accounts",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async (platform: string) => {
    try {
      await disconnectSocialAccount(platform)
      toast({
        title: "Account Disconnected",
        description: `Your ${platform} account has been disconnected.`,
      })
      loadAccounts() // Refresh the accounts list
    } catch (error) {
      console.error(`Error disconnecting ${platform} account:`, error)
      toast({
        title: "Error",
        description: `Failed to disconnect ${platform} account`,
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <SocialAccountCard
          platform="tiktok"
          title="TikTok"
          description="Share videos directly to TikTok or as drafts"
          icon="/icons/tiktok-icon.png"
          accountInfo={accounts.find((a) => a.platform === "tiktok")}
          onDisconnect={() => handleDisconnect("tiktok")}
        />

        <SocialAccountCard
          platform="instagram"
          title="Instagram"
          description="Share videos to Instagram Reels and feed"
          icon="/icons/instagram-icon.svg"
          accountInfo={accounts.find((a) => a.platform === "instagram")}
          onDisconnect={() => handleDisconnect("instagram")}
        />
      </div>

      <div className="rounded-lg border border-dashed p-6 text-center">
        <h3 className="text-lg font-medium mb-2">More platforms coming soon</h3>
        <p className="text-muted-foreground">We're working on adding support for YouTube, Facebook, and Twitter.</p>
      </div>
    </div>
  )
}

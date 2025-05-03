"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LogIn, LogOut, ExternalLink, RefreshCw } from "lucide-react"
import Image from "next/image"
import { initiateTikTokAuth, initiateInstagramAuth } from "@/actions/social-media-share"
import type { SocialAccountInfo } from "./social-accounts-manager"
import { useState } from "react"
import { toast } from "@/components/ui/use-toast"
import { formatDistanceToNow } from "date-fns"

interface SocialAccountCardProps {
  platform: "tiktok" | "instagram" | "youtube" | "facebook" | "twitter"
  title: string
  description: string
  icon: string
  accountInfo?: SocialAccountInfo
  onDisconnect: () => Promise<void>
}

export function SocialAccountCard({
  platform,
  title,
  description,
  icon,
  accountInfo,
  onDisconnect,
}: SocialAccountCardProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  const isConnected = !!accountInfo?.connected

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      if (platform === "tiktok") {
        await initiateTikTokAuth()
      } else if (platform === "instagram") {
        await initiateInstagramAuth()
      } else {
        toast({
          title: "Not Implemented",
          description: `${title} integration is coming soon!`,
        })
        setIsConnecting(false)
      }
    } catch (error) {
      console.error(`Error connecting to ${platform}:`, error)
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : `Failed to connect to ${title}`,
        variant: "destructive",
      })
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    try {
      await onDisconnect()
    } finally {
      setIsDisconnecting(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <div className="relative h-6 w-6">
              <Image src={icon || "/placeholder.svg"} alt={title} fill className="object-contain" />
            </div>
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {isConnected && (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
          >
            Connected
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {isConnected && accountInfo ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {accountInfo.profileImage && (
                <div className="relative h-10 w-10 rounded-full overflow-hidden">
                  <Image
                    src={accountInfo.profileImage || "/placeholder.svg"}
                    alt={accountInfo.username || "Profile"}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div>
                <p className="font-medium">{accountInfo.username || "Unknown user"}</p>
                {accountInfo.accountType && <p className="text-xs text-muted-foreground">{accountInfo.accountType}</p>}
              </div>
            </div>

            {(accountInfo.stats?.followers !== undefined || accountInfo.stats?.posts !== undefined) && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                {accountInfo.stats.followers !== undefined && (
                  <div>
                    <p className="text-muted-foreground">Followers</p>
                    <p className="font-medium">{accountInfo.stats.followers.toLocaleString()}</p>
                  </div>
                )}
                {accountInfo.stats.posts !== undefined && (
                  <div>
                    <p className="text-muted-foreground">Posts</p>
                    <p className="font-medium">{accountInfo.stats.posts.toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}

            {accountInfo.connectedAt && (
              <p className="text-xs text-muted-foreground">
                Connected {formatDistanceToNow(new Date(accountInfo.connectedAt))} ago
              </p>
            )}
          </div>
        ) : (
          <div className="py-6 text-center text-muted-foreground">
            <p>Connect your {title} account to share content directly from Intel-Arts</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        {isConnected ? (
          <>
            <Button variant="outline" size="sm" className="gap-1" onClick={handleDisconnect} disabled={isDisconnecting}>
              {isDisconnecting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Disconnect
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => window.open(`https://${platform}.com`, "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
              Open {title}
            </Button>
          </>
        ) : (
          <Button className="w-full gap-1" onClick={handleConnect} disabled={isConnecting}>
            {isConnecting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Connect {title}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

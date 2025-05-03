"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Share2, CheckCircle2, XCircle, LogIn } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  shareToTikTok,
  shareToInstagram,
  initiateTikTokAuth,
  initiateInstagramAuth,
} from "@/actions/social-media-share"
import { useSearchParams } from "next/navigation"
import { toast } from "@/components/ui/use-toast"

interface SocialMediaShareProps {
  videoUrl: string | null
  thumbnailUrl?: string | null
  disabled?: boolean
}

export function SocialMediaShare({ videoUrl, thumbnailUrl, disabled = false }: SocialMediaShareProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("tiktok")
  const [isSharing, setIsSharing] = useState(false)
  const [shareResult, setShareResult] = useState<{
    success: boolean
    message: string
    url?: string
  } | null>(null)

  // Connection status
  const [tiktokConnected, setTiktokConnected] = useState<boolean | null>(null)
  const [instagramConnected, setInstagramConnected] = useState<boolean | null>(null)
  const [isCheckingConnections, setIsCheckingConnections] = useState(false)

  // TikTok state
  const [tiktokCaption, setTiktokCaption] = useState("")
  const [tiktokAsDraft, setTiktokAsDraft] = useState(true)

  // Instagram state
  const [instagramCaption, setInstagramCaption] = useState("")
  const [instagramAsReel, setInstagramAsReel] = useState(true)
  const [shareToFeed, setShareToFeed] = useState(true)

  const searchParams = useSearchParams()

  // Check for connection status and errors from OAuth redirects
  useEffect(() => {
    const connected = searchParams.get("connected")
    const error = searchParams.get("error")

    if (connected === "tiktok") {
      toast({
        title: "TikTok Connected",
        description: "Your TikTok account has been successfully connected.",
        variant: "default",
      })
      setTiktokConnected(true)
    } else if (connected === "instagram") {
      toast({
        title: "Instagram Connected",
        description: "Your Instagram account has been successfully connected.",
        variant: "default",
      })
      setInstagramConnected(true)
    }

    if (error) {
      toast({
        title: "Connection Error",
        description: decodeURIComponent(error),
        variant: "destructive",
      })
    }
  }, [searchParams])

  // Check connection status when dialog opens
  useEffect(() => {
    if (isOpen) {
      checkConnectionStatus()
    }
  }, [isOpen])

  const checkConnectionStatus = async () => {
    setIsCheckingConnections(true)
    try {
      // In a real implementation, you would call an API to check if the user has connected accounts
      // For now, we'll simulate this with a timeout
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // This would be replaced with actual API calls to check token validity
      setTiktokConnected(localStorage.getItem("tiktok_connected") === "true")
      setInstagramConnected(localStorage.getItem("instagram_connected") === "true")
    } catch (error) {
      console.error("Error checking connection status:", error)
    } finally {
      setIsCheckingConnections(false)
    }
  }

  const connectTikTok = async () => {
    try {
      await initiateTikTokAuth()
      // The page will redirect to TikTok's OAuth page
    } catch (error) {
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : "Failed to connect to TikTok",
        variant: "destructive",
      })
    }
  }

  const connectInstagram = async () => {
    try {
      await initiateInstagramAuth()
      // The page will redirect to Facebook's OAuth page
    } catch (error) {
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : "Failed to connect to Instagram",
        variant: "destructive",
      })
    }
  }

  const handleShare = async () => {
    if (!videoUrl) return

    setIsSharing(true)
    setShareResult(null)

    try {
      if (activeTab === "tiktok") {
        const result = await shareToTikTok({
          videoUrl,
          caption: tiktokCaption,
          asDraft: tiktokAsDraft,
        })

        setShareResult({
          success: result.success,
          message: result.success
            ? tiktokAsDraft
              ? "Video uploaded to TikTok drafts! Open the TikTok app to edit and publish."
              : "Video published to TikTok successfully!"
            : result.error || "Failed to share to TikTok",
          url: result.postUrl,
        })
      } else {
        const result = await shareToInstagram({
          videoUrl,
          thumbnailUrl: thumbnailUrl || undefined,
          caption: instagramCaption,
          asReel: instagramAsReel,
          shareToFeed,
        })

        setShareResult({
          success: result.success,
          message: result.success
            ? `Video published to Instagram ${instagramAsReel ? "Reels" : "feed"} successfully!`
            : result.error || "Failed to share to Instagram",
          url: result.postUrl,
        })
      }
    } catch (error) {
      setShareResult({
        success: false,
        message: error instanceof Error ? error.message : "An unknown error occurred",
      })
    } finally {
      setIsSharing(false)
    }
  }

  const resetForm = () => {
    setShareResult(null)
    setTiktokCaption("")
    setInstagramCaption("")
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      resetForm()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={disabled || !videoUrl}>
          <Share2 className="h-4 w-4" />
          Share to Social Media
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share to Social Media</DialogTitle>
          <DialogDescription>Share your video directly to TikTok or Instagram</DialogDescription>
        </DialogHeader>

        {shareResult ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-4">
            {shareResult.success ? (
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            ) : (
              <XCircle className="h-16 w-16 text-red-500" />
            )}
            <p className="text-center">{shareResult.message}</p>
            {shareResult.success && shareResult.url && (
              <Button variant="outline" onClick={() => window.open(shareResult.url, "_blank")}>
                View Post
              </Button>
            )}
            <Button onClick={() => setShareResult(null)}>Share Again</Button>
          </div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tiktok">TikTok</TabsTrigger>
                <TabsTrigger value="instagram">Instagram</TabsTrigger>
              </TabsList>

              <TabsContent value="tiktok" className="space-y-4 py-4">
                {isCheckingConnections ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : tiktokConnected ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="tiktok-caption">Caption</Label>
                      <Textarea
                        id="tiktok-caption"
                        placeholder="Add a caption for your TikTok video..."
                        value={tiktokCaption}
                        onChange={(e) => setTiktokCaption(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Add hashtags to increase visibility</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch id="tiktok-draft" checked={tiktokAsDraft} onCheckedChange={setTiktokAsDraft} />
                      <Label htmlFor="tiktok-draft">Upload as draft (recommended)</Label>
                    </div>

                    {!tiktokAsDraft && (
                      <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-200">
                        <p>
                          Direct posting requires additional app permissions. If your account doesn't have these
                          permissions, the video will be uploaded as a draft instead.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <p className="text-center text-muted-foreground">
                      Connect your TikTok account to share videos directly from this app.
                    </p>
                    <Button onClick={connectTikTok} className="gap-2">
                      <LogIn className="h-4 w-4" />
                      Connect TikTok Account
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="instagram" className="space-y-4 py-4">
                {isCheckingConnections ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : instagramConnected ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="instagram-caption">Caption</Label>
                      <Textarea
                        id="instagram-caption"
                        placeholder="Add a caption for your Instagram post..."
                        value={instagramCaption}
                        onChange={(e) => setInstagramCaption(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Add hashtags to increase visibility</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch id="instagram-reel" checked={instagramAsReel} onCheckedChange={setInstagramAsReel} />
                      <Label htmlFor="instagram-reel">Post as Reel (instead of feed video)</Label>
                    </div>

                    {instagramAsReel && (
                      <div className="flex items-center space-x-2">
                        <Switch id="instagram-feed" checked={shareToFeed} onCheckedChange={setShareToFeed} />
                        <Label htmlFor="instagram-feed">Also share to feed</Label>
                      </div>
                    )}

                    <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-3 text-sm text-blue-800 dark:text-blue-200">
                      <p>
                        Instagram requires a Business or Creator account connected to a Facebook Page. Make sure your
                        account is properly set up.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <p className="text-center text-muted-foreground">
                      Connect your Instagram Business account to share videos directly from this app.
                    </p>
                    <Button onClick={connectInstagram} className="gap-2">
                      <LogIn className="h-4 w-4" />
                      Connect Instagram Account
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                onClick={handleShare}
                disabled={
                  isSharing ||
                  (activeTab === "tiktok" && !tiktokConnected) ||
                  (activeTab === "instagram" && !instagramConnected)
                }
                className="w-full"
              >
                {isSharing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sharing...
                  </>
                ) : (
                  <>Share to {activeTab === "tiktok" ? "TikTok" : "Instagram"}</>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

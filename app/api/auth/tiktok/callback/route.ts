import { type NextRequest, NextResponse } from "next/server"
import { handleTikTokCallback } from "@/actions/social-media-share"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get("code")
    const state = searchParams.get("state")

    if (!code || !state) {
      return NextResponse.redirect(new URL("/video-generator?error=missing_params", request.url))
    }

    await handleTikTokCallback(code, state)

    // Redirect back to the video generator page with success message
    return NextResponse.redirect(new URL("/video-generator?connected=tiktok", request.url))
  } catch (error) {
    console.error("TikTok callback error:", error)
    return NextResponse.redirect(
      new URL(
        `/video-generator?error=${encodeURIComponent(
          error instanceof Error ? error.message : "Failed to connect TikTok account",
        )}`,
        request.url,
      ),
    )
  }
}

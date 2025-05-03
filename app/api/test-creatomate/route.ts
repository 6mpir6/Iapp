import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.CREATOMATE_API_KEY

    if (!apiKey) {
      return NextResponse.json({ success: false, error: "Missing Creatomate API Key" }, { status: 500 })
    }

    // Test a simple API call to Creatomate
    const response = await fetch("https://api.creatomate.com/v1/templates", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store", // Prevent caching
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        {
          success: false,
          status: response.status,
          statusText: response.statusText,
          error: `API error: ${response.status} - ${errorText}`,
        },
        { status: 502 },
      )
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      templateCount: Array.isArray(data) ? data.length : "unknown",
    })
  } catch (error) {
    console.error("Error testing Creatomate connection:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    )
  }
}

"use server"

import { headers } from "next/headers"

export async function debugCreatomateRequest() {
  try {
    const apiKey = process.env.CREATOMATE_API_KEY

    if (!apiKey) {
      return {
        success: false,
        error: "Missing Creatomate API Key",
        environment: process.env.NODE_ENV,
        isServer: typeof window === "undefined",
      }
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

    const headersList = headers()
    const userAgent = headersList.get("user-agent") || "unknown"

    if (!response.ok) {
      let errorText = await response.text()
      try {
        const errorJson = JSON.parse(errorText)
        errorText = JSON.stringify(errorJson)
      } catch (e) {
        // Keep errorText as is if it's not JSON
      }

      return {
        success: false,
        status: response.status,
        statusText: response.statusText,
        error: `API error: ${response.status} - ${errorText}`,
        headers: Object.fromEntries(response.headers.entries()),
        environment: process.env.NODE_ENV,
        userAgent,
        isServer: typeof window === "undefined",
      }
    }

    const data = await response.json()

    return {
      success: true,
      templateCount: Array.isArray(data) ? data.length : "unknown",
      environment: process.env.NODE_ENV,
      userAgent,
      isServer: typeof window === "undefined",
    }
  } catch (error) {
    console.error("Error testing Creatomate connection:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      stack: error instanceof Error ? error.stack : undefined,
      environment: process.env.NODE_ENV,
      isServer: typeof window === "undefined",
    }
  }
}

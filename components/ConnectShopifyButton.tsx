"use client"

import { useState } from "react"
import { connectShopifyStore } from "@/actions/connect-shopify"
import { useRouter } from "next/navigation"

export default function ConnectShopifyButton() {
  const [shop, setShop] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleConnect = async () => {
    if (!shop) {
      setError("Please enter your Shopify store domain")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Use the server action to get the redirect URL
      const redirectUrl = await connectShopifyStore(shop)
      // Navigate to the auth URL
      router.push(redirectUrl)
    } catch (err: any) {
      setError(err.message || "Failed to connect to Shopify")
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
        <input
          type="text"
          placeholder="your-store.myshopify.com"
          value={shop}
          onChange={(e) => setShop(e.target.value)}
          className="p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
          disabled={isLoading}
        />
        <button
          onClick={handleConnect}
          disabled={isLoading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {isLoading ? "Connecting..." : "Connect Shopify Store"}
        </button>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  )
}

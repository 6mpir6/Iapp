"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ShoppingCart } from "lucide-react"

interface CheckoutButtonProps {
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  hasItems?: boolean
}

export function CheckoutButton({
  variant = "default",
  size = "default",
  className = "",
  hasItems = true,
}: CheckoutButtonProps) {
  const router = useRouter()

  const handleCheckout = () => {
    router.push("/store/checkout")
  }

  return (
    <Button variant={variant} size={size} className={className} onClick={handleCheckout} disabled={!hasItems}>
      <ShoppingCart className="h-4 w-4 mr-2" />
      Checkout
    </Button>
  )
}

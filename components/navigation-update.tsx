"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"

export function NavigationUpdate() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // If someone tries to access the image-generator page, redirect them to video-generator
    if (pathname === "/image-generator") {
      router.replace("/video-generator")
    }
  }, [pathname, router])

  return null
}

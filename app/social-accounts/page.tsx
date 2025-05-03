import type { Metadata } from "next"
import { SocialAccountsManager } from "@/components/social-accounts/social-accounts-manager"

export const metadata: Metadata = {
  title: "Manage Social Media Accounts | Intel-Arts",
  description: "Connect and manage your social media accounts for seamless content sharing",
}

export default function SocialAccountsPage() {
  return (
    <div className="container max-w-5xl py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Social Media Accounts</h1>
        <p className="text-muted-foreground">
          Connect your social media accounts to share content directly from Intel-Arts
        </p>
      </div>

      <SocialAccountsManager />
    </div>
  )
}

import { Skeleton } from "@/components/ui/skeleton"

export default function SocialAccountsLoading() {
  return (
    <div className="container max-w-5xl py-8 space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-10 w-[250px]" />
        <Skeleton className="h-5 w-[450px]" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-[220px] rounded-xl" />
        ))}
      </div>
    </div>
  )
}

import { Skeleton } from "@ship-happens/ui/components/skeleton"

export default function AppLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-4 md:py-6 lg:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="overflow-hidden rounded-[6px] border border-border">
        <div className="border-b border-border px-3 py-2.5">
          <Skeleton className="h-3 w-full max-w-md" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex h-[42px] items-center gap-4 border-b border-border px-3 last:border-b-0"
          >
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    </div>
  )
}

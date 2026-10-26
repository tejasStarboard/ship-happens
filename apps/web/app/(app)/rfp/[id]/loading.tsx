import { Skeleton } from "@workspace/ui/components/skeleton"

export default function RfpDetailLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      <Skeleton className="h-10 w-full max-w-xl" />
      <div className="flex gap-4 border-b border-border pb-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-12" />
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-5 w-14" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-[6px]" />
        <Skeleton className="h-24 rounded-[6px]" />
        <Skeleton className="h-24 rounded-[6px]" />
      </div>
      <Skeleton className="min-h-[240px] w-full rounded-[6px]" />
    </div>
  )
}

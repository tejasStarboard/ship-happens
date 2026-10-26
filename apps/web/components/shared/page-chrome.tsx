import type { ReactNode } from "react"
import { cn } from "@ship-happens/ui/lib/utils"

/** Shared list/settings page header — title 26/700, muted subtitle, actions right. */
export function PageChrome({
  title,
  description,
  actions,
  meta,
  children,
  className,
}: {
  title: string
  description?: string
  actions?: ReactNode
  meta?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-6 overflow-auto py-4 md:py-6",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 lg:px-6">
        <div className="flex min-w-0 flex-col gap-2">
          <div>
            <h1 className="font-heading text-[26px] leading-tight font-semibold tracking-tight">
              {title}
            </h1>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {meta}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
      {children ? <div className="px-4 lg:px-6">{children}</div> : null}
    </div>
  )
}

/** Flat table shell — no zebra header band wash; hairline border only. */
export function DataTableShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-none",
        className
      )}
    >
      {children}
    </div>
  )
}

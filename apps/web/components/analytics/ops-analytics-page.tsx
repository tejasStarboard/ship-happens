"use client"

import type { ReactNode } from "react"
import type { OpsAnalyticsView } from "@ship-happens/fill/browser"
import { PageChrome } from "@/components/shared/page-chrome"

function formatDuration(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms)) return "—"
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`
  if (ms < 3_600_000) {
    const mins = ms / 60_000
    return mins < 10 ? `${mins.toFixed(1)}m` : `${Math.round(mins)}m`
  }
  const hours = ms / 3_600_000
  return hours < 10 ? `${hours.toFixed(1)}h` : `${Math.round(hours)}h`
}

function formatWindowLabel(view: OpsAnalyticsView): string {
  const start = new Date(view.windowStartedAt)
  return `Last ${view.windowDays} days · since ${start.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  )}`
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 border-b border-border pb-4 last:border-0 last:pr-0 last:pb-0 sm:border-r sm:border-b-0 sm:pr-6 sm:pb-0">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="font-heading text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function BarRow({
  label,
  count,
  max,
}: {
  label: string
  count: number
  max: number
}) {
  const width = max > 0 ? Math.max((count / max) * 100, count > 0 ? 4 : 0) : 0
  return (
    <div className="grid grid-cols-[minmax(0,7rem)_1fr_2.5rem] items-center gap-3">
      <span className="truncate text-sm text-muted-foreground">{label}</span>
      <div className="h-2 overflow-hidden rounded-sm bg-muted">
        <div
          className="h-full rounded-sm bg-foreground/80"
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="text-right text-sm text-foreground tabular-nums">
        {count}
      </span>
    </div>
  )
}

function Section({
  title,
  description,
  children,
  empty,
}: {
  title: string
  description?: string
  children: ReactNode
  empty?: boolean
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {empty ? (
        <p className="text-sm text-muted-foreground">No data in this window.</p>
      ) : (
        children
      )}
    </section>
  )
}

export function OpsAnalyticsPage({ view }: { view: OpsAnalyticsView }) {
  const funnelMax = Math.max(0, ...view.statusFunnel.map((b) => b.count))
  const agingMax = Math.max(
    0,
    ...view.openReviewAging.buckets.map((b) => b.count)
  )
  const eventMax = Math.max(0, ...view.lifecycleEvents.map((b) => b.count))
  const isEmpty = view.fillCount === 0

  return (
    <PageChrome
      title="Analytics"
      description="Fill ops for the active organization — status funnel, time-to-done, open review aging, and failure reasons."
      meta={
        <p className="text-xs text-muted-foreground">
          {formatWindowLabel(view)}
        </p>
      }
    >
      {isEmpty ? (
        <div className="mx-4 rounded-[6px] border border-dashed border-border px-6 py-12 text-center lg:mx-6">
          <p className="text-sm font-medium text-foreground">
            No fills in the last {view.windowDays} days
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a fill from the Fill desk or email intake. Lifecycle events
            and funnel metrics will show up here as work completes.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-10 px-4 lg:px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Fills"
              value={String(view.fillCount)}
              hint="Created in window"
            />
            <MetricCard
              label="Time to done (p50)"
              value={formatDuration(view.timeToDoneMs.p50)}
              hint={
                view.timeToDoneMs.sampleSize > 0
                  ? `${view.timeToDoneMs.sampleSize} completed`
                  : "No completed fills yet"
              }
            />
            <MetricCard
              label="Time to done (p90)"
              value={formatDuration(view.timeToDoneMs.p90)}
              hint={
                view.timeToDoneMs.sampleSize > 0
                  ? "Start → completed"
                  : undefined
              }
            />
            <MetricCard
              label="Open reviews"
              value={String(view.openReviewAging.totalPending)}
              hint="Pending HITL waits"
            />
          </div>

          <div className="grid gap-10 lg:grid-cols-2">
            <Section
              title="Status funnel"
              description="Fill counts by current status in this window."
              empty={funnelMax === 0}
            >
              <div className="flex flex-col gap-2.5">
                {view.statusFunnel.map((bucket) => (
                  <BarRow
                    key={bucket.status}
                    label={bucket.label}
                    count={bucket.count}
                    max={funnelMax}
                  />
                ))}
              </div>
            </Section>

            <Section
              title="Open review aging"
              description="How long pending review waits have been open (all fills)."
              empty={view.openReviewAging.totalPending === 0}
            >
              <div className="flex flex-col gap-2.5">
                {view.openReviewAging.buckets.map((bucket) => (
                  <BarRow
                    key={bucket.key}
                    label={bucket.label}
                    count={bucket.count}
                    max={agingMax}
                  />
                ))}
              </div>
            </Section>

            <Section
              title="Lifecycle events"
              description="Durable milestones emitted as fills move through the pipeline."
              empty={eventMax === 0}
            >
              <div className="flex flex-col gap-2.5">
                {view.lifecycleEvents.map((bucket) => (
                  <BarRow
                    key={bucket.type}
                    label={bucket.label}
                    count={bucket.count}
                    max={eventMax}
                  />
                ))}
              </div>
            </Section>

            <Section
              title="Top failure reasons"
              description="Most common error messages on failed fills."
              empty={view.topFailureReasons.length === 0}
            >
              <ul className="flex flex-col gap-3">
                {view.topFailureReasons.map((row) => (
                  <li
                    key={row.reason}
                    className="flex items-start justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <span className="min-w-0 flex-1 text-sm text-foreground">
                      {row.reason}
                    </span>
                    <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        </div>
      )}
    </PageChrome>
  )
}

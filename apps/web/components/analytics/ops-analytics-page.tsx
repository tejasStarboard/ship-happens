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

function formatPct(rate: number | null): string {
  if (rate == null || !Number.isFinite(rate)) return "—"
  return `${Math.round(rate * 100)}%`
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
  const rateMax = Math.max(0, ...view.rateCoverage.mix.map((b) => b.count))
  const marginBucketMax = Math.max(
    0,
    ...view.marginImpact.marginPctBuckets.map((b) => b.count)
  )
  const mappingSourceMax = Math.max(
    0,
    ...view.mappingQuality.resolutionSources.map((b) => b.count)
  )
  const marginSectionEmpty =
    view.marginImpact.floorBreachReviews === 0 &&
    view.marginImpact.markupCells === 0 &&
    view.marginImpact.projectedCells === 0
  const mappingSectionEmpty =
    view.mappingQuality.confirmedLanes === 0 &&
    view.mappingQuality.agentOnlyPending === 0 &&
    view.mappingQuality.mapReviewsDecided === 0
  const bid = view.bidConversion
  const bidMixMax = Math.max(0, ...bid.outcomeMix.map((b) => b.count))
  const dueAgingMax = Math.max(0, ...bid.dueAging.buckets.map((b) => b.count))
  const bidSectionEmpty = bid.decidedCount === 0 && bid.dueAging.withDue === 0
  const isEmpty = view.fillCount === 0

  return (
    <PageChrome
      title="Analytics"
      description="Fill ops, bid conversion, rate coverage, margins, and mapping quality for the active organization."
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
            Create a fill from the Fill desk or email intake. Funnel, bid
            conversion, rate coverage, and mapping metrics will show up here as
            work completes.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-10 px-4 lg:px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard
              label="Fills"
              value={String(view.fillCount)}
              hint="Created in window"
            />
            <MetricCard
              label="Win rate"
              value={formatPct(bid.winRate)}
              hint={
                bid.won + bid.lost > 0
                  ? `${bid.won} won · ${bid.lost} lost`
                  : "No won/lost yet"
              }
            />
            <MetricCard
              label="Decided"
              value={String(bid.decidedCount)}
              hint="Outcomes in window"
            />
            <MetricCard
              label="Overdue"
              value={String(bid.dueAging.overdue)}
              hint={
                bid.dueAging.withDue > 0
                  ? `${bid.dueAging.withDue} with due date`
                  : "No open due dates"
              }
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
              label="Open reviews"
              value={String(view.openReviewAging.totalPending)}
              hint="Pending HITL waits"
            />
          </div>

          <div className="grid gap-10 lg:grid-cols-2">
            <Section
              title="Bid conversion"
              description="Decided outcomes in this window (win rate = won ÷ won+lost). Due aging covers open overdue fills."
              empty={bidSectionEmpty}
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2.5">
                  {bid.outcomeMix.map((bucket) => (
                    <BarRow
                      key={bucket.key}
                      label={bucket.label}
                      count={bucket.count}
                      max={bidMixMax}
                    />
                  ))}
                </div>
                {bid.dueAging.overdue > 0 ? (
                  <div className="flex flex-col gap-2.5">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Overdue aging
                    </p>
                    {bid.dueAging.buckets.map((bucket) => (
                      <BarRow
                        key={bucket.key}
                        label={bucket.label}
                        count={bucket.count}
                        max={dueAgingMax}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No overdue fills with a due date.
                  </p>
                )}
              </div>
            </Section>

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

          <div className="grid gap-10 lg:grid-cols-2">
            <Section
              title="Rate coverage"
              description="Contract hit vs skip vs overlay-only on fill report cells (fill resolve is contract-only)."
              empty={view.rateCoverage.laneCellCount === 0}
            >
              <div className="flex flex-col gap-4">
                <p className="text-xs text-muted-foreground">
                  {view.rateCoverage.laneCellCount} lane cell
                  {view.rateCoverage.laneCellCount === 1 ? "" : "s"} in window
                </p>
                <div className="flex flex-col gap-2.5">
                  {view.rateCoverage.mix.map((bucket) => (
                    <BarRow
                      key={bucket.key}
                      label={bucket.label}
                      count={bucket.count}
                      max={rateMax}
                    />
                  ))}
                </div>
              </div>
            </Section>

            <Section
              title="Margins & overlay"
              description="Floor-margin review opens, markup vs projected overlay cells, and margin % mix on markup lanes."
              empty={marginSectionEmpty}
            >
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <MetricCard
                    label="Floor breaches"
                    value={String(view.marginImpact.floorBreachReviews)}
                    hint="margin-floor reviews"
                  />
                  <MetricCard
                    label="Markup cells"
                    value={String(view.marginImpact.markupCells)}
                  />
                  <MetricCard
                    label="Projected cells"
                    value={String(view.marginImpact.projectedCells)}
                    hint="Overlay-only sell"
                  />
                </div>
                {marginBucketMax > 0 ? (
                  <div className="flex flex-col gap-2.5">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Margin % (markup)
                    </p>
                    {view.marginImpact.marginPctBuckets.map((bucket) => (
                      <BarRow
                        key={bucket.key}
                        label={bucket.label}
                        count={bucket.count}
                        max={marginBucketMax}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </Section>

            <Section
              title="Mapping quality"
              description="Confirmed lanes vs pending agent map proposals, HITL correction rate, and proposal source mix."
              empty={mappingSectionEmpty}
            >
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <MetricCard
                    label="Confirmed lanes"
                    value={String(view.mappingQuality.confirmedLanes)}
                  />
                  <MetricCard
                    label="Agent-only pending"
                    value={String(view.mappingQuality.agentOnlyPending)}
                    hint="Open map reviews"
                  />
                  <MetricCard
                    label="HITL corrections"
                    value={String(view.mappingQuality.hitlCorrections)}
                    hint="Edited map reviews"
                  />
                  <MetricCard
                    label="Correction rate"
                    value={formatPct(view.mappingQuality.hitlCorrectionRate)}
                    hint={
                      view.mappingQuality.mapReviewsDecided > 0
                        ? `${view.mappingQuality.mapReviewsDecided} decided`
                        : "No decided map reviews"
                    }
                  />
                </div>
                {view.mappingQuality.resolutionSources.length > 0 ? (
                  <div className="flex flex-col gap-2.5">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Proposal sources
                    </p>
                    <p className="text-xs text-muted-foreground">
                      LOCODE Jev/manual/agent mix is not instrumented yet —
                      showing map-review source when present.
                    </p>
                    {view.mappingQuality.resolutionSources.map((bucket) => (
                      <BarRow
                        key={bucket.key}
                        label={bucket.label}
                        count={bucket.count}
                        max={mappingSourceMax}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </Section>
          </div>
        </div>
      )}
    </PageChrome>
  )
}

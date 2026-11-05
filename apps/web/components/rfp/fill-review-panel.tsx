"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import { IconChartBar } from "@tabler/icons-react"
import {
  compareLaneBidPriorityDesc,
  LANE_BID_PRIORITY_FACTOR_LABEL,
  LANE_BID_PRIORITY_TIER_LABEL,
  type LaneBidPriorityTier,
} from "@ship-happens/fill/browser"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ship-happens/ui/components/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ship-happens/ui/components/table"
import { DataTableShell } from "@/components/shared/page-chrome"
import type {
  FillReportCellView,
  RfpFillReportView,
} from "@/lib/domain/rfp/rfp.types"
import {
  resolveRateProvenanceLinks,
  type RateProvenanceLinks,
} from "@/lib/server/actions/rate-provenance"

function money(value: number | null | undefined, currency?: string | null) {
  if (value == null) return "—"
  const n = value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
  return currency ? `${n} ${currency}` : n
}

function outcomeLabel(outcome: FillReportCellView["outcome"]) {
  switch (outcome) {
    case "filled":
      return "Filled"
    case "skipped":
      return "Skipped"
    case "needs_human":
      return "Needs check"
    case "error":
      return "Error"
    default:
      return outcome
  }
}

function laneLabel(cell: FillReportCellView) {
  const { originLocode, destLocode, equipmentType, laneId } = cell.audit
  if (originLocode && destLocode) {
    return `${originLocode} → ${destLocode}${equipmentType ? ` · ${equipmentType}` : ""}`
  }
  return laneId ?? cell.columnKey ?? cell.cellRef ?? cell.id
}

function buySummary(cell: FillReportCellView) {
  const { starboard } = cell.audit
  if (starboard.buyTotal != null) {
    const carrier = starboard.carrier ? ` · ${starboard.carrier}` : ""
    return `${money(starboard.buyTotal, starboard.currency)}${carrier}`
  }
  return starboard.missReason ?? cell.reason ?? "No Starboard rate"
}

function markupSummary(cell: FillReportCellView) {
  const overlay = cell.audit.overlay
  if (!overlay) return "None"
  if (overlay.mode === "markup") {
    const parts = [
      overlay.markupPct != null ? `${overlay.markupPct}%` : null,
      overlay.markupAmount != null
        ? `+${money(overlay.markupAmount, overlay.currency)}`
        : null,
    ].filter(Boolean)
    return `${overlay.ruleName}${parts.length ? ` · ${parts.join(" ")}` : ""}`
  }
  return `${overlay.ruleName} · projected`
}

function sellSummary(cell: FillReportCellView) {
  const overlay = cell.audit.overlay
  if (overlay?.sellTotal != null) {
    return money(overlay.sellTotal, overlay.currency)
  }
  if (cell.value) return cell.value
  return "—"
}

function priorityLabel(cell: FillReportCellView) {
  const priority = cell.bidPriority
  if (!priority) return "—"
  const tier = LANE_BID_PRIORITY_TIER_LABEL[priority.tier]
  return `${tier} · ${priority.score}`
}

function priorityTierClass(tier: LaneBidPriorityTier) {
  switch (tier) {
    case "critical":
      return "text-destructive"
    case "attention":
      return "text-amber-700 dark:text-amber-400"
    default:
      return "text-muted-foreground"
  }
}

function laneGroupKey(cell: FillReportCellView) {
  return (
    cell.audit.laneId ??
    `${cell.audit.originLocode ?? ""}|${cell.audit.destLocode ?? ""}|${cell.audit.equipmentType ?? ""}|${cell.sheetName ?? ""}`
  )
}

type LaneGroup = {
  key: string
  base: FillReportCellView
  extras: FillReportCellView[]
}

function groupCellsByLane(cells: FillReportCellView[]): LaneGroup[] {
  const map = new Map<string, LaneGroup>()
  const order: string[] = []

  for (const cell of cells) {
    const key = laneGroupKey(cell)
    const role = cell.cellRole
    let group = map.get(key)
    if (!group) {
      group = { key, base: cell, extras: [] }
      map.set(key, group)
      order.push(key)
    }
    if (role === "fee" || role === "answer") {
      group.extras.push(cell)
      continue
    }
    // Prefer an explicit base cell; otherwise keep first as lane head.
    if (role === "base" || group.base.cellRole !== "base") {
      if (group.base.cellRole === "fee" || group.base.cellRole === "answer") {
        group.extras.unshift(group.base)
      }
      group.base = cell
    } else if (cell.id !== group.base.id) {
      group.extras.push(cell)
    }
  }

  return order.map((key) => map.get(key)!)
}

function ProvenanceLinks({
  links,
  loading,
}: {
  links: RateProvenanceLinks | null
  loading: boolean
}) {
  if (loading) {
    return <dd className="text-muted-foreground">Loading…</dd>
  }
  const rateDocUrl = links?.rateDocUrl ?? null
  const vendorEmailUrl = links?.vendorEmailUrl ?? null
  if (!rateDocUrl && !vendorEmailUrl) {
    return <dd className="font-medium">—</dd>
  }
  return (
    <dd className="flex flex-col items-end gap-1 text-right">
      {rateDocUrl ? (
        <a
          href={rateDocUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground underline-offset-4 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          View rate doc
        </a>
      ) : null}
      {vendorEmailUrl ? (
        <a
          href={vendorEmailUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground underline-offset-4 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          View vendor email
        </a>
      ) : null}
    </dd>
  )
}

function AuditDetail({
  cell,
  extras,
}: {
  cell: FillReportCellView
  extras: FillReportCellView[]
}) {
  const { starboard, overlay, pick } = cell.audit
  const priority = cell.bidPriority
  const [links, setLinks] = useState<RateProvenanceLinks | null>(null)
  const [loadingLinks, setLoadingLinks] = useState(
    Boolean(starboard.vendorRateDocId || starboard.vendorEmailUrl)
  )

  useEffect(() => {
    const docId = starboard.vendorRateDocId
    const emailUrl = starboard.vendorEmailUrl
    if (!docId && !emailUrl) {
      setLinks(null)
      setLoadingLinks(false)
      return
    }
    if (!docId && emailUrl) {
      setLinks({ rateDocUrl: null, vendorEmailUrl: emailUrl })
      setLoadingLinks(false)
      return
    }
    let cancelled = false
    setLoadingLinks(true)
    void resolveRateProvenanceLinks({
      vendorRateDocId: docId,
      vendorEmailUrl: emailUrl,
    })
      .then((next) => {
        if (!cancelled) setLinks(next)
      })
      .catch(() => {
        if (!cancelled) {
          setLinks({ rateDocUrl: null, vendorEmailUrl: emailUrl })
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLinks(false)
      })
    return () => {
      cancelled = true
    }
  }, [starboard.vendorRateDocId, starboard.vendorEmailUrl])

  return (
    <div className="grid gap-4 border-t border-border bg-muted/30 px-4 py-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Priority
        </p>
        {priority ? (
          <dl className="grid gap-1.5">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Tier</dt>
              <dd className={`font-medium ${priorityTierClass(priority.tier)}`}>
                {LANE_BID_PRIORITY_TIER_LABEL[priority.tier]}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Score</dt>
              <dd className="tabular font-medium">{priority.score}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground">Why</dt>
              <dd>
                <ul className="list-inside list-disc text-right font-medium">
                  {priority.factors.map((factor) => (
                    <li key={factor}>
                      {LANE_BID_PRIORITY_FACTOR_LABEL[factor]}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-muted-foreground">No priority yet.</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Buy (Starboard)
        </p>
        <dl className="grid gap-1.5">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Carrier</dt>
            <dd className="font-medium">{starboard.carrier ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Buy</dt>
            <dd className="tabular font-medium">
              {money(starboard.buyTotal, starboard.currency)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Source</dt>
            <ProvenanceLinks links={links} loading={loadingLinks} />
          </div>
          {starboard.missReason ? (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Miss</dt>
              <dd className="text-right font-medium">{starboard.missReason}</dd>
            </div>
          ) : null}
        </dl>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Markup / overlay
        </p>
        {overlay ? (
          <dl className="grid gap-1.5">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Rule</dt>
              <dd className="truncate font-medium" title={overlay.ruleName}>
                {overlay.ruleName}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Type</dt>
              <dd className="font-medium">
                {overlay.mode === "markup" ? "Markup" : "Projected sell"}
              </dd>
            </div>
            {overlay.mode === "markup" ? (
              <>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Markup %</dt>
                  <dd className="tabular font-medium">
                    {overlay.markupPct != null ? `${overlay.markupPct}%` : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Markup $</dt>
                  <dd className="tabular font-medium">
                    {money(overlay.markupAmount, overlay.currency)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Margin</dt>
                  <dd className="tabular font-medium">
                    {money(overlay.margin, overlay.currency)}
                    {overlay.marginPct != null
                      ? ` (${overlay.marginPct.toFixed(1)}%)`
                      : ""}
                  </dd>
                </div>
              </>
            ) : (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Projected</dt>
                <dd className="tabular font-medium">
                  {money(overlay.projectedSell, overlay.currency)}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Sell</dt>
              <dd className="tabular font-medium">
                {money(overlay.sellTotal, overlay.currency)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-muted-foreground">
            No overlay — sell matches buy when filled.
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Pick confidence
        </p>
        <dl className="grid gap-1.5">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Score</dt>
            <dd className="tabular font-medium">
              {pick.confidence == null
                ? "n/a"
                : `${Math.round(pick.confidence * 100)}%`}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Reason</dt>
            <dd className="font-medium">
              {pick.reason?.replaceAll("_", " ") ?? "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Options</dt>
            <dd className="tabular font-medium">
              {pick.candidateCount ?? "—"}
            </dd>
          </div>
        </dl>
        {extras.length > 0 ? (
          <div className="mt-2 border-t border-border/70 pt-2">
            <p className="mb-1 text-xs font-medium text-muted-foreground uppercase">
              Fees & answers
            </p>
            <ul className="grid gap-1">
              {extras.map((extra) => (
                <li
                  key={extra.id}
                  className="flex justify-between gap-2 text-xs"
                >
                  <span className="truncate text-muted-foreground">
                    {extra.cellRole === "fee"
                      ? (extra.feeHeading ?? "Fee")
                      : (extra.answerId ?? "Answer")}
                  </span>
                  <span className="tabular font-medium">
                    {extra.value ?? outcomeLabel(extra.outcome)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function FillReviewPanel({
  fillReport,
}: {
  fillReport: RfpFillReportView | null
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [tierFilter, setTierFilter] = useState<LaneBidPriorityTier | "all">(
    "all"
  )

  const lanes = useMemo(() => {
    const list = [...(fillReport?.cells ?? [])]
    list.sort((a, b) =>
      compareLaneBidPriorityDesc(a.bidPriority, b.bidPriority)
    )
    const filtered =
      tierFilter === "all"
        ? list
        : list.filter((cell) => cell.bidPriority?.tier === tierFilter)
    return groupCellsByLane(filtered)
  }, [fillReport?.cells, tierFilter])

  const counts = useMemo(() => {
    if (!fillReport) {
      return { filled: 0, skipped: 0, needsHuman: 0, error: 0, total: 0 }
    }
    return {
      filled: fillReport.filledCount,
      skipped: fillReport.skippedCount,
      needsHuman: fillReport.needsHumanCount,
      error: fillReport.errorCount,
      total: fillReport.cells.length,
    }
  }, [fillReport])

  if (!fillReport || counts.total === 0) {
    return (
      <Empty className="min-h-[240px] border border-dashed border-border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconChartBar aria-hidden />
          </EmptyMedia>
          <EmptyTitle>No quote lines yet</EmptyTitle>
          <EmptyDescription>
            After mapping and rates pull, each lane shows Starboard buy, any
            markup/overlay, and the sell you are quoting. Ask the agent in Chat
            to fill this sheet, or clear open items in Reviews.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
      <div className="grid shrink-0 gap-3 sm:grid-cols-4">
        {(
          [
            ["Filled", counts.filled],
            ["Skipped", counts.skipped],
            ["Needs check", counts.needsHuman],
            ["Errors", counts.error],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="rounded-[6px] border border-border bg-card p-3"
          >
            <p className="tabular text-[20px] font-semibold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {fillReport.summary ? (
        <p className="shrink-0 text-sm text-muted-foreground">
          {fillReport.summary}
        </p>
      ) : null}

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <p className="text-xs text-muted-foreground">Focus</p>
        {(
          [
            ["all", "All"],
            ["critical", LANE_BID_PRIORITY_TIER_LABEL.critical],
            ["attention", LANE_BID_PRIORITY_TIER_LABEL.attention],
            ["ok", LANE_BID_PRIORITY_TIER_LABEL.ok],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`rounded-[6px] border px-2.5 py-1 text-xs font-medium transition-colors ${
              tierFilter === value
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTierFilter(value)}
          >
            {label}
          </button>
        ))}
        <p className="text-xs text-muted-foreground">
          {lanes.length} lane{lanes.length === 1 ? "" : "s"} · buy → markup →
          sell
        </p>
      </div>

      <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                Priority
              </TableHead>
              <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                Lane
              </TableHead>
              <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                Buy
              </TableHead>
              <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                Markup
              </TableHead>
              <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                Sell
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lanes.map((group) => {
              const cell = group.base
              const open = selectedKey === group.key
              const tier = cell.bidPriority?.tier
              return (
                <Fragment key={group.key}>
                  <TableRow
                    className="cursor-pointer"
                    data-state={open ? "selected" : undefined}
                    onClick={() => setSelectedKey(open ? null : group.key)}
                  >
                    <TableCell
                      className={`align-top text-sm font-medium ${
                        tier ? priorityTierClass(tier) : "text-muted-foreground"
                      }`}
                    >
                      {priorityLabel(cell)}
                    </TableCell>
                    <TableCell className="align-top font-medium">
                      <div className="flex flex-col gap-0.5">
                        <span>{laneLabel(cell)}</span>
                        {group.extras.length > 0 ? (
                          <span className="text-xs text-muted-foreground">
                            {group.extras.length} fee/answer
                            {group.extras.length === 1 ? "" : "s"}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="align-top text-sm">
                      {outcomeLabel(cell.outcome)}
                    </TableCell>
                    <TableCell className="align-top text-sm text-muted-foreground">
                      {buySummary(cell)}
                    </TableCell>
                    <TableCell className="align-top text-sm text-muted-foreground">
                      {markupSummary(cell)}
                    </TableCell>
                    <TableCell className="tabular align-top text-sm font-medium">
                      {sellSummary(cell)}
                    </TableCell>
                  </TableRow>
                  {open ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={6} className="p-0">
                        <AuditDetail cell={cell} extras={group.extras} />
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      </DataTableShell>
      <p className="shrink-0 text-xs text-muted-foreground">
        Click a lane for buy source, markup rule, and sell. Excel preview stays
        under Files.
      </p>
    </div>
  )
}

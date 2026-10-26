"use client"

import { Fragment, useMemo, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { DataTableShell } from "@/components/shared/page-chrome"
import type {
  FillReportCellView,
  RfpFillReportView,
} from "@/lib/domain/rfp/rfp.types"

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
      return "Needs human"
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

function sourceSummary(cell: FillReportCellView) {
  const { starboard } = cell.audit
  if (starboard.buyTotal != null) {
    const carrier = starboard.carrier ? ` · ${starboard.carrier}` : ""
    return `Contract ${money(starboard.buyTotal, starboard.currency)}${carrier}`
  }
  return starboard.missReason ?? cell.reason ?? "No Starboard hit"
}

function overlaySummary(cell: FillReportCellView) {
  const overlay = cell.audit.overlay
  if (!overlay) return "—"
  if (overlay.mode === "markup") {
    const parts = [
      overlay.markupPct != null ? `${overlay.markupPct}%` : null,
      overlay.markupAmount != null
        ? `+${money(overlay.markupAmount, overlay.currency)}`
        : null,
    ].filter(Boolean)
    return `${overlay.ruleName} (markup${parts.length ? ` ${parts.join(" ")}` : ""})`
  }
  return `${overlay.ruleName} (projected ${money(overlay.projectedSell ?? overlay.sellTotal, overlay.currency)})`
}

function AuditDetail({ cell }: { cell: FillReportCellView }) {
  const { starboard, overlay } = cell.audit
  return (
    <div className="grid gap-4 border-t border-border bg-muted/30 px-4 py-3 text-sm sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Starboard source
        </p>
        <dl className="grid gap-1.5">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Channel</dt>
            <dd className="font-medium capitalize">{starboard.channel}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Hit</dt>
            <dd className="truncate font-medium" title={starboard.hitId ?? ""}>
              {starboard.hitId ?? "—"}
            </dd>
          </div>
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
          Overlay + markup
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
              <dt className="text-muted-foreground">Mode</dt>
              <dd className="font-medium capitalize">{overlay.mode}</dd>
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
                <dt className="text-muted-foreground">Projected sell</dt>
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
          <p className="text-muted-foreground">No overlay applied.</p>
        )}
      </div>
    </div>
  )
}

export function FillReviewPanel({
  fillReport,
}: {
  fillReport: RfpFillReportView | null
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const cells = fillReport?.cells ?? []

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
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["Filled", "—"],
              ["Skipped", "—"],
              ["Needs human", "—"],
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
        <p className="text-sm text-muted-foreground">
          No fill-report cells yet. Run rates resolve (and overlays) to persist
          Starboard source, overlay, and markup provenance per lane.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {(
          [
            ["Filled", counts.filled],
            ["Skipped", counts.skipped],
            ["Needs human", counts.needsHuman],
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
        <p className="text-sm text-muted-foreground">{fillReport.summary}</p>
      ) : null}

      <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                Lane
              </TableHead>
              <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                Outcome
              </TableHead>
              <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                Value
              </TableHead>
              <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                Starboard
              </TableHead>
              <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                Overlay
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cells.map((cell) => {
              const open = selectedId === cell.id
              return (
                <Fragment key={cell.id}>
                  <TableRow
                    className="cursor-pointer"
                    data-state={open ? "selected" : undefined}
                    onClick={() => setSelectedId(open ? null : cell.id)}
                  >
                    <TableCell className="align-top font-medium">
                      <div className="flex flex-col gap-0.5">
                        <span>{laneLabel(cell)}</span>
                        {cell.cellRef || cell.sheetName ? (
                          <span className="text-xs text-muted-foreground">
                            {[cell.sheetName, cell.cellRef]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="align-top text-sm">
                      {outcomeLabel(cell.outcome)}
                    </TableCell>
                    <TableCell className="tabular align-top text-sm">
                      {cell.value ?? "—"}
                    </TableCell>
                    <TableCell className="align-top text-sm text-muted-foreground">
                      {sourceSummary(cell)}
                    </TableCell>
                    <TableCell className="align-top text-sm text-muted-foreground">
                      {overlaySummary(cell)}
                    </TableCell>
                  </TableRow>
                  {open ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={5} className="p-0">
                        <AuditDetail cell={cell} />
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      </DataTableShell>
      <p className="text-xs text-muted-foreground">
        Click a row for Starboard source + overlay/markup detail. Same audit is
        available via <code className="text-xs">sh-client cells</code>.
      </p>
    </div>
  )
}

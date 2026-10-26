"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, useReducedMotion } from "motion/react"
import {
  IconLayoutBoard,
  IconList,
  IconFileSpreadsheet,
} from "@tabler/icons-react"
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
import { cn } from "@ship-happens/ui/lib/utils"
import { FILLS_WORST_CASE } from "@/components/rfp/fills-break-fixtures"
import { NewFillDialog } from "@/components/rfp/new-fill-dialog"
import { DataTableShell, PageChrome } from "@/components/shared/page-chrome"
import {
  RFP_BID_OUTCOME_LABEL,
  RFP_STATUS_LABEL,
  type RfpBidOutcome,
  type RfpListItem,
  type RfpStatus,
} from "@/lib/domain/rfp/rfp.types"
import { formatDateTime } from "@/lib/shared/string"

function bidOutcomePillClass(outcome: RfpBidOutcome) {
  switch (outcome) {
    case "won":
      return "status-pill status-pill-positive"
    case "lost":
    case "expired":
      return "status-pill status-pill-negative"
    default:
      return "status-pill status-pill-neutral"
  }
}

type ViewMode = "board" | "list"

const BOARD_COLUMNS: {
  status: RfpStatus
  hint: string
}[] = [
  { status: "queued", hint: "Waiting to start" },
  { status: "running", hint: "Agent filling" },
  { status: "needs_review", hint: "Human check" },
  { status: "done", hint: "Ready to download" },
  { status: "failed", hint: "Needs retry" },
]

function statusPillClass(status: RfpStatus) {
  switch (status) {
    case "done":
      return "status-pill status-pill-positive"
    case "failed":
      return "status-pill status-pill-negative"
    case "running":
    case "needs_review":
      return "status-pill status-pill-warning"
    default:
      return "status-pill status-pill-neutral"
  }
}

function countByStatus(rfps: RfpListItem[], status: RfpStatus) {
  return rfps.filter((rfp) => rfp.status === status).length
}

function FillCard({
  rfp,
  disabled,
  index,
}: {
  rfp: RfpListItem
  disabled?: boolean
  index: number
}) {
  const reduce = useReducedMotion()
  const body = (
    <motion.article
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: Math.min(index * 0.04, 0.28),
        duration: 0.35,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={cn(
        "desk-fill-card group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_6%,transparent)] transition-[border-color,box-shadow,transform] duration-200",
        !disabled &&
          "hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_12px_28px_-18px_color-mix(in_srgb,var(--foreground)_45%,transparent)]"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className={statusPillClass(rfp.status)}>
            {RFP_STATUS_LABEL[rfp.status]}
          </span>
          {rfp.effectiveBidOutcome ? (
            <span className={bidOutcomePillClass(rfp.effectiveBidOutcome)}>
              {RFP_BID_OUTCOME_LABEL[rfp.effectiveBidOutcome]}
              {rfp.bidOutcomeDerived ? " · due" : ""}
            </span>
          ) : rfp.dueAt ? (
            <span className="status-pill status-pill-warning">Due</span>
          ) : null}
        </div>
        <span className="tabular shrink-0 text-[11px] text-muted-foreground">
          {formatDateTime(rfp.updatedAt)}
        </span>
      </div>
      <div className="min-w-0">
        <h3
          className="truncate text-sm font-semibold tracking-tight"
          title={rfp.name}
        >
          {rfp.name}
        </h3>
        <p
          className="mt-0.5 truncate text-xs text-muted-foreground"
          title={rfp.customer || undefined}
        >
          {rfp.customer || "No customer"}
        </p>
        {rfp.emailRef ? (
          <p
            className="mt-1 truncate text-[11px] text-muted-foreground"
            title={
              [rfp.emailRef.from, rfp.emailRef.subject]
                .filter(Boolean)
                .join(" · ") || undefined
            }
          >
            Email
            {rfp.emailRef.from ? `: ${rfp.emailRef.from}` : ""}
            {rfp.emailRef.subject ? ` — ${rfp.emailRef.subject}` : ""}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-2 border-t border-border/70 pt-2.5">
        <IconFileSpreadsheet
          className="size-3.5 shrink-0 text-primary"
          aria-hidden
        />
        <span
          className="truncate text-[11px] text-muted-foreground"
          title={rfp.templateName || undefined}
        >
          {rfp.templateName || "No template"}
        </span>
      </div>
      <div
        className="pointer-events-none absolute inset-x-3 bottom-0 h-px origin-left scale-x-0 bg-primary transition-transform duration-200 group-hover:scale-x-100"
        aria-hidden
      />
    </motion.article>
  )

  if (disabled) return body
  return (
    <Link href={`/rfp/${rfp.id}`} className="block outline-none">
      {body}
    </Link>
  )
}

export function FillDeskBoard({ rfps }: { rfps: RfpListItem[] }) {
  const router = useRouter()
  const [view, setView] = useState<ViewMode>("board")
  const [worstCase, setWorstCase] = useState(false)
  const showBreakToggle = process.env.NODE_ENV === "development"
  const rows = useMemo(
    () => (worstCase ? FILLS_WORST_CASE : rfps),
    [worstCase, rfps]
  )

  const needsReview = countByStatus(rows, "needs_review")
  const running = countByStatus(rows, "running")
  const queued = countByStatus(rows, "queued")

  const byStatus = useMemo(() => {
    const map = new Map<RfpStatus, RfpListItem[]>()
    for (const col of BOARD_COLUMNS) map.set(col.status, [])
    for (const rfp of rows) {
      const list = map.get(rfp.status)
      if (list) list.push(rfp)
      else map.set(rfp.status, [rfp])
    }
    return map
  }, [rows])

  return (
    <PageChrome
      title="Fill desk"
      description="Bid sheets moving through map → rate → fill → review → export."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-border text-xs">
            <button
              type="button"
              aria-pressed={view === "board"}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 transition-colors",
                view === "board"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setView("board")}
            >
              <IconLayoutBoard className="size-3.5" />
              Board
            </button>
            <button
              type="button"
              aria-pressed={view === "list"}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 transition-colors",
                view === "list"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setView("list")}
            >
              <IconList className="size-3.5" />
              List
            </button>
          </div>
          {showBreakToggle ? (
            <div className="flex overflow-hidden rounded-lg border border-border text-xs">
              <button
                type="button"
                className={
                  !worstCase
                    ? "bg-foreground px-2 py-1 text-background"
                    : "px-2 py-1 text-muted-foreground"
                }
                onClick={() => setWorstCase(false)}
              >
                Demo data
              </button>
              <button
                type="button"
                className={
                  worstCase
                    ? "bg-foreground px-2 py-1 text-background"
                    : "px-2 py-1 text-muted-foreground"
                }
                onClick={() => setWorstCase(true)}
              >
                Worst case
              </button>
            </div>
          ) : null}
          <NewFillDialog />
        </div>
      }
      meta={
        rows.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {needsReview > 0 ? (
              <span className="status-pill status-pill-warning">
                {needsReview} needs review
              </span>
            ) : null}
            {running > 0 ? (
              <span className="status-pill status-pill-warning">
                {running} running
              </span>
            ) : null}
            {queued > 0 ? (
              <span className="status-pill status-pill-neutral">
                {queued} queued
              </span>
            ) : null}
          </div>
        ) : null
      }
    >
      {rows.length === 0 ? (
        <Empty className="desk-empty min-h-[320px] overflow-hidden border border-dashed border-border bg-card">
          <div
            className="desk-empty-hero pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage: "url(/marketing/port-night.jpg)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            aria-hidden
          />
          <EmptyHeader className="relative">
            <EmptyMedia variant="icon">
              <IconFileSpreadsheet />
            </EmptyMedia>
            <EmptyTitle>Your fill desk is empty</EmptyTitle>
            <EmptyDescription>
              Start a fill with a BCO workbook to open the first lane on the
              board.
            </EmptyDescription>
          </EmptyHeader>
          <div className="relative">
            <NewFillDialog />
          </div>
        </Empty>
      ) : view === "board" ? (
        <div className="desk-board -mx-1 flex gap-3 overflow-x-auto pb-2">
          {BOARD_COLUMNS.map((col) => {
            const items = byStatus.get(col.status) ?? []
            return (
              <section
                key={col.status}
                className="desk-board-col flex w-[15.5rem] shrink-0 flex-col gap-2.5"
              >
                <header className="sticky top-0 z-[1] flex items-baseline justify-between gap-2 rounded-lg bg-background/90 px-1 py-1 backdrop-blur-sm">
                  <div>
                    <h2 className="text-xs font-semibold tracking-tight">
                      {RFP_STATUS_LABEL[col.status]}
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                      {col.hint}
                    </p>
                  </div>
                  <span className="tabular text-xs text-muted-foreground">
                    {items.length}
                  </span>
                </header>
                <div className="flex min-h-[12rem] flex-col gap-2 rounded-xl border border-dashed border-border/80 bg-muted/35 p-2">
                  {items.length === 0 ? (
                    <p className="px-1 py-6 text-center text-[11px] text-muted-foreground">
                      Nothing here
                    </p>
                  ) : (
                    items.map((rfp, index) => (
                      <FillCard
                        key={rfp.id}
                        rfp={rfp}
                        index={index}
                        disabled={worstCase}
                      />
                    ))
                  )}
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                  Outcome
                </TableHead>
                <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                  Name
                </TableHead>
                <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                  Customer
                </TableHead>
                <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                  Template
                </TableHead>
                <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                  Source
                </TableHead>
                <TableHead className="h-[38px] text-right text-xs font-medium text-muted-foreground">
                  Updated
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((rfp) => (
                <TableRow
                  key={rfp.id}
                  className="h-[42px] cursor-pointer"
                  onClick={() => {
                    if (worstCase) return
                    router.push(`/rfp/${rfp.id}`)
                  }}
                >
                  <TableCell>
                    <span className={statusPillClass(rfp.status)}>
                      {RFP_STATUS_LABEL[rfp.status]}
                    </span>
                  </TableCell>
                  <TableCell>
                    {rfp.effectiveBidOutcome ? (
                      <span
                        className={bidOutcomePillClass(rfp.effectiveBidOutcome)}
                      >
                        {RFP_BID_OUTCOME_LABEL[rfp.effectiveBidOutcome]}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell
                    className="max-w-[14rem] truncate font-medium"
                    title={rfp.name}
                  >
                    {rfp.name}
                  </TableCell>
                  <TableCell
                    className="max-w-[10rem] truncate"
                    title={rfp.customer || undefined}
                  >
                    {rfp.customer || "—"}
                  </TableCell>
                  <TableCell
                    className="max-w-[12rem] truncate text-muted-foreground"
                    title={rfp.templateName || undefined}
                  >
                    {rfp.templateName || "—"}
                  </TableCell>
                  <TableCell
                    className="max-w-[12rem] truncate text-muted-foreground"
                    title={
                      rfp.emailRef
                        ? [rfp.emailRef.from, rfp.emailRef.subject]
                            .filter(Boolean)
                            .join(" · ")
                        : "Upload"
                    }
                  >
                    {rfp.emailRef
                      ? `Email${rfp.emailRef.from ? `: ${rfp.emailRef.from}` : ""}`
                      : "Upload"}
                  </TableCell>
                  <TableCell className="tabular text-right text-muted-foreground">
                    {formatDateTime(rfp.updatedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}
    </PageChrome>
  )
}

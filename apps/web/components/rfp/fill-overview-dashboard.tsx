"use client"

import { motion, useReducedMotion } from "motion/react"
import { Button } from "@ship-happens/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ship-happens/ui/components/card"
import {
  DownloadFilledButton,
  downloadFilledStatusMessage,
} from "@/components/rfp/download-filled-button"
import { ExportWorkbookButton } from "@/components/rfp/export-workbook-button"
import { FillProgressTimeline } from "@/components/rfp/fill-progress-timeline"
import { WaitingOnYouPanel } from "@/components/rfp/waiting-on-you-panel"
import { OfficeSpreadsheetViewer } from "@/components/shared/office-spreadsheet-viewer"
import { formatBytes } from "@/lib/shared/format-bytes"
import type { RfpDetailView } from "@/lib/domain/rfp/rfp.types"
import { formatDateTime } from "@/lib/shared/string"

function stepCounts(steps: RfpDetailView["progressSteps"]) {
  let done = 0
  let running = 0
  let failed = 0
  let pending = 0
  for (const step of steps) {
    if (step.status === "done" || step.status === "skipped") done += 1
    else if (step.status === "running") running += 1
    else if (step.status === "failed") failed += 1
    else pending += 1
  }
  return { done, running, failed, pending, total: steps.length }
}

function LogLines({ logs }: { logs: RfpDetailView["logs"] }) {
  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground">No logs yet.</p>
  }

  return (
    <pre className="tabular max-h-72 overflow-auto rounded-[6px] border border-border bg-background p-3 text-xs text-muted-foreground">
      {logs
        .map((log) => {
          const time = new Date(log.createdAt).toISOString()
          const step = log.stepKey ? `[${log.stepKey}] ` : ""
          return `${time} ${log.level.toUpperCase()} ${step}${log.message}`
        })
        .join("\n")}
    </pre>
  )
}

export function FillOverviewDashboard({
  rfp,
  initialReviewId,
  onAskAgent,
  onOpenReview,
  onOpenMap,
}: {
  rfp: RfpDetailView
  initialReviewId?: string | null
  onAskAgent?: (reviewId: string) => void
  onOpenReview?: () => void
  onOpenMap?: () => void
}) {
  const source = rfp.sourceFiles[0] ?? null
  const counts = stepCounts(rfp.progressSteps)
  const reduce = useReducedMotion()
  const progressPct =
    counts.total === 0
      ? 0
      : Math.round(
          ((counts.done + (counts.running > 0 ? 0.35 : 0)) / counts.total) * 100
        )

  const statTiles = [
    { label: "Done", value: counts.done, tone: "positive" as const },
    { label: "Running", value: counts.running, tone: "warning" as const },
    { label: "Failed", value: counts.failed, tone: "negative" as const },
    { label: "Pending", value: counts.pending, tone: "neutral" as const },
  ]

  return (
    <div className="flex flex-col gap-4">
      <WaitingOnYouPanel
        fillId={rfp.id}
        pendingReviews={rfp.pendingReviews ?? []}
        progressSteps={rfp.progressSteps}
        status={rfp.status}
        initialReviewId={initialReviewId}
        onAskAgent={onAskAgent ?? (() => undefined)}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statTiles.map((tile, i) => (
          <motion.div
            key={tile.label}
            className="overflow-hidden rounded-xl border border-border bg-card p-3.5"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: i * 0.05,
              duration: 0.35,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <p className="text-xs text-muted-foreground">{tile.label}</p>
            <p className="tabular mt-1 text-2xl font-semibold tracking-tight">
              {counts.total === 0 ? "—" : tile.value}
            </p>
          </motion.div>
        ))}
      </div>

      {rfp.mappingError || rfp.mappedLanes.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-border bg-card px-4 py-3">
          <div>
            <p className="text-sm font-medium tracking-tight">Mapping</p>
            <p className="text-xs text-muted-foreground">
              {rfp.mappingError
                ? rfp.mappingError
                : "No confirmed lanes yet — open Map to review and confirm O-D / equipment before rates."}
            </p>
          </div>
          {onOpenMap ? (
            <Button variant="outline" size="sm" onClick={onOpenMap}>
              Open Map
            </Button>
          ) : null}
        </div>
      ) : null}

      {rfp.fillReport && rfp.fillReport.cells.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3">
          <div>
            <p className="text-sm font-medium tracking-tight">Pricing audit</p>
            <p className="text-xs text-muted-foreground">
              {rfp.fillReport.filledCount} filled ·{" "}
              {rfp.fillReport.skippedCount} skipped
              {rfp.fillReport.errorCount > 0
                ? ` · ${rfp.fillReport.errorCount} error`
                : ""}
              {rfp.fillReport.summary ? ` — ${rfp.fillReport.summary}` : ""}
            </p>
          </div>
          {onOpenReview ? (
            <Button variant="outline" size="sm" onClick={onOpenReview}>
              Open Review
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-medium tracking-tight">
            Pipeline progress
          </p>
          <span className="tabular text-xs text-muted-foreground">
            {counts.total === 0 ? "No steps yet" : `${progressPct}%`}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {rfp.logs.length} log lines · owner {rfp.owner || "—"}
        </p>
      </div>

      {source ? (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Office Online preview of the source workbook.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OfficeSpreadsheetViewer
              fileUrl={source.fileUrl}
              title={source.fileName}
              className="relative min-h-[min(50vh,480px)] overflow-hidden rounded-[6px] border border-border bg-background"
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Progress</CardTitle>
            <CardDescription>
              Pipeline stages for this fill, with the latest activity per step.
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[min(70vh,720px)] overflow-auto">
            <FillProgressTimeline
              steps={rfp.progressSteps}
              logs={rfp.logs}
              ownerName={rfp.owner}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 lg:col-span-5">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>File</CardTitle>
              <CardDescription>
                Source workbook and filled export. Download unlocks after final
                export sign-off.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm">
              {source ? (
                <>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">File</dt>
                      <dd
                        className="truncate font-medium"
                        title={source.fileName}
                      >
                        {source.fileName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Size</dt>
                      <dd className="font-medium">
                        {formatBytes(source.sizeBytes)}
                      </dd>
                    </div>
                    <div className="min-w-0 sm:col-span-2">
                      <dt className="text-muted-foreground">Sheets</dt>
                      <dd className="font-medium">
                        {source.sheetNames.length > 0
                          ? source.sheetNames.join(", ")
                          : "—"}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-muted-foreground">Uploaded</dt>
                      <dd className="font-medium">
                        {formatDateTime(source.createdAt)}
                      </dd>
                    </div>
                  </dl>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      render={
                        <a
                          href={source.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                        />
                      }
                      nativeButton={false}
                    >
                      Open source
                    </Button>
                    <ExportWorkbookButton
                      fillId={rfp.id}
                      pendingReviewCount={rfp.pendingReviews?.length ?? 0}
                    />
                    <DownloadFilledButton
                      filledFileUrl={rfp.filledFileUrl}
                      blockedReason={rfp.exportDownloadBlockedReason}
                    />
                  </div>
                  <p className="text-muted-foreground">
                    {downloadFilledStatusMessage(
                      rfp.filledFileUrl,
                      rfp.exportDownloadBlockedReason
                    )}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No source workbook on this fill yet. Create the fill with an
                  uploaded BCO sheet, then the Office preview and export path
                  unlock.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="flex min-h-0 flex-1 flex-col">
            <CardHeader>
              <CardTitle>Logs</CardTitle>
              <CardDescription>
                Append-only job log from intake and later pipeline steps.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LogLines logs={rfp.logs} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

"use client"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { FillProgressTimeline } from "@/components/rfp/fill-progress-timeline"
import { OfficeSpreadsheetViewer } from "@/components/shared/office-spreadsheet-viewer"
import { formatBytes } from "@/lib/mock/templates"
import type { RfpDetailView } from "@/lib/server/rfps"
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
    <pre className="max-h-72 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs text-muted-foreground">
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

export function FillOverviewDashboard({ rfp }: { rfp: RfpDetailView }) {
  const source = rfp.sourceFiles[0] ?? null
  const counts = stepCounts(rfp.progressSteps)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">
          Run snapshot for this fill
        </p>
        <div className="flex flex-wrap gap-1.5">
          {counts.total > 0 ? (
            <>
              <Badge variant="secondary">{counts.done} done</Badge>
              {counts.running > 0 ? (
                <Badge variant="secondary">{counts.running} running</Badge>
              ) : null}
              {counts.failed > 0 ? (
                <Badge variant="destructive">{counts.failed} failed</Badge>
              ) : null}
              {counts.pending > 0 ? (
                <Badge variant="outline">{counts.pending} pending</Badge>
              ) : null}
            </>
          ) : (
            <Badge variant="outline">No steps yet</Badge>
          )}
          <Badge variant="outline">{rfp.logs.length} log lines</Badge>
        </div>
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
              className="relative min-h-[min(50vh,480px)] overflow-hidden rounded-xl border bg-muted/20"
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
                Source workbook and filled export status.
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
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!rfp.filledFileUrl}
                    >
                      Download filled
                    </Button>
                  </div>
                  <p className="text-muted-foreground">
                    {rfp.filledFileUrl
                      ? "Filled workbook is ready."
                      : "Filled export appears after the export phase."}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">
                  No source file on record for this fill.
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

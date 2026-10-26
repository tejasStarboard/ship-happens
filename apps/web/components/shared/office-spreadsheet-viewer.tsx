"use client"

import * as React from "react"
import {
  IconAlertTriangle,
  IconExternalLink,
  IconRefresh,
} from "@tabler/icons-react"
import { Button } from "@ship-happens/ui/components/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ship-happens/ui/components/empty"
import { Skeleton } from "@ship-happens/ui/components/skeleton"

type OfficeSpreadsheetViewerProps = {
  /** Public HTTPS URL to an .xls / .xlsx file (required by Office Online Viewer). */
  fileUrl: string
  title: string
  className?: string
}

const LOAD_TIMEOUT_MS = 20_000

type PreviewPhase = "checking" | "embedding" | "ready" | "error"

function officeEmbedUrl(fileUrl: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`
}

function isPublicHttpUrl(url: string) {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:")
      return false
    const host = parsed.hostname.toLowerCase()
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".local")
    ) {
      return false
    }
    return true
  } catch {
    return false
  }
}

function PreviewErrorEmpty({
  title,
  description,
  fileUrl,
  onRetry,
}: {
  title: string
  description: string
  fileUrl: string
  onRetry?: () => void
}) {
  return (
    <Empty className="min-h-[min(70vh,720px)] border border-dashed bg-muted/20">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconAlertTriangle aria-hidden />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {onRetry ? (
            <Button type="button" onClick={onRetry}>
              <IconRefresh data-icon="inline-start" />
              Try again
            </Button>
          ) : null}
          <Button
            variant="outline"
            render={<a href={fileUrl} target="_blank" rel="noreferrer" />}
            nativeButton={false}
          >
            Open file
            <IconExternalLink data-icon="inline-end" />
          </Button>
        </div>
      </EmptyContent>
    </Empty>
  )
}

function PreviewSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={
        className ??
        "relative flex min-h-[min(70vh,720px)] flex-col gap-3 overflow-hidden rounded-xl border bg-muted/20 p-4"
      }
    >
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="min-h-0 w-full flex-1" />
    </div>
  )
}

export function OfficeSpreadsheetViewer({
  fileUrl,
  title,
  className,
}: OfficeSpreadsheetViewerProps) {
  const [attempt, setAttempt] = React.useState(0)
  const [phase, setPhase] = React.useState<PreviewPhase>("checking")
  const canEmbed = isPublicHttpUrl(fileUrl)
  const embedSrc = canEmbed ? officeEmbedUrl(fileUrl) : null

  React.useEffect(() => {
    setPhase(canEmbed ? "checking" : "error")
  }, [attempt, canEmbed, fileUrl])

  React.useEffect(() => {
    if (!canEmbed || !embedSrc || phase !== "checking") return

    const controller = new AbortController()

    void fetch(`/api/office-embed/check?src=${encodeURIComponent(fileUrl)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          // Check endpoint unavailable — still attempt the embed.
          setPhase("embedding")
          return
        }
        const data = (await res.json()) as { ok?: boolean }
        setPhase(data.ok === false ? "error" : "embedding")
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        setPhase("embedding")
      })

    return () => controller.abort()
  }, [attempt, canEmbed, embedSrc, fileUrl, phase])

  React.useEffect(() => {
    if (phase !== "embedding") return
    const timeoutId = window.setTimeout(
      () => setPhase("error"),
      LOAD_TIMEOUT_MS
    )
    return () => window.clearTimeout(timeoutId)
  }, [attempt, phase])

  if (!canEmbed || !embedSrc) {
    return (
      <PreviewErrorEmpty
        title="Preview unavailable"
        description="Microsoft Office Online Viewer needs a publicly reachable HTTPS file URL. Local or private Blob URLs cannot be embedded until the file is served publicly."
        fileUrl={fileUrl}
      />
    )
  }

  if (phase === "error") {
    return (
      <PreviewErrorEmpty
        title="Something went wrong"
        description="Microsoft Office Online couldn't preview this spreadsheet. The service may be temporarily unavailable, or the file couldn't be reached. Try again or open the file directly."
        fileUrl={fileUrl}
        onRetry={() => setAttempt((n) => n + 1)}
      />
    )
  }

  if (phase === "checking") {
    return <PreviewSkeleton className={className} />
  }

  return (
    <div
      className={
        className ??
        "relative min-h-[min(70vh,720px)] overflow-hidden rounded-xl border bg-muted/20"
      }
    >
      {phase === "embedding" ? (
        <div className="absolute inset-0 z-10 flex flex-col gap-3 p-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="min-h-0 w-full flex-1" />
        </div>
      ) : null}
      <iframe
        key={`${embedSrc}:${attempt}`}
        title={`Office preview: ${title}`}
        src={embedSrc}
        className="absolute inset-0 size-full border-0 bg-background"
        onLoad={() => setPhase("ready")}
        onError={() => setPhase("error")}
        allow="fullscreen"
      />
    </div>
  )
}

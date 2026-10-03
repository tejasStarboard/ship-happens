import * as React from "react"
import { IconAlertTriangle, IconExternalLink } from "@tabler/icons-react"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"

type OfficeSpreadsheetViewerProps = {
  /** Public HTTPS URL to an .xls / .xlsx file (required by Office Online Viewer). */
  fileUrl: string
  title: string
  className?: string
}

function officeEmbedUrl(fileUrl: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`
}

function isPublicHttpUrl(url: string) {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false
    const host = parsed.hostname.toLowerCase()
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
      return false
    }
    return true
  } catch {
    return false
  }
}

export function OfficeSpreadsheetViewer({
  fileUrl,
  title,
  className,
}: OfficeSpreadsheetViewerProps) {
  const [loaded, setLoaded] = React.useState(false)
  const canEmbed = isPublicHttpUrl(fileUrl)
  const embedSrc = canEmbed ? officeEmbedUrl(fileUrl) : null

  React.useEffect(() => {
    setLoaded(false)
  }, [fileUrl])

  if (!canEmbed || !embedSrc) {
    return (
      <Alert>
        <IconAlertTriangle />
        <AlertTitle>Preview unavailable</AlertTitle>
        <AlertDescription className="flex flex-col gap-3">
          <span>
            Microsoft Office Online Viewer needs a publicly reachable HTTPS file
            URL. Local or private Blob URLs cannot be embedded until the file is
            served publicly.
          </span>
          <Button
            variant="outline"
            size="sm"
            className="w-fit"
            render={
              <a href={fileUrl} target="_blank" rel="noreferrer" />
            }
            nativeButton={false}
          >
            Open file
            <IconExternalLink data-icon="inline-end" />
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div
      className={
        className ??
        "relative min-h-[min(70vh,720px)] overflow-hidden rounded-xl border bg-muted/20"
      }
    >
      {!loaded ? (
        <div className="absolute inset-0 z-10 flex flex-col gap-3 p-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="min-h-0 flex-1 w-full" />
        </div>
      ) : null}
      <iframe
        key={embedSrc}
        title={`Office preview: ${title}`}
        src={embedSrc}
        className="absolute inset-0 size-full border-0 bg-background"
        onLoad={() => setLoaded(true)}
        allow="fullscreen"
      />
    </div>
  )
}

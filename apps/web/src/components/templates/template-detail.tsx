import { IconDownload, IconExternalLink } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { OfficeSpreadsheetViewer } from "@/components/shared/office-spreadsheet-viewer"
import { formatBytes, type MockTemplate } from "@/lib/mock/templates"

export function TemplateDetail({ template }: { template: MockTemplate }) {
  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {template.name}
          </h1>
          <p className="text-sm text-muted-foreground">{template.fileName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            render={
              <a href={template.fileUrl} target="_blank" rel="noreferrer" />
            }
            nativeButton={false}
          >
            <IconExternalLink data-icon="inline-start" />
            Open in Office
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<a href={template.fileUrl} download={template.fileName} />}
            nativeButton={false}
          >
            <IconDownload data-icon="inline-start" />
            Download
          </Button>
        </div>
      </div>

      <OfficeSpreadsheetViewer
        fileUrl={template.fileUrl}
        title={template.name}
      />

      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
          <CardDescription>
            Document fields — replace with Blob / DB records later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Customer</dt>
              <dd className="font-medium">{template.customer ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Uploaded by</dt>
              <dd className="font-medium">{template.uploadedBy}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Size</dt>
              <dd className="font-medium">{formatBytes(template.sizeBytes)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">MIME type</dt>
              <dd className="font-medium break-all">{template.mimeType}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Uploaded at</dt>
              <dd className="font-medium">
                {new Date(template.uploadedAt).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Template ID</dt>
              <dd className="font-mono text-xs">{template.id}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}

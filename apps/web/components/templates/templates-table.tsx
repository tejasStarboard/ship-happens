"use client"

import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { UploadTemplateDialog } from "@/components/templates/upload-template-dialog"
import { formatBytes } from "@/lib/shared/format-bytes"
import type { TemplateListItem } from "@/lib/server/templates"
import { formatDateTime } from "@/lib/shared/string"

export function TemplatesTable({
  templates,
}: {
  templates: TemplateListItem[]
}) {
  const router = useRouter()

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="text-sm text-muted-foreground">
            Uploaded bid-sheet documents and metadata.
          </p>
        </div>
        <UploadTemplateDialog />
      </div>

      <div className="px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No templates yet for this organization.
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow
                    key={template.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/templates/${template.id}`)}
                  >
                    <TableCell className="font-medium">
                      {template.name}
                    </TableCell>
                    <TableCell>{template.customer ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {template.fileName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatBytes(template.sizeBytes)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(template.uploadedAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

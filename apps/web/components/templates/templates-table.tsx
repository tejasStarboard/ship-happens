"use client"

import { useRouter } from "next/navigation"
import { IconTemplate } from "@tabler/icons-react"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  DataTableShell,
  PageChrome,
} from "@/components/shared/page-chrome"
import { UploadTemplateDialog } from "@/components/templates/upload-template-dialog"
import { formatBytes } from "@/lib/shared/format-bytes"
import type { TemplateListItem } from "@/lib/domain/templates/template.types"
import { formatDateTime } from "@/lib/shared/string"

export function TemplatesTable({
  templates,
}: {
  templates: TemplateListItem[]
}) {
  const router = useRouter()

  return (
    <PageChrome
      title="Templates"
      description="Customer bid-sheet layouts the desk reuses every season."
      actions={<UploadTemplateDialog />}
    >
      {templates.length === 0 ? (
        <Empty className="desk-empty relative min-h-[320px] overflow-hidden border border-dashed border-border bg-card">
          <div
            className="desk-empty-hero pointer-events-none absolute inset-0 opacity-35"
            style={{
              backgroundImage: "url(/marketing/workbook-glow.jpg)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            aria-hidden
          />
          <EmptyHeader className="relative">
            <EmptyMedia variant="icon">
              <IconTemplate />
            </EmptyMedia>
            <EmptyTitle>No templates yet</EmptyTitle>
            <EmptyDescription>
              Upload a customer bid sheet once, then start fills from it.
            </EmptyDescription>
          </EmptyHeader>
          <div className="relative">
            <UploadTemplateDialog />
          </div>
        </Empty>
      ) : (
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                  Name
                </TableHead>
                <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                  Customer
                </TableHead>
                <TableHead className="h-[38px] text-xs font-medium text-muted-foreground">
                  File
                </TableHead>
                <TableHead className="h-[38px] text-right text-xs font-medium text-muted-foreground">
                  Size
                </TableHead>
                <TableHead className="h-[38px] text-right text-xs font-medium text-muted-foreground">
                  Uploaded
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow
                  key={template.id}
                  className="h-[42px] cursor-pointer"
                  onClick={() => router.push(`/templates/${template.id}`)}
                >
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>{template.customer ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {template.fileName}
                  </TableCell>
                  <TableCell className="tabular text-right text-muted-foreground">
                    {formatBytes(template.sizeBytes)}
                  </TableCell>
                  <TableCell className="tabular text-right text-muted-foreground">
                    {formatDateTime(template.uploadedAt)}
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

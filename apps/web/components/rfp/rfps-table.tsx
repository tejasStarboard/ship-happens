"use client"

import { useRouter } from "next/navigation"
import { Badge } from "@workspace/ui/components/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { NewFillDialog } from "@/components/rfp/new-fill-dialog"
import {
  RFP_STATUS_LABEL,
  type RfpListItem,
  type RfpStatus,
} from "@/lib/domain/rfp/rfp.types"
import { formatDateTime } from "@/lib/shared/string"

function statusVariant(
  status: RfpStatus
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "done":
      return "secondary"
    case "failed":
      return "destructive"
    case "running":
      return "default"
    case "needs_review":
      return "default"
    default:
      return "outline"
  }
}

function countByStatus(rfps: RfpListItem[], status: RfpStatus) {
  return rfps.filter((rfp) => rfp.status === status).length
}

export function RfpsTable({ rfps }: { rfps: RfpListItem[] }) {
  const router = useRouter()
  const needsReview = countByStatus(rfps, "needs_review")
  const running = countByStatus(rfps, "running")
  const queued = countByStatus(rfps, "queued")

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Fills</h1>
            <p className="text-sm text-muted-foreground">
              Bid sheet fill jobs for this organization — map, rate, review,
              export.
            </p>
          </div>
          {rfps.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {needsReview > 0 ? (
                <Badge variant="default">{needsReview} needs review</Badge>
              ) : null}
              {running > 0 ? (
                <Badge variant="secondary">{running} running</Badge>
              ) : null}
              {queued > 0 ? (
                <Badge variant="outline">{queued} queued</Badge>
              ) : null}
            </div>
          ) : null}
        </div>
        <NewFillDialog />
      </div>

      <div className="px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rfps.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No fills yet. Use New fill to upload a BCO workbook.
                  </TableCell>
                </TableRow>
              ) : (
                rfps.map((rfp) => (
                  <TableRow
                    key={rfp.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/rfp/${rfp.id}`)}
                  >
                    <TableCell>
                      <Badge variant={statusVariant(rfp.status)}>
                        {RFP_STATUS_LABEL[rfp.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{rfp.name}</TableCell>
                    <TableCell>{rfp.customer}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {rfp.templateName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(rfp.updatedAt)}
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

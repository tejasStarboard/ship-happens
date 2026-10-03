import { useNavigate } from "@tanstack/react-router"
import { IconPlus } from "@tabler/icons-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { MOCK_RFPS, RFP_STATUS_LABEL, type RfpStatus } from "@/lib/mock/rfps"

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
    default:
      return "outline"
  }
}

export function RfpsTable() {
  const navigate = useNavigate()

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">RFPs</h1>
          <p className="text-sm text-muted-foreground">
            Bid sheet fill jobs for this organization.
          </p>
        </div>
        <Button size="sm" disabled>
          <IconPlus data-icon="inline-start" />
          New fill
        </Button>
      </div>

      <div className="px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_RFPS.map((rfp) => (
                <TableRow
                  key={rfp.id}
                  className="cursor-pointer"
                  onClick={() =>
                    void navigate({ to: "/rfp/$id", params: { id: rfp.id } })
                  }
                >
                  <TableCell className="font-medium">{rfp.name}</TableCell>
                  <TableCell>{rfp.customer}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(rfp.status)}>
                      {RFP_STATUS_LABEL[rfp.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {rfp.templateName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(rfp.updatedAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

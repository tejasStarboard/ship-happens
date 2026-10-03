import { useNavigate } from "@tanstack/react-router"
import { IconUpload } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { formatBytes, MOCK_TEMPLATES } from "@/lib/mock/templates"

export function TemplatesTable() {
  const navigate = useNavigate()

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="text-sm text-muted-foreground">
            Uploaded bid-sheet documents and metadata.
          </p>
        </div>
        <Button size="sm" disabled>
          <IconUpload data-icon="inline-start" />
          Upload
        </Button>
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
              {MOCK_TEMPLATES.map((template) => (
                <TableRow
                  key={template.id}
                  className="cursor-pointer"
                  onClick={() =>
                    void navigate({
                      to: "/templates/$templateId",
                      params: { templateId: template.id },
                    })
                  }
                >
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>{template.customer ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {template.fileName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatBytes(template.sizeBytes)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(template.uploadedAt).toLocaleString()}
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

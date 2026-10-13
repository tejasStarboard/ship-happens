"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { IconUpload } from "@tabler/icons-react"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { uploadTemplate } from "@/lib/server/actions/intake"
import { fileToBase64 } from "@/lib/shared/file-to-base64"
import {
  ALLOWED_SPREADSHEET_MIME_TYPES,
  MAX_SPREADSHEET_BYTES,
  type AllowedSpreadsheetMime,
} from "@/lib/storage/spreadsheet-constants"

function isAllowedMime(value: string): value is AllowedSpreadsheetMime {
  return (ALLOWED_SPREADSHEET_MIME_TYPES as readonly string[]).includes(value)
}

export function UploadTemplateDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [customer, setCustomer] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [pending, setPending] = useState(false)

  function reset() {
    setName("")
    setCustomer("")
    setFile(null)
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!file) {
      toast.error("Choose a workbook to upload")
      return
    }
    if (!name.trim()) {
      toast.error("Name is required")
      return
    }
    if (file.size > MAX_SPREADSHEET_BYTES) {
      toast.error("File must be 25MB or smaller")
      return
    }
    const contentType =
      file.type ||
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    if (!isAllowedMime(contentType) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error("Unsupported file type")
      return
    }
    const mime: AllowedSpreadsheetMime = isAllowedMime(contentType)
      ? contentType
      : file.name.toLowerCase().endsWith(".csv")
        ? "text/csv"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    setPending(true)
    try {
      const base64 = await fileToBase64(file)
      const result = await uploadTemplate({
        fileName: file.name,
        contentType: mime,
        base64,
        name: name.trim(),
        customer: customer.trim() || undefined,
      })
      toast.success("Template uploaded")
      setOpen(false)
      reset()
      router.push(`/templates/${result.id}`)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not upload template"
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <IconUpload data-icon="inline-start" />
        Upload
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload template</DialogTitle>
          <DialogDescription>
            Save a BCO layout to reuse on later fills.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <FieldGroup className="gap-3">
            <Field>
              <FieldLabel htmlFor="tpl-name">Name</FieldLabel>
              <Input
                id="tpl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nordstrom bid sheet v3"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="tpl-customer">Customer</FieldLabel>
              <Input
                id="tpl-customer"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Optional"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="tpl-file">Workbook</FieldLabel>
              <Input
                id="tpl-file"
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { IconPlus } from "@tabler/icons-react"
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
import { createFill } from "@/lib/server/actions/intake"
import { fileToBase64 } from "@/lib/shared/file-to-base64"
import {
  ALLOWED_SPREADSHEET_MIME_TYPES,
  MAX_SPREADSHEET_BYTES,
  type AllowedSpreadsheetMime,
} from "@/lib/storage/spreadsheet-constants"

function isAllowedMime(value: string): value is AllowedSpreadsheetMime {
  return (ALLOWED_SPREADSHEET_MIME_TYPES as readonly string[]).includes(value)
}

export function NewFillDialog() {
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
      toast.error("Choose a BCO workbook (.xlsx, .xls, or .csv)")
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
    const contentType = file.type || guessMime(file.name)
    if (!isAllowedMime(contentType)) {
      toast.error("Unsupported file type")
      return
    }

    setPending(true)
    try {
      const base64 = await fileToBase64(file)
      const result = await createFill({
        fileName: file.name,
        contentType,
        base64,
        name: name.trim(),
        customer: customer.trim() || undefined,
      })
      toast.success("Fill created")
      setOpen(false)
      reset()
      router.push(`/rfp/${result.id}`)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create fill"
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
        <IconPlus data-icon="inline-start" />
        New fill
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New fill</DialogTitle>
          <DialogDescription>
            Upload a BCO bid sheet to start a fill. Progress and logs track
            intake; then use Map or Agent for mapping, and Rates to resolve.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <FieldGroup className="gap-3">
            <Field>
              <FieldLabel htmlFor="fill-name">Name</FieldLabel>
              <Input
                id="fill-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nordstrom FCL Q2"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="fill-customer">Customer</FieldLabel>
              <Input
                id="fill-customer"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Optional"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="fill-file">Workbook</FieldLabel>
              <Input
                id="fill-file"
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Creating…" : "Create fill"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function guessMime(fileName: string): string {
  const lower = fileName.toLowerCase()
  if (lower.endsWith(".csv")) return "text/csv"
  if (lower.endsWith(".xls")) return "application/vnd.ms-excel"
  return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@ship-happens/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ship-happens/ui/components/dialog"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@ship-happens/ui/components/field"
import { Input } from "@ship-happens/ui/components/input"
import { createFillRevision } from "@/lib/server/actions/intake"
import { fileToBase64 } from "@/lib/shared/file-to-base64"
import {
  ALLOWED_SPREADSHEET_MIME_TYPES,
  MAX_SPREADSHEET_BYTES,
  type AllowedSpreadsheetMime,
} from "@/lib/storage/spreadsheet-constants"

function isAllowedMime(value: string): value is AllowedSpreadsheetMime {
  return (ALLOWED_SPREADSHEET_MIME_TYPES as readonly string[]).includes(value)
}

function guessMime(fileName: string): string {
  const lower = fileName.toLowerCase()
  if (lower.endsWith(".csv")) return "text/csv"
  if (lower.endsWith(".xls")) return "application/vnd.ms-excel"
  return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
}

export function StartNextRoundDialog({
  parentFillId,
  parentName,
  parentCustomer,
  roundNumber,
}: {
  parentFillId: string
  parentName: string
  parentCustomer: string
  roundNumber: number
}) {
  const router = useRouter()
  const nextRound = roundNumber + 1
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(`${parentName} (round ${nextRound})`)
  const [customer, setCustomer] = useState(
    parentCustomer && parentCustomer !== "—" ? parentCustomer : ""
  )
  const [file, setFile] = useState<File | null>(null)
  const [pending, setPending] = useState(false)

  function reset() {
    setName(`${parentName} (round ${nextRound})`)
    setCustomer(parentCustomer && parentCustomer !== "—" ? parentCustomer : "")
    setFile(null)
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!file) {
      toast.error("Choose the revised workbook (.xlsx, .xls, or .csv)")
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
      const result = await createFillRevision({
        parentFillId,
        fileName: file.name,
        contentType,
        base64,
        name: name.trim(),
        customer: customer.trim() || undefined,
      })
      const drift = result.mappingReuse.drifted
      toast.success(
        drift > 0
          ? `Round ${result.roundNumber} started — ${drift} lane${drift === 1 ? "" : "s"} need review`
          : `Round ${result.roundNumber} started`
      )
      setOpen(false)
      reset()
      router.push(`/rfp/${result.id}`)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not start the next round"
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
      <DialogTrigger render={<Button variant="secondary" size="sm" />}>
        Start next round
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start round {nextRound}</DialogTitle>
          <DialogDescription>
            Upload the revised workbook. Lanes that still match this fill are
            copied. Moved columns or rows open a map review.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <FieldGroup className="gap-3">
            <Field>
              <FieldLabel htmlFor="round-name">Name</FieldLabel>
              <Input
                id="round-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="round-customer">Customer</FieldLabel>
              <Input
                id="round-customer"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Optional"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="round-file">Revised workbook</FieldLabel>
              <Input
                id="round-file"
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Starting…" : `Start round ${nextRound}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import type { UnexpectedFeeWarningPayload } from "@ship-happens/fill/browser"
import { Button } from "@ship-happens/ui/components/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ship-happens/ui/components/alert-dialog"
import { exportFillWorkbookAction } from "@/lib/server/actions/export"

export function ExportWorkbookButton({
  fillId,
  pendingReviewCount,
  disabled,
}: {
  fillId: string
  pendingReviewCount: number
  disabled?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [feeWarn, setFeeWarn] = useState<UnexpectedFeeWarningPayload | null>(
    null
  )

  function runExport(acknowledgeUnexpectedFees = false) {
    startTransition(async () => {
      try {
        const result = await exportFillWorkbookAction(fillId, {
          acknowledgeUnexpectedFees,
        })
        if (!result.ok) {
          if ("softWarn" in result && result.softWarn) {
            setFeeWarn(result.softWarn)
            return
          }
          toast.error("error" in result ? result.error : "Export failed")
          return
        }
        toast.success(result.detail)
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Export failed")
      }
    })
  }

  function onClick() {
    if (pendingReviewCount > 0) {
      setConfirmOpen(true)
      return
    }
    runExport(false)
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        disabled={disabled || pending}
        onClick={onClick}
      >
        {pending ? "Exporting…" : "Export filled"}
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reviews still pending</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingReviewCount === 1
                ? "1 review item is still waiting on you."
                : `${pendingReviewCount} review items are still waiting on you.`}{" "}
              Export can continue, but the filled workbook may omit lanes that
              need human decisions. Export anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() => {
                setConfirmOpen(false)
                runExport(false)
              }}
            >
              Export anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={feeWarn != null}
        onOpenChange={(open) => {
          if (!open) setFeeWarn(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unexpected fees on sell</AlertDialogTitle>
            <AlertDialogDescription>
              {feeWarn
                ? feeWarn.count === 1
                  ? "1 lane has Starboard fee line(s) not requested by the BCO sheet."
                  : `${feeWarn.count} lanes have Starboard fee line(s) not requested by the BCO sheet.`
                : null}{" "}
              Soft warn is the org default. Change later under Settings → Fill
              export.
            </AlertDialogDescription>
            {feeWarn && feeWarn.titles.length > 0 ? (
              <ul className="list-disc space-y-1 px-1 text-sm text-muted-foreground">
                {feeWarn.titles.slice(0, 5).map((title) => (
                  <li key={title}>{title}</li>
                ))}
              </ul>
            ) : null}
            <p className="text-sm text-muted-foreground">
              <Link
                href={feeWarn?.settingsPath ?? "/settings/fill-export"}
                className="font-medium text-foreground underline underline-offset-2"
                onClick={() => setFeeWarn(null)}
              >
                Settings → Fill export
              </Link>
            </p>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() => {
                setFeeWarn(null)
                runExport(true)
              }}
            >
              Export anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

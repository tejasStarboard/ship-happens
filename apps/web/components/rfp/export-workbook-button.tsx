"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
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

  function runExport() {
    startTransition(async () => {
      try {
        const result = await exportFillWorkbookAction(fillId)
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
    runExport()
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
                runExport()
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

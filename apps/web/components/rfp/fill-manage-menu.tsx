"use client"

import { useState, useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  IconDotsVertical,
  IconDownload,
  IconFileExport,
  IconMessage,
  IconPencil,
  IconRestore,
  IconStack2,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react"
import { toast } from "sonner"
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
import { Button } from "@ship-happens/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ship-happens/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@ship-happens/ui/components/dropdown-menu"
import { Input } from "@ship-happens/ui/components/input"
import { Label } from "@ship-happens/ui/components/label"
import { ExportWorkbookButton } from "@/components/rfp/export-workbook-button"
import { StartNextRoundDialog } from "@/components/rfp/start-next-round-dialog"
import {
  RFP_STATUS_LABEL,
  RFP_STATUSES,
  type RfpStatus,
} from "@/lib/domain/rfp/rfp.types"
import {
  deleteFill,
  resetFillWorkspace,
  setFillStatus,
  updateFillIdentity,
  type FillResetMode,
} from "@/lib/server/actions/fills"

export type FillDetailMenuActions = {
  primaryAction?: { label: string; onSelect: () => void }
  startNextRound?: {
    parentFillId: string
    parentName: string
    parentCustomer: string
    roundNumber: number
  }
  exportFill?: {
    fillId: string
    pendingReviewCount: number
  }
  download?: {
    filledFileUrl: string | null
    blockedReason: string | null
  }
  /** After agent transcript/session clear — remount chat UI. */
  onAgentReset?: () => void
  /** After sheet restore — refresh files preview etc. */
  onSheetReset?: () => void
}

type FillManageMenuProps = {
  fillId: string
  name: string
  customer: string
  status: RfpStatus
  /** Compact icon trigger for cards / dense tables. */
  size?: "sm" | "default"
  /** Detail-page actions collapsed into this menu. */
  detailActions?: FillDetailMenuActions
  leadingItems?: ReactNode
}

export function FillManageMenu({
  fillId,
  name,
  customer,
  status,
  size = "sm",
  detailActions,
  leadingItems,
}: FillManageMenuProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [roundOpen, setRoundOpen] = useState(false)
  const [exportSignal, setExportSignal] = useState(0)
  const [nextName, setNextName] = useState(name)
  const [nextCustomer, setNextCustomer] = useState(customer)

  function openRename() {
    setNextName(name)
    setNextCustomer(customer)
    setRenameOpen(true)
  }

  function onRename() {
    startTransition(async () => {
      const result = await updateFillIdentity(fillId, {
        name: nextName,
        customer: nextCustomer,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Updated")
      setRenameOpen(false)
      router.refresh()
    })
  }

  function onSetStatus(next: RfpStatus) {
    if (next === status) return
    startTransition(async () => {
      const result = await setFillStatus(fillId, next)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(`Moved to ${RFP_STATUS_LABEL[next]}`)
      router.refresh()
    })
  }

  function onDelete() {
    startTransition(async () => {
      const result = await deleteFill(fillId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Fill deleted")
      setDeleteOpen(false)
      router.push("/rfp")
      router.refresh()
    })
  }

  function onReset(mode: FillResetMode) {
    startTransition(async () => {
      const result = await resetFillWorkspace(fillId, mode)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      if (mode === "agent" || mode === "both") {
        detailActions?.onAgentReset?.()
        toast.success(
          mode === "both" ? "Agent and sheet reset" : "Agent chat reset"
        )
      }
      if (mode === "sheet" || mode === "both") {
        detailActions?.onSheetReset?.()
        if (mode === "sheet") {
          toast.success(
            result.sheetFiles > 0
              ? "Sheet restored from original upload"
              : "Sheet reset (no source files found)"
          )
        }
      }
      router.refresh()
    })
  }

  const downloadUrl = detailActions?.download?.filledFileUrl ?? null
  const downloadBlocked = detailActions?.download?.blockedReason ?? null
  const showResetMenu = Boolean(detailActions)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size={size === "sm" ? "icon-sm" : "icon"}
              aria-label="Manage fill"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
              }}
            />
          }
        >
          <IconDotsVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-52"
          onClick={(event) => event.stopPropagation()}
        >
          {detailActions ? (
            <>
              <DropdownMenuGroup>
                {detailActions.startNextRound ? (
                  <DropdownMenuItem onClick={() => setRoundOpen(true)}>
                    <IconUpload />
                    Start next round
                  </DropdownMenuItem>
                ) : null}
                {detailActions.primaryAction ? (
                  <DropdownMenuItem
                    onClick={() => detailActions.primaryAction?.onSelect()}
                  >
                    <IconMessage />
                    {detailActions.primaryAction.label}
                  </DropdownMenuItem>
                ) : null}
                {detailActions.exportFill ? (
                  <DropdownMenuItem
                    onClick={() => setExportSignal((n) => n + 1)}
                  >
                    <IconFileExport />
                    Export filled
                  </DropdownMenuItem>
                ) : null}
                {detailActions.download ? (
                  downloadUrl ? (
                    <DropdownMenuItem
                      render={
                        <a
                          href={downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          download
                        />
                      }
                    >
                      <IconDownload />
                      Download filled
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      disabled
                      title={
                        downloadBlocked ??
                        "Export + sign-off unlocks download"
                      }
                    >
                      <IconDownload />
                      Download filled
                    </DropdownMenuItem>
                  )
                ) : null}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
            </>
          ) : null}
          {leadingItems}
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={openRename}>
              <IconPencil />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <IconStack2 />
                Move to
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-44">
                {RFP_STATUSES.map((value) => (
                  <DropdownMenuItem
                    key={value}
                    disabled={value === status || pending}
                    onClick={() => onSetStatus(value)}
                  >
                    {RFP_STATUS_LABEL[value]}
                    {value === status ? " · current" : ""}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            {showResetMenu ? (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <IconRestore />
                  Reset
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-48">
                  <DropdownMenuItem
                    disabled={pending}
                    onClick={() => onReset("agent")}
                  >
                    Agent
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={pending}
                    onClick={() => onReset("sheet")}
                  >
                    Sheet
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={pending}
                    onClick={() => onReset("both")}
                  >
                    Both
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ) : null}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <IconTrash />
              Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {detailActions?.startNextRound ? (
        <StartNextRoundDialog
          hideTrigger
          open={roundOpen}
          onOpenChange={setRoundOpen}
          parentFillId={detailActions.startNextRound.parentFillId}
          parentName={detailActions.startNextRound.parentName}
          parentCustomer={detailActions.startNextRound.parentCustomer}
          roundNumber={detailActions.startNextRound.roundNumber}
        />
      ) : null}

      {detailActions?.exportFill ? (
        <ExportWorkbookButton
          hideTrigger
          openSignal={exportSignal}
          fillId={detailActions.exportFill.fillId}
          pendingReviewCount={detailActions.exportFill.pendingReviewCount}
        />
      ) : null}

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename fill</DialogTitle>
            <DialogDescription>
              Update the name and customer shown on the desk.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor={`fill-name-${fillId}`}>Name</Label>
              <Input
                id={`fill-name-${fillId}`}
                value={nextName}
                onChange={(event) => setNextName(event.target.value)}
                maxLength={200}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`fill-customer-${fillId}`}>Customer</Label>
              <Input
                id={`fill-customer-${fillId}`}
                value={nextCustomer}
                onChange={(event) => setNextCustomer(event.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRenameOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={onRename} disabled={pending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this fill?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes “{name}” and its chat, files, and reviews. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Keep</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault()
                onDelete()
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

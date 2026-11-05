"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { IconDotsVertical, IconPencil, IconTrash } from "@tabler/icons-react"
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
  DropdownMenuTrigger,
} from "@ship-happens/ui/components/dropdown-menu"
import { Input } from "@ship-happens/ui/components/input"
import { Label } from "@ship-happens/ui/components/label"
import {
  deleteTemplate,
  updateTemplateIdentity,
} from "@/lib/server/actions/templates"

type TemplateManageMenuProps = {
  templateId: string
  name: string
  customer: string | null
  /** After delete, go here (defaults to /templates). */
  afterDeleteHref?: string
  size?: "sm" | "default"
}

export function TemplateManageMenu({
  templateId,
  name,
  customer,
  afterDeleteHref = "/templates",
  size = "sm",
}: TemplateManageMenuProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [nextName, setNextName] = useState(name)
  const [nextCustomer, setNextCustomer] = useState(customer ?? "")

  function openRename() {
    setNextName(name)
    setNextCustomer(customer ?? "")
    setRenameOpen(true)
  }

  function onRename() {
    startTransition(async () => {
      const result = await updateTemplateIdentity(templateId, {
        name: nextName,
        customer: nextCustomer,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Template updated")
      setRenameOpen(false)
      router.refresh()
    })
  }

  function onDelete() {
    startTransition(async () => {
      const result = await deleteTemplate(templateId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Template deleted")
      setDeleteOpen(false)
      router.push(afterDeleteHref)
      router.refresh()
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size={size === "sm" ? "icon-sm" : "icon"}
              aria-label="Manage template"
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
          className="w-44"
          onClick={(event) => event.stopPropagation()}
        >
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={openRename}>
              <IconPencil />
              Rename
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <IconTrash />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename template</DialogTitle>
            <DialogDescription>
              Updates the library name — fills already started keep their own
              copy.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor={`tpl-name-${templateId}`}>Name</Label>
              <Input
                id={`tpl-name-${templateId}`}
                value={nextName}
                onChange={(event) => setNextName(event.target.value)}
                maxLength={200}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`tpl-customer-${templateId}`}>Customer</Label>
              <Input
                id={`tpl-customer-${templateId}`}
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
            <AlertDialogTitle>Delete this template?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes “{name}” from the library. Existing fills that used it
              stay on the desk.
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

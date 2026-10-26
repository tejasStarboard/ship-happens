"use client"

import { useCallback, useState, useTransition } from "react"
import Link from "next/link"
import { IconCopy, IconKey, IconPlus, IconTrash } from "@tabler/icons-react"
import { toast } from "sonner"
import { Badge } from "@ship-happens/ui/components/badge"
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
import { Input } from "@ship-happens/ui/components/input"
import { Label } from "@ship-happens/ui/components/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ship-happens/ui/components/table"
import {
  createShAgentApiKey,
  deleteShAgentApiKey,
  listShAgentApiKeys,
  revokeShAgentApiKey,
  type ApiKeyListItem,
} from "@/lib/server/actions/api-keys"
import { formatDate } from "@/lib/shared/string"

function maskStart(row: ApiKeyListItem): string {
  // Better Auth stores the first N characters of the full key in `start`.
  if (row.start) return `${row.start}…`
  return `${row.prefix ?? "sh_"}…`
}

export function ApiKeysPanel({
  initialKeys,
}: {
  initialKeys: ApiKeyListItem[]
}) {
  const [keys, setKeys] = useState(initialKeys)
  const [pending, startTransition] = useTransition()
  const [createOpen, setCreateOpen] = useState(false)
  const [fillId, setFillId] = useState("")
  const [expiresInDays, setExpiresInDays] = useState("7")
  const [revealedKey, setRevealedKey] = useState<string | null>(null)

  const refreshHint = useCallback(() => {
    toast.message("Refresh the page to reload the key list from the server.")
  }, [])

  function onCreate() {
    const days = Number.parseInt(expiresInDays, 10)
    startTransition(async () => {
      const result = await createShAgentApiKey({
        fillId,
        expiresInDays: Number.isFinite(days) ? days : 7,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setRevealedKey(result.key)
      setCreateOpen(false)
      setFillId("")
      toast.success("API key created — copy it now; it won’t be shown again.")
      const listed = await listShAgentApiKeys()
      if (listed.ok) setKeys(listed.keys)
      else refreshHint()
    })
  }

  function onRevoke(id: string) {
    startTransition(async () => {
      const result = await revokeShAgentApiKey(id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setKeys((prev) =>
        prev.map((row) => (row.id === id ? { ...row, enabled: false } : row))
      )
      toast.success("API key revoked")
    })
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const result = await deleteShAgentApiKey(id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setKeys((prev) => prev.filter((row) => row.id !== id))
      toast.success("API key deleted")
    })
  }

  async function copyKey(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast.success("Copied")
    } catch {
      toast.error("Could not copy")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {revealedKey ? (
        <div className="rounded-[6px] border border-amber-500/40 bg-amber-500/5 px-4 py-3">
          <p className="text-sm font-medium">New API key (shown once)</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Set as <code className="text-xs">SH_API_KEY</code> for local{" "}
            <code className="text-xs">sh-client</code>. Store it securely — we
            only keep a hash.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="max-w-full truncate rounded-md border bg-background px-2 py-1 text-xs">
              {revealedKey}
            </code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void copyKey(revealedKey)}
            >
              <IconCopy className="size-3.5" />
              Copy
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setRevealedKey(null)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Fill-scoped keys for <code className="text-xs">sh-client</code> (
          <code className="text-xs">configId: sh-agent</code>). Agent sandboxes
          mint these automatically; create here for local debugging.
        </p>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger render={<Button type="button" size="sm" />}>
            <IconPlus className="size-3.5" />
            Create key
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create sh-client API key</DialogTitle>
              <DialogDescription>
                Scoped to one fill in this organization. The secret is shown
                once after create.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 py-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fill-id">Fill id</Label>
                <Input
                  id="fill-id"
                  placeholder="fill_…"
                  value={fillId}
                  onChange={(e) => setFillId(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="expires">Expires in (days)</Label>
                <Input
                  id="expires"
                  type="number"
                  min={1}
                  max={90}
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={pending || !fillId.trim()}
                onClick={onCreate}
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-[6px] border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Fill</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="w-[1%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  No agent API keys for this organization yet.
                </TableCell>
              </TableRow>
            ) : (
              keys.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <IconKey className="size-3.5 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="font-mono text-xs">
                          {maskStart(row)}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {row.name ?? row.id}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.fillId ? (
                      <Link
                        href={`/rfp/${row.fillId}`}
                        className="text-foreground underline-offset-2 hover:underline"
                      >
                        {row.fillId}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {row.enabled === false ? (
                      <Badge variant="secondary">Revoked</Badge>
                    ) : (
                      <Badge variant="outline">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(row.createdAt)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.expiresAt ? formatDate(row.expiresAt) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {row.enabled !== false ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() => onRevoke(row.id)}
                        >
                          Revoke
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => onDelete(row.id)}
                      >
                        <IconTrash className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

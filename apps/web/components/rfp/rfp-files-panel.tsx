"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  IconChevronDown as ChevronDownIcon,
  IconChevronRight as ChevronRightIcon,
  IconDownload as DownloadIcon,
  IconFile as FileIcon,
  IconFolder as FolderIcon,
  IconFolderOpen as FolderOpenIcon,
  IconRefresh as RefreshIcon,
  IconTrash as TrashIcon,
} from "@tabler/icons-react"
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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@ship-happens/ui/components/context-menu"
import { OfficeSpreadsheetViewer } from "@/components/shared/office-spreadsheet-viewer"
import type { RfpDetailView } from "@/lib/domain/rfp/rfp.types"
import { downloadFilledStatusMessage } from "@/components/rfp/download-filled-button"
import type { WorkspaceEntry } from "@/lib/workspace-types"
import { getOfficeViewerKind } from "@/lib/workspace-types"
import { cn } from "@/lib/utils"

function isHiddenTreeFile(entry: Extract<WorkspaceEntry, { type: "file" }>) {
  if (entry.name === ".workspaceignore") return true
  if (
    entry.name === "meta.json" &&
    entry.path.replaceAll("\\", "/").startsWith("filled/")
  ) {
    return true
  }
  return false
}

/** Drop internal sidecars; keep directory structure for the explorer. */
function filterTree(entries: WorkspaceEntry[]): WorkspaceEntry[] {
  const out: WorkspaceEntry[] = []
  for (const entry of entries) {
    if (entry.type === "file") {
      if (isHiddenTreeFile(entry)) continue
      out.push(entry)
      continue
    }
    const children = filterTree(entry.children)
    if (children.length === 0) continue
    out.push({ ...entry, children })
  }
  return out
}

function flattenFiles(
  entries: WorkspaceEntry[]
): Array<{ path: string; name: string }> {
  const out: Array<{ path: string; name: string }> = []
  const walk = (nodes: WorkspaceEntry[]) => {
    for (const entry of nodes) {
      if (entry.type === "file") {
        out.push({ path: entry.path, name: entry.name })
      } else {
        walk(entry.children)
      }
    }
  }
  walk(entries)
  return out
}

type PendingDelete = {
  path: string
  kind: "file" | "dir"
  name: string
}

type WorkspaceTreeActions = {
  selectedPath: string | null
  onSelect: (path: string) => void
  onDownload: (path: string, kind: "file" | "dir") => void
  onRequestDelete: (pending: PendingDelete) => void
}

function WorkspaceTreeNodes({
  entries,
  depth,
  ...actions
}: {
  entries: WorkspaceEntry[]
  depth: number
} & WorkspaceTreeActions) {
  return (
    <ul className="space-y-px">
      {entries.map((entry) =>
        entry.type === "dir" ? (
          <WorkspaceDirNode
            key={entry.path}
            entry={entry}
            depth={depth}
            {...actions}
          />
        ) : (
          <WorkspaceFileNode
            key={entry.path}
            entry={entry}
            depth={depth}
            {...actions}
          />
        )
      )}
    </ul>
  )
}

function EntryContextMenu({
  kind,
  path,
  name,
  children,
  onDownload,
  onRequestDelete,
}: {
  kind: "file" | "dir"
  path: string
  name: string
  children: ReactNode
  onDownload: (path: string, kind: "file" | "dir") => void
  onRequestDelete: (pending: PendingDelete) => void
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger render={<div className="w-full" />}>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-40">
        <ContextMenuItem
          className="text-xs"
          onClick={() => onDownload(path, kind)}
        >
          <DownloadIcon className="size-3.5" />
          Download
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="text-xs"
          variant="destructive"
          onClick={() => onRequestDelete({ path, kind, name })}
        >
          <TrashIcon className="size-3.5" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

function WorkspaceFileNode({
  entry,
  depth,
  selectedPath,
  onSelect,
  onDownload,
  onRequestDelete,
}: {
  entry: Extract<WorkspaceEntry, { type: "file" }>
  depth: number
} & WorkspaceTreeActions) {
  return (
    <li>
      <EntryContextMenu
        kind="file"
        path={entry.path}
        name={entry.name}
        onDownload={onDownload}
        onRequestDelete={onRequestDelete}
      >
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-1.5 rounded-[4px] py-1 pr-2 text-left text-sm hover:bg-accent",
            selectedPath === entry.path && "bg-accent"
          )}
          style={{ paddingLeft: 27 + depth * 12 }}
          onClick={() => onSelect(entry.path)}
        >
          <FileIcon className="size-3.5 shrink-0 opacity-60" />
          <span className="truncate">{entry.name}</span>
        </button>
      </EntryContextMenu>
    </li>
  )
}

function WorkspaceDirNode({
  entry,
  depth,
  selectedPath,
  onSelect,
  onDownload,
  onRequestDelete,
}: {
  entry: Extract<WorkspaceEntry, { type: "dir" }>
  depth: number
} & WorkspaceTreeActions) {
  const containsSelected = Boolean(
    selectedPath &&
      (selectedPath === entry.path ||
        selectedPath.startsWith(`${entry.path}/`))
  )
  const [open, setOpen] = useState(containsSelected || depth < 1)

  useEffect(() => {
    if (containsSelected) setOpen(true)
  }, [containsSelected])

  return (
    <li>
      <EntryContextMenu
        kind="dir"
        path={entry.path}
        name={entry.name}
        onDownload={onDownload}
        onRequestDelete={onRequestDelete}
      >
        <button
          type="button"
          className="flex w-full items-center gap-1.5 rounded-[4px] py-1 pr-2 text-left text-sm hover:bg-accent"
          style={{ paddingLeft: 8 + depth * 12 }}
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          {open ? (
            <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          {open ? (
            <FolderOpenIcon className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <FolderIcon className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate font-medium">{entry.name}</span>
        </button>
      </EntryContextMenu>
      {open ? (
        <WorkspaceTreeNodes
          entries={entry.children}
          depth={depth + 1}
          selectedPath={selectedPath}
          onSelect={onSelect}
          onDownload={onDownload}
          onRequestDelete={onRequestDelete}
        />
      ) : null}
    </li>
  )
}

export function RfpFilesPanel({ rfp }: { rfp: RfpDetailView }) {
  const [tree, setTree] = useState<WorkspaceEntry[]>([])
  const [error, setError] = useState<string>()
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [deleting, setDeleting] = useState(false)

  const source = rfp.sourceFiles[0] ?? null
  const visibleTree = useMemo(() => filterTree(tree), [tree])
  const files = useMemo(() => flattenFiles(visibleTree), [visibleTree])

  const refreshTree = useCallback(async () => {
    try {
      setError(undefined)
      const res = await fetch(
        `/api/workspace/${encodeURIComponent(rfp.id)}/tree`
      )
      if (!res.ok) {
        setError("Failed to load workspace files")
        return
      }
      const body = (await res.json()) as { tree?: WorkspaceEntry[] }
      setTree(Array.isArray(body.tree) ? body.tree : [])
    } catch {
      setError("Failed to load workspace files")
    }
  }, [rfp.id])

  useEffect(() => {
    void refreshTree()
  }, [refreshTree])

  const downloadEntry = useCallback(
    (entryPath: string, kind: "file" | "dir") => {
      if (kind === "dir") {
        const url = `/api/workspace/${encodeURIComponent(rfp.id)}/zip?path=${encodeURIComponent(entryPath)}`
        const a = document.createElement("a")
        a.href = url
        a.download = `${entryPath.split("/").pop() || "folder"}.zip`
        a.click()
        return
      }
      const url = `/api/workspace/${encodeURIComponent(rfp.id)}/download?path=${encodeURIComponent(entryPath)}`
      const a = document.createElement("a")
      a.href = url
      a.download = entryPath.split("/").pop() ?? "download"
      a.click()
    },
    [rfp.id]
  )

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      const res = await fetch(
        `/api/workspace/${encodeURIComponent(rfp.id)}/file?path=${encodeURIComponent(pendingDelete.path)}`,
        { method: "DELETE" }
      )
      if (!res.ok) {
        setError(
          pendingDelete.kind === "dir"
            ? "Failed to delete folder"
            : "Failed to delete file"
        )
        return
      }
      const deletedPath = pendingDelete.path
      setSelectedPath((current) =>
        current === deletedPath || current?.startsWith(`${deletedPath}/`)
          ? null
          : current
      )
      setPendingDelete(null)
      await refreshTree()
    } finally {
      setDeleting(false)
    }
  }, [pendingDelete, refreshTree, rfp.id])

  useEffect(() => {
    if (selectedPath) return
    const workbook = files.find((f) => getOfficeViewerKind(f.path))
    if (workbook) setSelectedPath(workbook.path)
  }, [files, selectedPath])

  useEffect(() => {
    if (!selectedPath) {
      setPreviewUrl(null)
      return
    }
    let cancelled = false
    setLoadingPreview(true)
    void (async () => {
      try {
        const res = await fetch(
          `/api/workspace/${encodeURIComponent(rfp.id)}/file?path=${encodeURIComponent(selectedPath)}`
        )
        if (!res.ok) {
          if (!cancelled) setPreviewUrl(null)
          return
        }
        const body = (await res.json()) as { publicUrl?: string | null }
        if (!cancelled) setPreviewUrl(body.publicUrl ?? null)
      } catch {
        if (!cancelled) setPreviewUrl(null)
      } finally {
        if (!cancelled) setLoadingPreview(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [rfp.id, selectedPath])

  const officeKind = selectedPath ? getOfficeViewerKind(selectedPath) : null
  const downloadStatus = downloadFilledStatusMessage(
    rfp.filledFileUrl,
    rfp.exportDownloadBlockedReason
  )

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col gap-3 lg:max-h-full lg:w-72">
        <div className="rounded-[6px] border border-border bg-card p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium tracking-tight">Source</h2>
            {source ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                render={
                  <a
                    href={source.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    download
                  />
                }
                nativeButton={false}
              >
                <DownloadIcon className="size-3.5" />
              </Button>
            ) : null}
          </div>
          {source ? (
            <p className="truncate text-sm">{source.fileName}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No source workbook</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">{downloadStatus}</p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col rounded-[6px] border border-border bg-card">
          <div className="flex h-9 items-center justify-between border-b border-border px-3">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Workspace
            </span>
            <Button
              aria-label="Refresh files"
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => void refreshTree()}
            >
              <RefreshIcon className="size-3.5" />
            </Button>
          </div>
          {error ? (
            <p className="p-3 text-sm text-destructive">{error}</p>
          ) : visibleTree.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No files yet</p>
          ) : (
            <div className="max-h-[40vh] overflow-auto p-1 lg:max-h-none lg:flex-1">
              <WorkspaceTreeNodes
                entries={visibleTree}
                depth={0}
                selectedPath={selectedPath}
                onSelect={setSelectedPath}
                onDownload={downloadEntry}
                onRequestDelete={setPendingDelete}
              />
            </div>
          )}
          <div className="border-t border-border p-2">
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => {
                const url = `/api/workspace/${encodeURIComponent(rfp.id)}/zip`
                const a = document.createElement("a")
                a.href = url
                a.download = `${rfp.id}.zip`
                a.click()
              }}
            >
              Download all
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[6px] border border-border bg-card">
        <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3">
          <span className="truncate text-sm">
            {selectedPath ?? source?.fileName ?? "Preview"}
          </span>
          {selectedPath ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-7"
              onClick={() => downloadEntry(selectedPath, "file")}
            >
              <DownloadIcon className="size-3.5" />
              Download
            </Button>
          ) : null}
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden bg-background">
          {loadingPreview ? (
            <p className="p-4 text-sm text-muted-foreground">
              Loading preview…
            </p>
          ) : officeKind && previewUrl ? (
            <OfficeSpreadsheetViewer
              fileUrl={previewUrl}
              title={selectedPath ?? "Workbook"}
              className="absolute inset-0 min-h-0 rounded-none border-0"
            />
          ) : source && !selectedPath ? (
            <OfficeSpreadsheetViewer
              fileUrl={source.fileUrl}
              title={source.fileName}
              className="absolute inset-0 min-h-0 rounded-none border-0"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-muted-foreground">
              <FileIcon className="size-8 opacity-40" />
              <p className="text-sm">
                {selectedPath
                  ? "No Office preview for this file"
                  : "Select a workbook to preview"}
              </p>
            </div>
          )}
        </div>
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDelete?.kind === "dir"
                ? "Delete this folder?"
                : "Delete this file?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.kind === "dir"
                ? `“${pendingDelete.name}” and everything inside it will be removed from this workspace.`
                : `“${pendingDelete?.name ?? "This file"}” will be removed from this workspace.`}{" "}
              This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault()
                void confirmDelete()
              }}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

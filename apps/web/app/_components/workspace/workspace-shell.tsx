"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  FileEditorPanel,
  type EditorTab,
} from "@/app/_components/workspace/file-editor"
import { FileTreePanel } from "@/app/_components/workspace/file-tree"
import {
  ChatPanel,
  type ChatTabState,
} from "@/app/_components/workspace/chat-panel"
import {
  PanelResizeHandle,
  useResizablePanels,
} from "@/app/_components/workspace/panel-resize"
import { UserMenu } from "@/app/_components/user-menu"
import type { WorkspaceEntry } from "@/lib/workspace-types"
import { getOfficeViewerKind, isTextPath } from "@/lib/workspace-types"

type WorkspacePayload = {
  readonly id: string
  readonly title: string
  readonly chats: Array<{
    readonly id: string
    readonly sessionId: string | null
    readonly title: string
    readonly createdAt?: number
    readonly updatedAt?: number
    readonly hiddenFromTabs?: boolean
    readonly events?: readonly unknown[]
    readonly priorMessages?: readonly unknown[]
  }>
}

function toChatTabState(chat: WorkspacePayload["chats"][number]): ChatTabState {
  const createdAt = chat.createdAt ?? Date.now()
  return {
    id: chat.id,
    sessionId: chat.sessionId,
    title: chat.title,
    createdAt,
    updatedAt: chat.updatedAt ?? createdAt,
    hiddenFromTabs: chat.hiddenFromTabs === true,
    events: Array.isArray(chat.events) ? chat.events : [],
    priorMessages: Array.isArray(chat.priorMessages) ? chat.priorMessages : [],
  }
}

export function WorkspaceShell({
  workspaceId: initialWorkspaceId,
  embedded = false,
}: {
  readonly workspaceId?: string
  /** When true, fill parent height and hide standalone chrome (RFP Agent tab). */
  readonly embedded?: boolean
}) {
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(
    initialWorkspaceId
  )
  const [chats, setChats] = useState<ChatTabState[]>([])
  const [activeChatId, setActiveChatId] = useState<string>("")
  const [tree, setTree] = useState<WorkspaceEntry[]>([])
  const [tabs, setTabs] = useState<EditorTab[]>([])
  const [activePath, setActivePath] = useState<string | null>(null)
  const [treeError, setTreeError] = useState<string>()
  const [bootError, setBootError] = useState<string>()
  const [chatInsertText, setChatInsertText] = useState<string | null>(null)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tabsRef = useRef(tabs)
  tabsRef.current = tabs
  const didAutoOpenWorkbookRef = useRef<string | null>(null)

  const fileList = useMemo(() => flattenFiles(tree), [tree])
  const openTabs = useMemo(() => tabs.map((tab) => tab.path), [tabs])

  const applyWorkspace = useCallback(
    (workspace: WorkspacePayload, preferChatId?: string) => {
      setWorkspaceId(workspace.id)
      let nextChats = workspace.chats.map(toChatTabState)
      let openChats = nextChats.filter((chat) => !chat.hiddenFromTabs)
      // Always keep at least one tab visible so the shell can mount.
      if (openChats.length === 0 && nextChats.length > 0) {
        const reopenId =
          preferChatId && nextChats.some((chat) => chat.id === preferChatId)
            ? preferChatId
            : nextChats[0]!.id
        nextChats = nextChats.map((chat) =>
          chat.id === reopenId ? { ...chat, hiddenFromTabs: false } : chat
        )
        openChats = nextChats.filter((chat) => !chat.hiddenFromTabs)
        void fetch(
          `/api/workspaces/${encodeURIComponent(workspace.id)}/chats/${encodeURIComponent(reopenId)}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ hiddenFromTabs: false }),
          }
        )
      }
      setChats(nextChats)
      setActiveChatId((current) => {
        if (
          preferChatId &&
          nextChats.some((chat) => chat.id === preferChatId)
        ) {
          return preferChatId
        }
        if (current && openChats.some((chat) => chat.id === current)) {
          return current
        }
        return openChats[0]?.id ?? nextChats[0]?.id ?? ""
      })
    },
    []
  )

  const refreshTree = useCallback(async (id: string) => {
    try {
      const response = await fetch(
        `/api/workspace/${encodeURIComponent(id)}/tree`
      )
      if (!response.ok) {
        throw new Error(await response.text())
      }
      const body = (await response.json()) as { tree: WorkspaceEntry[] }
      setTree(body.tree)
      setTreeError(undefined)
    } catch (error) {
      setTreeError(
        error instanceof Error ? error.message : "Failed to load files"
      )
    }
  }, [])

  useEffect(() => {
    if (!initialWorkspaceId) {
      setBootError("Missing workspace id")
      return
    }

    let cancelled = false

    const boot = async () => {
      try {
        const response = await fetch(
          `/api/workspaces/${encodeURIComponent(initialWorkspaceId)}`
        )
        if (!response.ok) throw new Error("Workspace not found")
        const workspace = (await response.json()) as WorkspacePayload
        if (!cancelled) applyWorkspace(workspace)
      } catch (error) {
        if (!cancelled) {
          setBootError(
            error instanceof Error ? error.message : "Failed to open workspace"
          )
        }
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [applyWorkspace, initialWorkspaceId])

  useEffect(() => {
    if (!workspaceId) return
    void refreshTree(workspaceId)
  }, [workspaceId, refreshTree])

  const refreshOpenOfficePublicUrls = useCallback(async (id: string) => {
    const officeTabs = tabsRef.current.filter(
      (tab) => tab.viewerKind === "xlsx" || tab.publicUrl
    )
    if (officeTabs.length === 0) return

    const updates = await Promise.all(
      officeTabs.map(async (tab) => {
        try {
          const response = await fetch(
            `/api/workspace/${encodeURIComponent(id)}/file?path=${encodeURIComponent(tab.path)}`
          )
          if (!response.ok) return null
          const body = (await response.json()) as {
            path: string
            publicUrl?: string | null
          }
          return {
            path: tab.path,
            publicUrl: body.publicUrl ?? null,
          }
        } catch {
          return null
        }
      })
    )

    setTabs((prev) =>
      prev.map((tab) => {
        const update = updates.find((entry) => entry && entry.path === tab.path)
        if (!update || update.publicUrl === tab.publicUrl) return tab
        return { ...tab, publicUrl: update.publicUrl }
      })
    )
  }, [])

  const scheduleRefresh = useCallback(() => {
    if (!workspaceId) return
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    // Delay so turn.completed Blob persist can finish before we re-fetch publicUrl.
    refreshTimer.current = setTimeout(() => {
      void (async () => {
        await refreshTree(workspaceId)
        await refreshOpenOfficePublicUrls(workspaceId)
      })()
    }, 1500)
  }, [workspaceId, refreshTree, refreshOpenOfficePublicUrls])

  const openFile = useCallback(
    async (path: string) => {
      if (!workspaceId) return
      if (tabsRef.current.some((tab) => tab.path === path)) {
        setActivePath(path)
        return
      }
      const response = await fetch(
        `/api/workspace/${encodeURIComponent(workspaceId)}/file?path=${encodeURIComponent(path)}`
      )
      if (!response.ok) {
        setTreeError("Failed to open file")
        return
      }
      const body = (await response.json()) as {
        path: string
        content: string | null
        encoding: "utf-8" | "binary"
        editable: boolean
        publicUrl?: string | null
      }
      const viewerKind = getOfficeViewerKind(body.path)
      setTabs((prev) => {
        if (prev.some((tab) => tab.path === body.path)) return prev
        return [
          ...prev,
          {
            path: body.path,
            content: body.content ?? "",
            dirty: false,
            editable: !viewerKind && body.editable && body.encoding === "utf-8",
            encoding: body.encoding,
            viewerKind,
            publicUrl: body.publicUrl ?? null,
          },
        ]
      })
      setActivePath(body.path)
    },
    [workspaceId]
  )

  useEffect(() => {
    if (!workspaceId) return
    if (didAutoOpenWorkbookRef.current === workspaceId) return
    if (tabsRef.current.length > 0) return

    const defaultPath = pickDefaultWorkbookPath(flattenFiles(tree))
    if (!defaultPath) return

    didAutoOpenWorkbookRef.current = workspaceId
    void openFile(defaultPath)
  }, [workspaceId, tree, openFile])

  const closeTab = useCallback(
    (path: string) => {
      setTabs((prev) => {
        const next = prev.filter((tab) => tab.path !== path)
        if (activePath === path) {
          setActivePath(next.at(-1)?.path ?? null)
        }
        return next
      })
    },
    [activePath]
  )

  const changeTab = useCallback((path: string, content: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.path === path ? { ...tab, content, dirty: true } : tab
      )
    )
  }, [])

  const saveTab = useCallback(
    async (path: string) => {
      if (!workspaceId) return
      const tab = tabs.find((entry) => entry.path === path)
      if (!tab || !tab.editable) return
      const response = await fetch(
        `/api/workspace/${encodeURIComponent(workspaceId)}/file`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ path, content: tab.content }),
        }
      )
      if (!response.ok) {
        setTreeError("Failed to save file")
        return
      }
      setTabs((prev) =>
        prev.map((entry) =>
          entry.path === path ? { ...entry, dirty: false } : entry
        )
      )
      scheduleRefresh()
    },
    [workspaceId, scheduleRefresh, tabs]
  )

  const downloadFile = useCallback(
    (path: string) => {
      if (!workspaceId) return
      const url = `/api/workspace/${encodeURIComponent(workspaceId)}/download?path=${encodeURIComponent(path)}`
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = path.split("/").pop() ?? "download"
      anchor.click()
    },
    [workspaceId]
  )

  const downloadAll = useCallback(() => {
    if (!workspaceId) return
    const url = `/api/workspace/${encodeURIComponent(workspaceId)}/zip`
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${workspaceId}.zip`
    anchor.click()
  }, [workspaceId])

  const renameFile = useCallback(
    async (fromPath: string, toPath: string) => {
      if (!workspaceId) return
      const response = await fetch(
        `/api/workspace/${encodeURIComponent(workspaceId)}/file`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ from: fromPath, to: toPath }),
        }
      )
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string
        } | null
        setTreeError(body?.error ?? "Failed to rename")
        return
      }
      setTabs((prev) =>
        prev.map((tab) =>
          tab.path === fromPath
            ? { ...tab, path: toPath, viewerKind: getOfficeViewerKind(toPath) }
            : tab
        )
      )
      setActivePath((current) => (current === fromPath ? toPath : current))
      await refreshTree(workspaceId)
    },
    [refreshTree, workspaceId]
  )

  const deleteFile = useCallback(
    async (path: string) => {
      if (!workspaceId) return
      if (!window.confirm(`Delete ${path}?`)) return
      const response = await fetch(
        `/api/workspace/${encodeURIComponent(workspaceId)}/file?path=${encodeURIComponent(path)}`,
        { method: "DELETE" }
      )
      if (!response.ok) {
        setTreeError("Failed to delete")
        return
      }
      setTabs((prev) => {
        const next = prev.filter((tab) => tab.path !== path)
        setActivePath((current) =>
          current === path ? (next.at(-1)?.path ?? null) : current
        )
        return next
      })
      await refreshTree(workspaceId)
    },
    [refreshTree, workspaceId]
  )

  const referenceInChat = useCallback((path: string) => {
    setChatInsertText(`\`/workspace/${path}\``)
  }, [])

  const uploadFiles = useCallback(
    async (files: FileList, directory: string) => {
      if (!workspaceId) return
      const form = new FormData()
      form.set("directory", directory)
      for (const file of files) {
        form.append("files", file)
      }
      const response = await fetch(
        `/api/workspace/${encodeURIComponent(workspaceId)}/upload`,
        {
          method: "POST",
          body: form,
        }
      )
      if (!response.ok) {
        setTreeError("Upload failed")
        return
      }
      const body = (await response.json()) as { files: string[] }
      await refreshTree(workspaceId)
      const first = body.files.find((file) => isTextPath(file))
      if (first) {
        await openFile(first)
      }
    },
    [workspaceId, openFile, refreshTree]
  )

  const addChat = useCallback(async () => {
    if (!workspaceId) return
    const response = await fetch(
      `/api/workspaces/${encodeURIComponent(workspaceId)}/chats`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }
    )
    if (!response.ok) {
      setTreeError("Failed to create chat")
      return
    }
    const chat = toChatTabState(
      (await response.json()) as WorkspacePayload["chats"][number]
    )
    setChats((prev) => [...prev, chat])
    setActiveChatId(chat.id)
  }, [workspaceId])

  const selectChat = useCallback(
    async (chatId: string) => {
      if (!workspaceId) return
      const existing = chats.find((chat) => chat.id === chatId)
      if (!existing) return

      if (existing.hiddenFromTabs) {
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === chatId
              ? { ...chat, hiddenFromTabs: false, updatedAt: Date.now() }
              : chat
          )
        )
        setActiveChatId(chatId)
        const response = await fetch(
          `/api/workspaces/${encodeURIComponent(workspaceId)}/chats/${encodeURIComponent(chatId)}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ hiddenFromTabs: false }),
          }
        )
        if (!response.ok) {
          setTreeError("Failed to reopen chat")
          setChats((prev) =>
            prev.map((chat) =>
              chat.id === chatId ? { ...chat, hiddenFromTabs: true } : chat
            )
          )
          return
        }
        const chat = toChatTabState(
          (await response.json()) as WorkspacePayload["chats"][number]
        )
        setChats((prev) =>
          prev.map((entry) => (entry.id === chat.id ? chat : entry))
        )
        return
      }

      setActiveChatId(chatId)
    },
    [chats, workspaceId]
  )

  const closeChat = useCallback(
    async (chatId: string) => {
      if (!workspaceId) return
      const openCount = chats.filter((chat) => !chat.hiddenFromTabs).length
      // Keep at least one open tab so the workspace shell stays mounted.
      if (openCount <= 1) return
      // Soft-close: keep the eve session running; only hide from the tab strip.
      setChats((prev) => {
        const next = prev.map((chat) =>
          chat.id === chatId
            ? { ...chat, hiddenFromTabs: true, updatedAt: Date.now() }
            : chat
        )
        if (activeChatId === chatId) {
          const stillOpen = next.filter((chat) => !chat.hiddenFromTabs)
          setActiveChatId(stillOpen.at(-1)?.id ?? "")
        }
        return next
      })
      const response = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/chats/${encodeURIComponent(chatId)}`,
        { method: "DELETE" }
      )
      if (!response.ok) {
        setTreeError("Failed to close chat")
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === chatId ? { ...chat, hiddenFromTabs: false } : chat
          )
        )
      }
    },
    [activeChatId, chats, workspaceId]
  )

  const bindSession = useCallback(
    async (chatId: string, sessionId: string) => {
      if (!workspaceId) return
      setChats((prev) =>
        prev.map((chat) => (chat.id === chatId ? { ...chat, sessionId } : chat))
      )
      await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/chats/${encodeURIComponent(chatId)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId }),
        }
      )
      // Session bind may have merged files that landed under the session folder.
      void refreshTree(workspaceId)
    },
    [refreshTree, workspaceId]
  )

  const clearSession = useCallback(
    async (chatId: string) => {
      if (!workspaceId) return
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? { ...chat, sessionId: null, updatedAt: Date.now() }
            : chat
        )
      )
      await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/chats/${encodeURIComponent(chatId)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId: null }),
        }
      )
    },
    [workspaceId]
  )

  const persistEvents = useCallback(
    async (
      chatId: string,
      events: readonly unknown[],
      priorMessages?: readonly unknown[]
    ) => {
      if (!workspaceId) return
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                events: [...events],
                ...(priorMessages !== undefined
                  ? { priorMessages: [...priorMessages] }
                  : {}),
                updatedAt: Date.now(),
              }
            : chat
        )
      )
      await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/chats/${encodeURIComponent(chatId)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            events,
            ...(priorMessages !== undefined ? { priorMessages } : {}),
          }),
        }
      )
    },
    [workspaceId]
  )

  const renameChat = useCallback(
    async (chatId: string, title: string) => {
      if (!workspaceId) return
      setChats((prev) =>
        prev.map((chat) => (chat.id === chatId ? { ...chat, title } : chat))
      )
      await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}/chats/${encodeURIComponent(chatId)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title }),
        }
      )
    },
    [workspaceId]
  )

  const workspaceContext = useMemo(
    () => ({
      workspaceId,
      workspaceFiles: fileList,
      openTabs,
      activeTab: activePath,
    }),
    [activePath, fileList, openTabs, workspaceId]
  )

  const { widths, containerRef, startResize } = useResizablePanels()

  const shellHeight = embedded ? "h-full min-h-0" : "h-dvh"

  if (bootError) {
    return (
      <div
        className={`flex ${shellHeight} items-center justify-center bg-background text-sm text-destructive`}
      >
        {bootError}
      </div>
    )
  }

  if (!workspaceId || !activeChatId) {
    return (
      <div
        className={`flex ${shellHeight} items-center justify-center bg-background text-sm text-muted-foreground`}
      >
        Opening workspace…
      </div>
    )
  }

  return (
    <div
      className={`flex ${shellHeight} flex-col overflow-hidden bg-background text-foreground`}
    >
      {embedded ? (
        treeError ? (
          <div className="shrink-0 border-b border-border px-3 py-1.5 text-[11px] text-destructive">
            {treeError}
          </div>
        ) : null
      ) : (
        <header className="flex h-10 shrink-0 items-center gap-3 border-b border-border px-3">
          <Link
            className="text-sm font-medium tracking-tight hover:underline"
            href="/rfp"
          >
            Fills
          </Link>
          <span className="text-sm text-muted-foreground">/</span>
          <span className="truncate font-mono text-[11px] text-muted-foreground">
            {workspaceId}
          </span>
          {treeError ? (
            <span className="truncate text-[11px] text-destructive">
              {treeError}
            </span>
          ) : null}
          <div className="ml-auto">
            <UserMenu variant="inline" />
          </div>
        </header>
      )}

      <div className="flex min-h-0 flex-1" ref={containerRef}>
        <aside
          className="min-h-0 shrink-0 overflow-hidden"
          style={{ width: widths.left }}
        >
          <FileTreePanel
            activePath={activePath}
            disabled={!workspaceId}
            onDelete={deleteFile}
            onDownload={downloadFile}
            onDownloadAll={downloadAll}
            onOpen={(path) => void openFile(path)}
            onReferenceInChat={referenceInChat}
            onRefresh={() => {
              void refreshTree(workspaceId)
            }}
            onRename={renameFile}
            onUpload={uploadFiles}
            tree={tree}
          />
        </aside>

        <PanelResizeHandle
          onResizeStart={(clientX) => startResize("left", clientX)}
        />

        <section className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <FileEditorPanel
            activePath={activePath}
            onChange={changeTab}
            onClose={closeTab}
            onDownload={downloadFile}
            onSave={saveTab}
            onSelect={setActivePath}
            sessionId={workspaceId}
            tabs={tabs}
          />
        </section>

        <PanelResizeHandle
          onResizeStart={(clientX) => startResize("right", clientX)}
        />

        <aside
          className="min-h-0 shrink-0 overflow-hidden"
          style={{ width: widths.right }}
        >
          <ChatPanel
            activeChatId={activeChatId}
            chats={chats}
            insertText={chatInsertText}
            onAddChat={addChat}
            onBindSession={bindSession}
            onClearSession={clearSession}
            onCloseChat={closeChat}
            onPersistEvents={persistEvents}
            onIdle={scheduleRefresh}
            onInsertTextConsumed={() => setChatInsertText(null)}
            onRenameChat={renameChat}
            onSelectChat={selectChat}
            workspaceContext={workspaceContext}
            workspaceId={workspaceId}
          />
        </aside>
      </div>
    </div>
  )
}

function flattenFiles(entries: WorkspaceEntry[]): string[] {
  const files: string[] = []
  const walk = (nodes: WorkspaceEntry[]) => {
    for (const node of nodes) {
      if (node.type === "file") files.push(node.path)
      else walk(node.children)
    }
  }
  walk(entries)
  return files
}

/** Prefer the intake workbook under `source/`, else any spreadsheet in the tree. */
function pickDefaultWorkbookPath(files: readonly string[]): string | null {
  const spreadsheets = files.filter(
    (path) => getOfficeViewerKind(path) === "xlsx"
  )
  if (spreadsheets.length === 0) return null
  return (
    spreadsheets.find((path) => path.startsWith("source/")) ??
    spreadsheets[0] ??
    null
  )
}

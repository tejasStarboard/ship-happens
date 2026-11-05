"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AgentChat } from "@/app/_components/agent-chat"

type WorkspacePayload = {
  readonly id: string
  readonly title: string
  readonly chats: Array<{
    readonly id: string
    readonly sessionId: string | null
    readonly title: string
    readonly createdAt?: number
    readonly updatedAt?: number
    readonly events?: readonly unknown[]
    readonly priorMessages?: readonly unknown[]
  }>
}

type ChatState = {
  readonly id: string
  readonly sessionId: string | null
  readonly title: string
  readonly events: readonly unknown[]
  readonly priorMessages: readonly unknown[]
}

/**
 * Single-thread agent chat for an RFP fill (one chat per workspace).
 * No multi-tab chrome — Files / Reviews live on sibling tabs.
 */
export function RfpChatPanel({
  workspaceId,
  insertText,
  onInsertTextConsumed,
}: {
  readonly workspaceId: string
  readonly insertText?: string | null
  readonly onInsertTextConsumed?: () => void
}) {
  const [chat, setChat] = useState<ChatState | null>(null)
  const [bootError, setBootError] = useState<string>()
  const [fileList, setFileList] = useState<string[]>([])

  const loadWorkspace = useCallback(async () => {
    try {
      setBootError(undefined)
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceId)}`
      )
      if (!res.ok) {
        setBootError("Failed to load workspace chat")
        return
      }
      const body = (await res.json()) as WorkspacePayload
      const first = body.chats[0]
      if (!first) {
        const created = await fetch(
          `/api/workspaces/${encodeURIComponent(workspaceId)}/chats`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ title: "Fill agent" }),
          }
        )
        if (!created.ok) {
          setBootError("Failed to create chat")
          return
        }
        const chatBody = (await created.json()) as WorkspacePayload["chats"][number]
        setChat({
          id: chatBody.id,
          sessionId: chatBody.sessionId,
          title: chatBody.title,
          events: Array.isArray(chatBody.events) ? chatBody.events : [],
          priorMessages: Array.isArray(chatBody.priorMessages)
            ? chatBody.priorMessages
            : [],
        })
        return
      }
      setChat({
        id: first.id,
        sessionId: first.sessionId,
        title: first.title,
        events: Array.isArray(first.events) ? first.events : [],
        priorMessages: Array.isArray(first.priorMessages)
          ? first.priorMessages
          : [],
      })
    } catch {
      setBootError("Failed to load workspace chat")
    }
  }, [workspaceId])

  const refreshFiles = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/workspace/${encodeURIComponent(workspaceId)}/tree`
      )
      if (!res.ok) return
      const body = (await res.json()) as {
        tree?: Array<{ type: string; path: string; children?: unknown[] }>
      }
      const paths: string[] = []
      const walk = (nodes: typeof body.tree) => {
        if (!nodes) return
        for (const node of nodes) {
          if (node.type === "file") paths.push(node.path)
          else if (Array.isArray(node.children)) {
            walk(node.children as typeof body.tree)
          }
        }
      }
      walk(body.tree)
      setFileList(paths)
    } catch {
      /* ignore */
    }
  }, [workspaceId])

  useEffect(() => {
    void loadWorkspace()
    void refreshFiles()
  }, [loadWorkspace, refreshFiles])

  const workspaceContext = useMemo(
    () => ({
      workspaceId,
      workspaceFiles: fileList,
      openTabs: [] as string[],
      activeTab: null as string | null,
    }),
    [workspaceId, fileList]
  )

  if (bootError) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-destructive">
        {bootError}
      </div>
    )
  }

  if (!chat) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        Loading chat…
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <AgentChat
        key={chat.id}
        initialEvents={chat.events}
        initialPriorMessages={chat.priorMessages}
        insertText={insertText}
        onInsertTextConsumed={onInsertTextConsumed}
        onClearSession={async () => {
          await fetch(
            `/api/workspaces/${encodeURIComponent(workspaceId)}/chats/${encodeURIComponent(chat.id)}`,
            {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ sessionId: null }),
            }
          )
          setChat((c) => (c ? { ...c, sessionId: null } : c))
        }}
        onIdle={() => {
          void refreshFiles()
        }}
        onPersistEvents={(events, priorMessages) => {
          void fetch(
            `/api/workspaces/${encodeURIComponent(workspaceId)}/chats/${encodeURIComponent(chat.id)}`,
            {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                events,
                ...(priorMessages != null ? { priorMessages } : {}),
              }),
            }
          )
        }}
        onSessionId={(sessionId) => {
          void fetch(
            `/api/workspaces/${encodeURIComponent(workspaceId)}/chats/${encodeURIComponent(chat.id)}`,
            {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ sessionId }),
            }
          )
          setChat((c) => (c ? { ...c, sessionId } : c))
        }}
        onTitleHint={(title) => {
          if (!chat.title.startsWith("Chat ") && chat.title !== "Fill agent") {
            return
          }
          void fetch(
            `/api/workspaces/${encodeURIComponent(workspaceId)}/chats/${encodeURIComponent(chat.id)}`,
            {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ title }),
            }
          )
          setChat((c) => (c ? { ...c, title } : c))
        }}
        sessionId={chat.sessionId ?? undefined}
        syncUrl={false}
        variant="panel"
        workspaceContext={workspaceContext}
      />
    </div>
  )
}

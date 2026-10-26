"use client"

import {
  IconHistory as HistoryIcon,
  IconPlus as PlusIcon,
  IconX as XIcon,
} from "@tabler/icons-react"
import { useMemo, useState } from "react"
import {
  AgentChat,
  type WorkspaceChatContext,
} from "@/app/_components/agent-chat"
import { Button } from "@ship-happens/ui/components/button"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@ship-happens/ui/components/popover"
import { cn } from "@/lib/utils"

export type ChatTabState = {
  readonly id: string
  readonly sessionId: string | null
  readonly title: string
  readonly createdAt: number
  readonly updatedAt: number
  readonly hiddenFromTabs: boolean
  /** Current eve session stream only (not merged across remints). */
  readonly events: readonly unknown[]
  /** Frozen transcript before the current session (reload-safe order). */
  readonly priorMessages: readonly unknown[]
}

const HISTORY_PAGE_SIZE = 10
/** ~25 rows at ~2rem each — list scrolls inside this height. */
const HISTORY_LIST_MAX_HEIGHT_CLASS = "max-h-[32.5rem]"

export function ChatPanel({
  workspaceId,
  chats,
  activeChatId,
  workspaceContext,
  insertText,
  onSelectChat,
  onAddChat,
  onCloseChat,
  onBindSession,
  onClearSession,
  onPersistEvents,
  onIdle,
  onRenameChat,
  onInsertTextConsumed,
}: {
  readonly workspaceId: string
  readonly chats: readonly ChatTabState[]
  readonly activeChatId: string
  readonly workspaceContext: WorkspaceChatContext
  readonly insertText?: string | null
  readonly onSelectChat: (chatId: string) => void | Promise<void>
  readonly onAddChat: () => void | Promise<void>
  readonly onCloseChat: (chatId: string) => void | Promise<void>
  readonly onBindSession: (
    chatId: string,
    sessionId: string
  ) => void | Promise<void>
  readonly onClearSession: (chatId: string) => void | Promise<void>
  readonly onPersistEvents: (
    chatId: string,
    events: readonly unknown[],
    priorMessages?: readonly unknown[]
  ) => void | Promise<void>
  readonly onIdle: () => void
  readonly onRenameChat: (chatId: string, title: string) => void | Promise<void>
  readonly onInsertTextConsumed?: () => void
}) {
  const openChats = useMemo(
    () => chats.filter((chat) => !chat.hiddenFromTabs),
    [chats]
  )
  const active =
    openChats.find((chat) => chat.id === activeChatId) ?? openChats[0]
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyVisible, setHistoryVisible] = useState(HISTORY_PAGE_SIZE)

  const historyChats = useMemo(
    () =>
      [...chats].sort(
        (a, b) =>
          b.updatedAt - a.updatedAt ||
          b.createdAt - a.createdAt ||
          b.id.localeCompare(a.id)
      ),
    [chats]
  )
  const visibleHistory = historyChats.slice(0, historyVisible)
  const hasOlder = historyVisible < historyChats.length

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-11 shrink-0 items-end gap-px border-b border-border bg-muted/40 px-1">
        <div className="flex min-w-0 flex-1 [scrollbar-width:none] items-end gap-px overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {openChats.map((chat) => {
            const selected = chat.id === active?.id
            return (
              <div
                className={cn(
                  "group flex max-w-40 shrink-0 items-center gap-1 border-b-2 border-transparent px-2.5 py-2 text-xs",
                  selected
                    ? "border-foreground bg-background text-foreground"
                    : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                )}
                key={chat.id}
              >
                <button
                  className="min-w-0 truncate text-left"
                  onClick={() => void onSelectChat(chat.id)}
                  title={chat.title}
                  type="button"
                >
                  {chat.title}
                </button>
                {openChats.length > 1 ? (
                  <button
                    aria-label={`Close ${chat.title}`}
                    className="rounded p-0.5 opacity-50 hover:bg-accent hover:opacity-100"
                    onClick={() => void onCloseChat(chat.id)}
                    type="button"
                  >
                    <XIcon className="size-3" />
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>
        <Popover
          onOpenChange={(open) => {
            setHistoryOpen(open)
            if (open) setHistoryVisible(HISTORY_PAGE_SIZE)
          }}
          open={historyOpen}
        >
          <PopoverTrigger
            aria-label="Chat history"
            className="mb-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            type="button"
          >
            <HistoryIcon className="size-3.5" />
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-72 gap-0 p-0"
            side="bottom"
            sideOffset={6}
          >
            <PopoverHeader className="border-b border-border px-3 py-2">
              <PopoverTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Chat history
              </PopoverTitle>
            </PopoverHeader>
            <div
              className={cn(
                "overflow-y-auto overscroll-contain py-1",
                HISTORY_LIST_MAX_HEIGHT_CLASS
              )}
            >
              {visibleHistory.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                  No chats yet
                </p>
              ) : (
                visibleHistory.map((chat) => {
                  const selected =
                    chat.id === active?.id && !chat.hiddenFromTabs
                  return (
                    <button
                      className={cn(
                        "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-xs hover:bg-accent",
                        selected && "bg-accent/60"
                      )}
                      key={chat.id}
                      onClick={() => {
                        void onSelectChat(chat.id)
                        setHistoryOpen(false)
                      }}
                      type="button"
                    >
                      <span className="w-full truncate font-medium">
                        {chat.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelativeTime(chat.updatedAt)}
                        {chat.hiddenFromTabs ? " · closed" : ""}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
            {hasOlder ? (
              <div className="border-t border-border p-1.5">
                <Button
                  className="h-8 w-full text-xs"
                  onClick={() =>
                    setHistoryVisible((n) => n + HISTORY_PAGE_SIZE)
                  }
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  View older chats
                </Button>
              </div>
            ) : null}
          </PopoverContent>
        </Popover>
        <Button
          aria-label="New chat"
          className="mb-1 size-7 shrink-0"
          onClick={() => void onAddChat()}
          size="icon"
          type="button"
          variant="ghost"
        >
          <PlusIcon className="size-3.5" />
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        {active ? (
          <AgentChat
            key={active.id}
            initialEvents={active.events}
            initialPriorMessages={active.priorMessages}
            insertText={insertText}
            onClearSession={() => {
              void onClearSession(active.id)
            }}
            onIdle={onIdle}
            onInsertTextConsumed={onInsertTextConsumed}
            onPersistEvents={(events, priorMessages) => {
              void onPersistEvents(active.id, events, priorMessages)
            }}
            onSessionId={(sessionId) => {
              void onBindSession(active.id, sessionId)
            }}
            onTitleHint={(title) => {
              if (active.title.startsWith("Chat ")) {
                void onRenameChat(active.id, title)
              }
            }}
            sessionId={active.sessionId ?? undefined}
            syncUrl={false}
            variant="panel"
            workspaceContext={{
              ...workspaceContext,
              workspaceId,
            }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-sm text-muted-foreground">
              No open chats. Pick one from history or start a new chat.
            </p>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setHistoryOpen(true)}
                size="sm"
                type="button"
                variant="outline"
              >
                <HistoryIcon className="size-3.5" />
                History
              </Button>
              <Button onClick={() => void onAddChat()} size="sm" type="button">
                <PlusIcon className="size-3.5" />
                New chat
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function formatRelativeTime(timestamp: number): string {
  const deltaSec = Math.round((Date.now() - timestamp) / 1000)
  if (deltaSec < 60) return "just now"
  const minutes = Math.floor(deltaSec / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

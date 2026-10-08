"use client";

import { PlusIcon, XIcon } from "lucide-react";
import { AgentChat, type WorkspaceChatContext } from "@/app/_components/agent-chat";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ChatTabState = {
  readonly id: string;
  readonly sessionId: string | null;
  readonly title: string;
};

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
  onIdle,
  onRenameChat,
  onInsertTextConsumed,
}: {
  readonly workspaceId: string;
  readonly chats: readonly ChatTabState[];
  readonly activeChatId: string;
  readonly workspaceContext: WorkspaceChatContext;
  readonly insertText?: string | null;
  readonly onSelectChat: (chatId: string) => void;
  readonly onAddChat: () => void | Promise<void>;
  readonly onCloseChat: (chatId: string) => void | Promise<void>;
  readonly onBindSession: (chatId: string, sessionId: string) => void | Promise<void>;
  readonly onIdle: () => void;
  readonly onRenameChat: (chatId: string, title: string) => void | Promise<void>;
  readonly onInsertTextConsumed?: () => void;
}) {
  const active = chats.find((chat) => chat.id === activeChatId) ?? chats[0];

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-9 shrink-0 items-end gap-px border-border border-b bg-muted/40 px-1">
        <div className="flex min-w-0 flex-1 items-end gap-px overflow-x-auto">
          {chats.map((chat) => {
            const selected = chat.id === active?.id;
            return (
              <div
                className={cn(
                  "group flex max-w-40 shrink-0 items-center gap-1 border-transparent border-b-2 px-2 py-1.5 text-xs",
                  selected
                    ? "border-foreground bg-background text-foreground"
                    : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                )}
                key={chat.id}
              >
                <button
                  className="min-w-0 truncate text-left"
                  onClick={() => onSelectChat(chat.id)}
                  title={chat.title}
                  type="button"
                >
                  {chat.title}
                </button>
                {chats.length > 1 ? (
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
            );
          })}
        </div>
        <Button
          aria-label="New chat"
          className="mb-0.5 size-7 shrink-0"
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
            insertText={insertText}
            onIdle={onIdle}
            onInsertTextConsumed={onInsertTextConsumed}
            onSessionId={(sessionId) => {
              void onBindSession(active.id, sessionId);
            }}
            onTitleHint={(title) => {
              if (active.title.startsWith("Chat ")) {
                void onRenameChat(active.id, title);
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
        ) : null}
      </div>
    </div>
  );
}

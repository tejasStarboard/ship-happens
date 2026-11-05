"use client"

import { useCallback, useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { IconMessageChatbot, IconRotateClockwise, IconX } from "@tabler/icons-react"
import { Button } from "@ship-happens/ui/components/button"
import { cn } from "@ship-happens/ui/lib/utils"
import { AgentChat } from "@/app/_components/agent-chat"
import { accountRulesWorkspaceId } from "@/lib/account-rules/ids"

const ASSISTANT_NAME = "Mira"

const RULES_SUGGESTIONS = [
  "Add 8% markup on all Asia→US ocean buys",
  "Set a $150/FEU floor margin org-wide",
  "List my overlay rules",
  "Markup Nordstrom Shanghai–LA at 5%",
]

const RULES_EMPTY_TITLE = `Hi, I’m ${ASSISTANT_NAME}`

const RULES_EMPTY_DESCRIPTION =
  "I can help set markups, projected sell prices, and floor margins for your account. Tell me what you’d like changed."

async function registerRulesSession(sessionId: string): Promise<void> {
  await fetch("/api/account-rules/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId }),
  })
}

async function unregisterRulesSession(sessionId: string): Promise<void> {
  await fetch(
    `/api/account-rules/session?sessionId=${encodeURIComponent(sessionId)}`,
    { method: "DELETE" }
  )
}

export function RulesAgentSheet({
  organizationId,
  userId,
}: {
  organizationId: string
  userId: string
}) {
  const [open, setOpen] = useState(false)
  /** Keep AgentChat mounted after first open so closing the panel does not kill Eve. */
  const [keepAlive, setKeepAlive] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>()
  const [chatKey, setChatKey] = useState(0)
  const reduceMotion = useReducedMotion()

  const workspaceId = accountRulesWorkspaceId(organizationId)

  useEffect(() => {
    if (open) setKeepAlive(true)
  }, [open])

  const onSessionId = useCallback((nextSessionId: string) => {
    setSessionId(nextSessionId)
    void registerRulesSession(nextSessionId)
  }, [])

  function resetChat() {
    if (sessionId) {
      void unregisterRulesSession(sessionId)
    }
    setSessionId(undefined)
    setChatKey((key) => key + 1)
  }

  const panelTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 32, mass: 0.85 }

  const showPanel = keepAlive || open

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-end p-4 sm:p-5">
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        {showPanel ? (
          <motion.div
            key="rules-agent-panel"
            role="dialog"
            aria-modal={open}
            aria-label={ASSISTANT_NAME}
            aria-hidden={!open}
            initial={false}
            animate={
              open
                ? { opacity: 1, y: 0, scale: 1 }
                : reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: 16, scale: 0.96 }
            }
            transition={panelTransition}
            className={cn(
              "flex h-[calc(100svh-5.5rem)] w-md max-w-[calc(100vw-2rem)] origin-bottom-right flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl",
              !open && "pointer-events-none invisible"
            )}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
              <p className="text-sm font-medium leading-none">
                {ASSISTANT_NAME}
              </p>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Reset chat"
                  onClick={resetChat}
                >
                  <IconRotateClockwise className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Close ${ASSISTANT_NAME}`}
                  onClick={() => setOpen(false)}
                >
                  <IconX className="size-4" />
                </Button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <AgentChat
                key={chatKey}
                variant="panel"
                sessionless
                syncUrl={false}
                sessionId={sessionId}
                onSessionId={onSessionId}
                accountRulesContext={{ organizationId, userId }}
                workspaceContext={{
                  workspaceId,
                  workspaceFiles: ["README.txt"],
                  openTabs: [],
                  activeTab: null,
                }}
                emptyTitle={RULES_EMPTY_TITLE}
                emptyDescription={RULES_EMPTY_DESCRIPTION}
                suggestionOverrides={RULES_SUGGESTIONS}
              />
            </div>
          </motion.div>
        ) : null}

        <motion.div
          layout
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 500, damping: 35 }
          }
        >
          <Button
            type="button"
            size="icon"
            aria-label={open ? `Close ${ASSISTANT_NAME}` : `Open ${ASSISTANT_NAME}`}
            aria-expanded={open}
            aria-haspopup="dialog"
            className={cn(
              "size-12 rounded-full shadow-lg",
              open && "bg-muted text-foreground hover:bg-muted/90"
            )}
            onClick={() => setOpen((prev) => !prev)}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={open ? "close" : "open"}
                initial={
                  reduceMotion ? false : { opacity: 0, rotate: -45, scale: 0.7 }
                }
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, rotate: 45, scale: 0.7 }
                }
                transition={{ duration: reduceMotion ? 0 : 0.18 }}
                className="inline-flex"
              >
                {open ? (
                  <IconX className="size-5" />
                ) : (
                  <IconMessageChatbot className="size-5" />
                )}
              </motion.span>
            </AnimatePresence>
          </Button>
        </motion.div>
      </div>
    </div>
  )
}

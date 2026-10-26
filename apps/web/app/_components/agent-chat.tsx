"use client"

import type { UserContent, UIMessage } from "ai"
import type { MessageStreamEvent } from "eve/client"
import { useEveAgent, type EveMessage } from "eve/react"
import {
  IconAlertCircle as AlertCircleIcon,
  IconBrain as BrainIcon,
  IconCheck as CheckIcon,
  IconWorld as GlobeIcon,
  IconMessage as MessageSquareIcon,
  IconPlus as PlusIcon,
  IconSquare as SquareIcon,
} from "@tabler/icons-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@ship-happens/ui/ai-elements/attachments"
import {
  Conversation,
  ConversationContent,
  ConversationDownload,
  ConversationEmptyState,
  ConversationScrollButton,
  ConversationTopFade,
} from "@ship-happens/ui/ai-elements/conversation"
import { Message, MessageContent } from "@ship-happens/ui/ai-elements/message"
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@ship-happens/ui/ai-elements/model-selector"
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from "@ship-happens/ui/ai-elements/prompt-input"
import { Shimmer } from "@ship-happens/ui/ai-elements/shimmer"
import { SpeechInput } from "@ship-happens/ui/ai-elements/speech-input"
import {
  Suggestion,
  Suggestions,
} from "@ship-happens/ui/ai-elements/suggestion"
import { Button } from "@ship-happens/ui/components/button"
import {
  CHAT_MODEL_CHEFS,
  CHAT_MODELS,
  DEFAULT_CHAT_MODEL_ID,
  getChatModel,
  type ChatModelId,
} from "@/lib/chat-models"
import { cn } from "@/lib/utils"
import { WEB_CHAT_AGENT } from "@/app/eve-agent"
import { redactSecretsDeep } from "@/lib/secret-redaction"
import { AgentMessage } from "./agent-message"

const DEFAULT_AGENT_NAME = "eve-nextjs"
const AGENT_NAME = WEB_CHAT_AGENT ?? DEFAULT_AGENT_NAME

const SUGGESTIONS = [
  "What are the latest trends in AI?",
  "How does machine learning work?",
  "Explain quantum computing",
  "Best practices for React development",
  "Tell me about TypeScript benefits",
  "How to optimize database queries?",
]

export type WorkspaceChatContext = {
  readonly workspaceId?: string
  readonly workspaceFiles: readonly string[]
  readonly openTabs: readonly string[]
  readonly activeTab: string | null
}

type PendingRetry = {
  readonly text: string
  readonly files: PromptInputMessage["files"]
}

const MAX_SESSION_RECONNECTS = 3

/**
 * Recover an Agent chat without leaving the tab:
 * 1) Remount + resume the same eve sessionId (Cursor-style).
 * 2) If that session is gone / retries exhausted, clear the bind and mint a
 *    fresh session under the same chat row, rehydrate persisted events so the
 *    transcript stays intact, then retry the pending send.
 */
export function AgentChat({
  sessionId,
  sessionless = false,
  variant = "page",
  workspaceContext,
  onSessionId,
  onIdle,
  onTitleHint,
  syncUrl = true,
  insertText,
  onInsertTextConsumed,
  onClearSession,
  initialEvents,
  initialPriorMessages,
  onPersistEvents,
}: {
  readonly sessionId?: string
  readonly sessionless?: boolean
  readonly variant?: "page" | "panel"
  readonly workspaceContext?: WorkspaceChatContext
  readonly onSessionId?: (sessionId: string) => void
  readonly onIdle?: () => void
  readonly onTitleHint?: (title: string) => void
  /** When false, skip rewriting the browser URL on session create (multi-chat panel). */
  readonly syncUrl?: boolean
  readonly insertText?: string | null
  readonly onInsertTextConsumed?: () => void
  /** Persist-clear the chat's eve sessionId so a fresh session can bind. */
  readonly onClearSession?: () => void | Promise<void>
  /** Current-session eve stream only (not merged across remints). */
  readonly initialEvents?: readonly unknown[]
  /** Frozen transcript from before the current session (reload-safe order). */
  readonly initialPriorMessages?: readonly unknown[]
  readonly onPersistEvents?: (
    events: readonly MessageStreamEvent[],
    priorMessages?: readonly EveMessage[]
  ) => void
}) {
  const restoredPrior = useMemo(
    () =>
      withUniquePriorIds(asEveMessages(initialPriorMessages), 0).filter(
        (message) => message.role === "user" || message.role === "assistant"
      ),
    [initialPriorMessages]
  )
  const [reconnectEpoch, setReconnectEpoch] = useState(0)
  const [pendingRetry, setPendingRetry] = useState<PendingRetry | null>(null)
  const [localSessionId, setLocalSessionId] = useState<string | undefined>(
    sessionId
  )
  const [savedEvents, setSavedEvents] = useState<MessageStreamEvent[]>(() =>
    asMessageStreamEvents(initialEvents)
  )
  /** UI transcript frozen across remints (do not rehydrate into a new eve store). */
  const [priorMessages, setPriorMessages] =
    useState<EveMessage[]>(restoredPrior)
  const [priorTranscript, setPriorTranscript] = useState<string | undefined>(
    () => formatPriorTranscript(restoredPrior)
  )
  const [reminting, setReminting] = useState(false)
  /** False only on remint remount — start a clean store; prior stays in priorMessages. */
  const [hydrateFromEvents, setHydrateFromEvents] = useState(true)
  const reconnectAttemptsRef = useRef(0)
  const remintedRef = useRef(false)
  const priorMessagesRef = useRef(priorMessages)
  priorMessagesRef.current = priorMessages

  useEffect(() => {
    // While reminting (or until parent catches up to a freshly minted id),
    // never clobber local bind with a stale parent sessionId.
    if (reminting) return
    setLocalSessionId((current) => {
      if (
        remintedRef.current &&
        current !== undefined &&
        sessionId !== current
      ) {
        return current
      }
      return sessionId
    })
    if (sessionId !== undefined) {
      remintedRef.current = false
    }
  }, [reminting, sessionId])

  const remintSameChat = useCallback(
    (
      pending?: PendingRetry,
      eventsSnapshot?: readonly MessageStreamEvent[],
      messagesSnapshot?: readonly EveMessage[]
    ) => {
      remintedRef.current = true
      reconnectAttemptsRef.current = 0
      if (pending) setPendingRetry(pending)

      const nextEpoch = reconnectEpoch + 1
      // Namespace ids — new sessions reuse turn_0:assistant etc. and would
      // collide with frozen prior messages in the combined list.
      const nextPrefixMessages = withUniquePriorIds(
        stripPendingUserMessage(
          [...priorMessages, ...(messagesSnapshot ?? [])],
          pending
        ),
        nextEpoch
      )
      setPriorMessages(nextPrefixMessages)
      setPriorTranscript(formatPriorTranscript(nextPrefixMessages))
      // Never concatenate old+new event streams — turn ids restart and scramble
      // order on reload. Persist frozen prior; current session events start empty.
      setSavedEvents([])
      onPersistEvents?.(
        [],
        redactSecretsDeep(nextPrefixMessages) as EveMessage[]
      )

      // Fresh eve store — keep transcript in priorMessages, not initialEvents.
      setHydrateFromEvents(false)
      setReminting(true)
      setLocalSessionId(undefined)
      void onClearSession?.()
      setReconnectEpoch(nextEpoch)
    },
    [onClearSession, onPersistEvents, priorMessages, reconnectEpoch]
  )

  const requestReconnect = useCallback(
    (
      pending?: PendingRetry,
      eventsSnapshot?: readonly MessageStreamEvent[],
      messagesSnapshot?: readonly EveMessage[]
    ) => {
      // After eve restart, soft resume almost always hangs — remint unless we
      // still have a live sessionId and have not exhausted brief reconnects.
      if (
        !localSessionId ||
        reconnectAttemptsRef.current >= MAX_SESSION_RECONNECTS
      ) {
        remintSameChat(pending, eventsSnapshot, messagesSnapshot)
        return
      }
      reconnectAttemptsRef.current += 1
      if (pending) setPendingRetry(pending)
      if (eventsSnapshot && eventsSnapshot.length > 0) {
        setSavedEvents([...eventsSnapshot])
      }
      const delayMs = 400 * reconnectAttemptsRef.current
      window.setTimeout(() => {
        setReconnectEpoch((epoch) => epoch + 1)
      }, delayMs)
    },
    [localSessionId, remintSameChat]
  )

  return (
    <AgentChatSession
      key={`recover:${reconnectEpoch}`}
      initialEvents={hydrateFromEvents ? savedEvents : []}
      insertText={insertText}
      onIdle={onIdle}
      onInsertTextConsumed={onInsertTextConsumed}
      onPendingRetryConsumed={() => {
        setPendingRetry(null)
        setReminting(false)
        reconnectAttemptsRef.current = 0
      }}
      onPersistEvents={(events) => {
        const safe = redactSecretsDeep(events) as MessageStreamEvent[]
        const prior = redactSecretsDeep(
          priorMessagesRef.current
        ) as EveMessage[]
        setSavedEvents(safe)
        onPersistEvents?.(safe, prior)
      }}
      onRequestReconnect={requestReconnect}
      onSessionGone={(pending, eventsSnapshot, messagesSnapshot) =>
        remintSameChat(pending, eventsSnapshot, messagesSnapshot)
      }
      onSessionId={(nextSessionId) => {
        setReminting(false)
        // Keep remintedRef until parent sessionId prop matches — otherwise the
        // sync effect can overwrite this mint with a stale bind.
        setLocalSessionId(nextSessionId)
        onSessionId?.(nextSessionId)
      }}
      onTitleHint={onTitleHint}
      pendingRetry={pendingRetry}
      priorMessages={priorMessages}
      priorTranscript={priorTranscript}
      reconnectPending={pendingRetry !== null || reminting}
      reminting={reminting}
      sessionId={localSessionId}
      sessionless={sessionless}
      syncUrl={syncUrl}
      variant={variant}
      workspaceContext={workspaceContext}
    />
  )
}

function AgentChatSession({
  sessionId,
  sessionless = false,
  variant = "page",
  workspaceContext,
  onSessionId,
  onIdle,
  onTitleHint,
  syncUrl = true,
  insertText,
  onInsertTextConsumed,
  pendingRetry,
  reconnectPending,
  reminting,
  priorMessages,
  priorTranscript,
  initialEvents,
  onPersistEvents,
  onPendingRetryConsumed,
  onRequestReconnect,
  onSessionGone,
}: {
  readonly sessionId?: string
  readonly sessionless?: boolean
  readonly variant?: "page" | "panel"
  readonly workspaceContext?: WorkspaceChatContext
  readonly onSessionId?: (sessionId: string) => void
  readonly onIdle?: () => void
  readonly onTitleHint?: (title: string) => void
  readonly syncUrl?: boolean
  readonly insertText?: string | null
  readonly onInsertTextConsumed?: () => void
  readonly pendingRetry: PendingRetry | null
  readonly reconnectPending: boolean
  readonly reminting: boolean
  /** Frozen transcript from before remint — rendered above live messages. */
  readonly priorMessages: readonly EveMessage[]
  readonly priorTranscript?: string
  readonly initialEvents: readonly MessageStreamEvent[]
  readonly onPersistEvents: (events: readonly MessageStreamEvent[]) => void
  readonly onPendingRetryConsumed: () => void
  readonly onRequestReconnect: (
    pending?: PendingRetry,
    eventsSnapshot?: readonly MessageStreamEvent[],
    messagesSnapshot?: readonly EveMessage[]
  ) => void
  readonly onSessionGone: (
    pending?: PendingRetry,
    eventsSnapshot?: readonly MessageStreamEvent[],
    messagesSnapshot?: readonly EveMessage[]
  ) => void
}) {
  const [cancellationError, setCancellationError] = useState<string>()
  const [text, setText] = useState("")
  const [model, setModel] = useState<ChatModelId>(DEFAULT_CHAT_MODEL_ID)
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false)
  const [useWebSearch, setUseWebSearch] = useState(false)
  const [reconnectingLocal, setReconnecting] = useState(false)
  const reconnecting = reconnectingLocal || reconnectPending
  const isPanel = variant === "panel"
  const titleHintSent = useRef(false)
  const resumeRecoveryAttempted = useRef(false)
  const pendingRetrySent = useRef(false)
  const lastAttemptedSend = useRef<PendingRetry | null>(null)

  const agent = useEveAgent({
    agent: WEB_CHAT_AGENT,
    prewarm: isPanel && sessionId === undefined,
    initialEvents,
    initialSession:
      sessionId === undefined
        ? undefined
        : {
            sessionId,
            streamIndex: 0,
          },
    resume: sessionId !== undefined,
    onFinish(snapshot) {
      if (snapshot.events.length > 0) {
        onPersistEvents(
          redactSecretsDeep(snapshot.events) as MessageStreamEvent[]
        )
      }
    },
    onSessionChange(session) {
      if (session === undefined) return
      onSessionId?.(session.sessionId)
      if (syncUrl && sessionId === undefined) {
        // Next patches window.history to navigate, which would detach the active stream.
        History.prototype.replaceState.call(
          window.history,
          window.history.state,
          "",
          `/s/${encodeURIComponent(session.sessionId)}`
        )
      }
    },
  })

  const selectedModel = useMemo(() => getChatModel(model), [model])
  const isBusy = agent.status === "submitted" || agent.status === "streaming"
  const isResuming = agent.status === "resuming"
  const displayMessages = useMemo(
    () => [...priorMessages, ...agent.data.messages],
    [agent.data.messages, priorMessages]
  )
  const isEmpty = displayMessages.length === 0
  const lastMessage = displayMessages.at(-1)
  const isPendingAssistantShell =
    lastMessage?.role === "assistant" &&
    lastMessage.parts.every((part) => part.type === "step-start")
  const showPendingThinking =
    isBusy &&
    (agent.status === "submitted" ||
      lastMessage?.role !== "assistant" ||
      isPendingAssistantShell)
  const turnFailure =
    isBusy || isResuming || reconnecting
      ? undefined
      : getLatestTurnFailure(agent.events)
  const rawError =
    cancellationError ?? agent.error?.message ?? turnFailure ?? undefined
  const errorMessage = reconnecting ? undefined : rawError
  const hasConversationContent =
    sessionless || !isEmpty || errorMessage !== undefined || reminting
  const showConversationLayout = isResuming || hasConversationContent
  const activeSessionId = sessionId ?? agent.session?.sessionId
  const canRespond = (requestId: string) =>
    !isResuming &&
    !reconnecting &&
    agent.data.inputs[requestId]?.status === "open"
  const questionsFor = (callId: string) =>
    Object.values(agent.data.inputs).filter(
      (input) =>
        input.request.kind === "question" &&
        input.request.action.callId === callId
    )

  const turnOptions = useCallback(
    (busy: boolean) => ({
      ...(busy ? { turnPolicy: "steer" as const } : {}),
      clientContext: {
        model,
        webSearch: useWebSearch,
        ...(useWebSearch
          ? {
              note: "Prefer using the web_fetch tool for up-to-date information from the web.",
            }
          : {}),
        ...(priorTranscript
          ? {
              priorConversation: priorTranscript,
              note: "A prior durable session for this chat was restarted. Continue from the priorConversation transcript below; the user already sees those messages in the UI.",
            }
          : {}),
        ...(workspaceContext
          ? {
              workspace: {
                ...(workspaceContext.workspaceId
                  ? { id: workspaceContext.workspaceId }
                  : {}),
                root: "/workspace",
                files: [...workspaceContext.workspaceFiles],
                openTabs: [...workspaceContext.openTabs],
                activeTab: workspaceContext.activeTab,
                note: "The IDE mirrors /workspace. Prefer read_file/write_file/bash on these paths. Open tabs are what the user is viewing now. Multiple chats share this workspace.",
              },
            }
          : {}),
      },
    }),
    [model, priorTranscript, useWebSearch, workspaceContext]
  )

  const wasBusyRef = useRef(false)
  useEffect(() => {
    const busy = agent.status === "submitted" || agent.status === "streaming"
    if (wasBusyRef.current && !busy) {
      onIdle?.()
    }
    wasBusyRef.current = busy
  }, [agent.status, onIdle])

  useEffect(() => {
    if (titleHintSent.current || !onTitleHint) return
    const firstUser = displayMessages.find((message) => message.role === "user")
    if (!firstUser) return
    const textPart = firstUser.parts.find(
      (part) =>
        part.type === "text" && "text" in part && typeof part.text === "string"
    ) as { text?: string } | undefined
    const hint = textPart?.text?.trim().replace(/\s+/g, " ").slice(0, 36)
    if (!hint) return
    titleHintSent.current = true
    onTitleHint(
      hint.length < (textPart?.text?.trim().length ?? 0) ? `${hint}…` : hint
    )
  }, [displayMessages, onTitleHint])

  useEffect(() => {
    if (!insertText) return
    setText((prev) =>
      prev.trim() ? `${prev.trim()} ${insertText}` : insertText
    )
    onInsertTextConsumed?.()
  }, [insertText, onInsertTextConsumed])

  const handleSessionFailure = useCallback(
    (message: string | undefined, pending?: PendingRetry) => {
      if (!message) return
      const eventsSnapshot = agent.events
      const messagesSnapshot = agent.data.messages
      const pendingPayload = pending ?? lastAttemptedSend.current ?? undefined
      // Dead local workflow / missing run → remint under same chat immediately.
      if (isGoneSessionError(message) || isDeadLocalWorkflowError(message)) {
        onSessionGone(pendingPayload, eventsSnapshot, messagesSnapshot)
        return
      }
      // A user send failed on a bound session — remint under this chat. Soft
      // reconnect often hangs in `resuming` after eve restart (run not resumed).
      if (pendingPayload && sessionId) {
        onSessionGone(pendingPayload, eventsSnapshot, messagesSnapshot)
        return
      }
      if (sessionId && isRecoverableSessionError(message)) {
        setReconnecting(true)
        onRequestReconnect(pendingPayload, eventsSnapshot, messagesSnapshot)
        return
      }
      if (sessionId) {
        // Bound-session resume failure without a pending send: remint.
        onSessionGone(pendingPayload, eventsSnapshot, messagesSnapshot)
      }
    },
    [
      agent.data.messages,
      agent.events,
      onRequestReconnect,
      onSessionGone,
      sessionId,
    ]
  )

  // Resume / stream / send failed without a thrown promise — reconnect or remint.
  useEffect(() => {
    if (!sessionId || resumeRecoveryAttempted.current) {
      return
    }
    const message = agent.error?.message
    if (!message) return
    if (agent.status !== "error") return
    resumeRecoveryAttempted.current = true
    handleSessionFailure(message, lastAttemptedSend.current ?? undefined)
  }, [agent.error?.message, agent.status, handleSessionFailure, sessionId])

  // Soft-reconnect remounts can hang forever in `resuming` when the local
  // workflow run was never resumed after eve restart — remint instead.
  useEffect(() => {
    if (!sessionId || !isResuming) return
    const timer = window.setTimeout(() => {
      if (resumeRecoveryAttempted.current) return
      resumeRecoveryAttempted.current = true
      handleSessionFailure(
        "Local Workflow run was not resumed. Start a new conversation.",
        lastAttemptedSend.current ?? pendingRetry ?? undefined
      )
    }, 3_500)
    return () => window.clearTimeout(timer)
  }, [handleSessionFailure, isResuming, pendingRetry, sessionId])

  // After remint (no sessionId) or reconnect mount, replay the failed send once ready.
  useEffect(() => {
    if (!pendingRetry || pendingRetrySent.current) {
      return
    }
    // Remounted onto a still-dead session: remint instead of waiting forever.
    if (agent.status === "error" && sessionId) {
      pendingRetrySent.current = true
      handleSessionFailure(
        agent.error?.message ?? "Failed to send the session message.",
        pendingRetry
      )
      return
    }
    if (isResuming) return
    if (agent.status === "error") return
    if (agent.status !== "ready" && agent.status !== "submitted") return
    pendingRetrySent.current = true
    setReconnecting(false)
    const retry = pendingRetry
    onPendingRetryConsumed()
    void (async () => {
      try {
        const options = turnOptions(false)
        if (retry.files.length === 0) {
          await agent.send(retry.text, options)
        } else {
          const parts: UserContent = []
          if (retry.text.trim().length > 0) {
            parts.push({ text: retry.text, type: "text" })
          }
          for (const file of retry.files) {
            parts.push({
              data: file.url,
              filename: file.filename,
              mediaType: file.mediaType,
              type: "file",
            })
          }
          await agent.send(parts, options)
        }
      } catch (error: unknown) {
        handleSessionFailure(toErrorMessage(error), retry)
      }
    })()
  }, [
    agent,
    agent.error?.message,
    agent.status,
    handleSessionFailure,
    isResuming,
    onPendingRetryConsumed,
    pendingRetry,
    sessionId,
    turnOptions,
  ])

  const requestCancellation = () => {
    setCancellationError(undefined)
    void agent.cancel().catch((error: unknown) => {
      setCancellationError(toErrorMessage(error))
    })
  }

  const sendText = useCallback(
    async (raw: string, files: PromptInputMessage["files"] = []) => {
      const next = raw.trim()
      if (
        (next.length === 0 && files.length === 0) ||
        isResuming ||
        reconnecting
      ) {
        return
      }

      setText("")
      setCancellationError(undefined)
      const options = turnOptions(isBusy)
      const pending: PendingRetry = { text: next, files }
      lastAttemptedSend.current = pending

      try {
        if (files.length === 0) {
          await agent.send(next, options)
          lastAttemptedSend.current = null
          return
        }

        const parts: UserContent = []
        if (next.length > 0) {
          parts.push({ text: next, type: "text" })
        }
        for (const file of files) {
          parts.push({
            data: file.url,
            filename: file.filename,
            mediaType: file.mediaType,
            type: "file",
          })
        }

        await agent.send(parts, options)
        lastAttemptedSend.current = null
      } catch (error: unknown) {
        handleSessionFailure(toErrorMessage(error), pending)
      }
    },
    [agent, handleSessionFailure, isBusy, isResuming, reconnecting, turnOptions]
  )

  const handleSubmit = async (message: PromptInputMessage) => {
    await sendText(message.text, message.files)
  }

  const handleSuggestion = (suggestion: string) => {
    void sendText(suggestion)
  }

  const downloadMessages = displayMessages as unknown as UIMessage[]

  const composer = (
    <PromptInput
      accept="image/*,application/pdf,text/*"
      globalDrop
      multiple
      onSubmit={handleSubmit}
    >
      <PromptInputHeader>
        <PromptInputAttachmentsDisplay />
      </PromptInputHeader>
      <PromptInputBody>
        <PromptInputTextarea
          disabled={isResuming || reconnecting}
          onChange={(event) => setText(event.currentTarget.value)}
          placeholder={
            reminting
              ? "Starting a fresh session in this chat…"
              : reconnecting
                ? "Reconnecting…"
                : useWebSearch
                  ? "Ask with web search preference…"
                  : "Send a message…"
          }
          value={text}
        />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger aria-label="Add attachments" />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments label="Add photos or files" />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
          <PromptInputButton
            aria-pressed={useWebSearch}
            className={cn(useWebSearch && "bg-accent text-accent-foreground")}
            onClick={() => setUseWebSearch((value) => !value)}
            variant="ghost"
          >
            <GlobeIcon className="size-4" />
            <span className="hidden sm:inline">Search</span>
          </PromptInputButton>
          <SpeechInput
            className="size-8"
            disabled={isResuming || reconnecting}
            onTranscriptionChange={(transcript) => {
              setText((prev) =>
                prev.trim() ? `${prev.trim()} ${transcript}` : transcript
              )
            }}
            size="icon-sm"
            type="button"
            variant="ghost"
          />
          <ModelSelector
            onOpenChange={setModelSelectorOpen}
            open={modelSelectorOpen}
          >
            <ModelSelectorTrigger
              render={
                <PromptInputButton
                  className="gap-2"
                  type="button"
                  variant="ghost"
                >
                  <ModelSelectorLogo provider={selectedModel.chefSlug} />
                  <ModelSelectorName className="max-w-28 sm:max-w-40">
                    {selectedModel.name}
                  </ModelSelectorName>
                </PromptInputButton>
              }
            />
            <ModelSelectorContent title="Select a model">
              <ModelSelectorInput placeholder="Search models…" />
              <ModelSelectorList>
                <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                {CHAT_MODEL_CHEFS.map((chef) => (
                  <ModelSelectorGroup heading={chef} key={chef}>
                    {CHAT_MODELS.filter((entry) => entry.chef === chef).map(
                      (entry) => {
                        const isSelected = entry.id === model
                        return (
                          <ModelSelectorItem
                            key={entry.id}
                            onSelect={() => {
                              setModel(entry.id)
                              setModelSelectorOpen(false)
                            }}
                            value={`${entry.name} ${entry.id}`}
                          >
                            <ModelSelectorLogo provider={entry.chefSlug} />
                            <ModelSelectorName>{entry.name}</ModelSelectorName>
                            <ModelSelectorLogoGroup>
                              {entry.providers.map((provider) => (
                                <ModelSelectorLogo
                                  key={provider}
                                  provider={provider}
                                />
                              ))}
                            </ModelSelectorLogoGroup>
                            {isSelected ? (
                              <CheckIcon className="size-4" />
                            ) : (
                              <span className="size-4" />
                            )}
                          </ModelSelectorItem>
                        )
                      }
                    )}
                  </ModelSelectorGroup>
                ))}
              </ModelSelectorList>
            </ModelSelectorContent>
          </ModelSelector>
        </PromptInputTools>
        <ComposerAction
          hasInputText={text.trim().length > 0}
          isBusy={isBusy}
          isResuming={isResuming || reconnecting}
          onCancel={requestCancellation}
          status={agent.status}
        />
      </PromptInputFooter>
    </PromptInput>
  )

  const messages = (
    <>
      {isEmpty && !errorMessage && !showPendingThinking ? (
        <ConversationEmptyState
          className={isPanel ? "py-10" : undefined}
          description={
            isPanel
              ? "Ask about workspace files, or attach something to edit."
              : "Ask a question, attach a file, or pick a suggestion below."
          }
          icon={
            <MessageSquareIcon className={isPanel ? "size-7" : "size-10"} />
          }
          title={isPanel ? "Agent" : `Chat with ${AGENT_NAME}`}
        />
      ) : null}
      {displayMessages.map((message, index) =>
        showPendingThinking &&
        isPendingAssistantShell &&
        message.id === lastMessage?.id ? null : (
          <AgentMessage
            canRespond={canRespond}
            isStreaming={
              agent.status === "streaming" &&
              index === displayMessages.length - 1
            }
            key={message.id}
            message={message}
            questionsFor={questionsFor}
            onInputResponses={(inputResponses) => {
              setCancellationError(undefined)
              return agent.respond(inputResponses, turnOptions(false))
            }}
          />
        )
      )}
      {showPendingThinking ? <PendingThinking /> : null}
      {reminting ? (
        <ErrorMessage
          message="Previous session is gone — starting a fresh session in this chat…"
          title="Restarting session"
          tone="muted"
        />
      ) : reconnecting ? (
        <ErrorMessage
          message="Reconnecting to the previous session…"
          title="Reconnecting"
          tone="muted"
        />
      ) : null}
      {errorMessage ? <ErrorMessage message={errorMessage} /> : null}
    </>
  )

  if (isPanel) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-background">
        <div className="flex h-8 shrink-0 items-center justify-between gap-2 border-b border-border px-2">
          <span className="truncate px-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {selectedModel.name}
          </span>
          {downloadMessages && !isEmpty ? (
            <ConversationDownload
              className="size-7 text-muted-foreground"
              messages={downloadMessages}
              size="sm"
              variant="ghost"
            />
          ) : null}
        </div>

        <Conversation
          className="min-h-0 flex-1"
          initial={sessionId === undefined ? undefined : false}
          resize={activeSessionId === undefined ? "smooth" : "instant"}
          scrollRestorationKey={
            isEmpty || activeSessionId === undefined
              ? undefined
              : `eve:web-chat-scroll:${activeSessionId}`
          }
        >
          <ConversationContent className="gap-4 px-3 pt-3 pb-4">
            {messages}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="shrink-0 border-t border-border bg-background p-2">
          {composer}
        </div>
      </div>
    )
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      {showConversationLayout ? (
        <ChatHeader
          canStartNewChat={activeSessionId !== undefined}
          downloadMessages={isEmpty ? undefined : downloadMessages}
          modelName={selectedModel.name}
        />
      ) : null}

      {showConversationLayout ? (
        <Conversation
          className="min-h-0 flex-1"
          initial={sessionId === undefined ? undefined : false}
          resize={activeSessionId === undefined ? "smooth" : "instant"}
          scrollRestorationKey={
            isEmpty || activeSessionId === undefined
              ? undefined
              : `eve:web-chat-scroll:${activeSessionId}`
          }
        >
          <ConversationTopFade className="top-14" />
          <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 pt-20 pb-40 sm:px-6">
            {messages}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      ) : null}

      <div
        className={cn(
          "mx-auto w-full px-4 sm:px-6",
          showConversationLayout
            ? "fixed bottom-0 left-1/2 z-20 max-w-3xl -translate-x-1/2 bg-gradient-to-t from-background via-background to-transparent pt-4 pb-6"
            : "flex max-w-2xl flex-1 flex-col items-center justify-center gap-8 pb-[8vh]"
        )}
      >
        {showConversationLayout ? null : (
          <div className="flex w-full flex-col items-center gap-6 text-center">
            <div className="space-y-2">
              <h1 className="text-5xl font-medium tracking-tighter">
                {AGENT_NAME}
              </h1>
              <p className="text-sm text-muted-foreground">
                Durable agent chat · pick a model below
              </p>
            </div>
            <Suggestions className="px-1">
              {SUGGESTIONS.map((suggestion) => (
                <Suggestion
                  key={suggestion}
                  onClick={handleSuggestion}
                  suggestion={suggestion}
                />
              ))}
            </Suggestions>
          </div>
        )}
        <div className="w-full space-y-3">
          {showConversationLayout && isEmpty && !errorMessage ? (
            <Suggestions className="px-1">
              {SUGGESTIONS.map((suggestion) => (
                <Suggestion
                  key={suggestion}
                  onClick={handleSuggestion}
                  suggestion={suggestion}
                />
              ))}
            </Suggestions>
          ) : null}
          {composer}
        </div>
      </div>
    </main>
  )
}

function PromptInputAttachmentsDisplay() {
  const attachments = usePromptInputAttachments()

  if (attachments.files.length === 0) {
    return null
  }

  return (
    <Attachments className="w-full" variant="inline">
      {attachments.files.map((file) => (
        <Attachment
          data={file}
          key={file.id}
          onRemove={() => attachments.remove(file.id)}
        >
          <AttachmentPreview />
          <span className="max-w-40 truncate text-xs">
            {file.filename ?? "Attachment"}
          </span>
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  )
}

function ComposerAction({
  hasInputText,
  isBusy,
  isResuming,
  onCancel,
  status,
}: {
  readonly hasInputText: boolean
  readonly isBusy: boolean
  readonly isResuming: boolean
  readonly onCancel: () => void
  readonly status: ReturnType<typeof useEveAgent>["status"]
}) {
  const attachments = usePromptInputAttachments()
  const canSubmit = hasInputText || attachments.files.length > 0

  if (!isBusy || canSubmit) {
    return (
      <PromptInputSubmit
        className="static"
        disabled={isResuming || (!canSubmit && status === "ready")}
        onStop={isBusy ? onCancel : undefined}
        status={
          status === "submitted" || status === "streaming" || status === "error"
            ? status
            : undefined
        }
      />
    )
  }

  return (
    <PromptInputButton
      aria-label="Stop"
      className="static"
      onClick={onCancel}
      variant="outline"
    >
      <SquareIcon className="size-3 fill-current" />
    </PromptInputButton>
  )
}

function ErrorMessage({
  message,
  title = "Request failed",
  tone = "destructive",
}: {
  readonly message: string
  readonly title?: string
  readonly tone?: "destructive" | "muted"
}) {
  return (
    <Message className="max-w-full" from="assistant">
      <MessageContent>
        <div
          className={cn(
            "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-sm",
            tone === "destructive"
              ? "border-destructive/30 bg-destructive/5"
              : "border-border bg-muted/40"
          )}
          role="alert"
        >
          <AlertCircleIcon
            className={cn(
              "mt-0.5 size-4 shrink-0",
              tone === "destructive"
                ? "text-destructive"
                : "text-muted-foreground"
            )}
          />
          <div>
            <p className="font-medium">{title}</p>
            <p className="mt-0.5 text-muted-foreground">{message}</p>
          </div>
        </div>
      </MessageContent>
    </Message>
  )
}

function ChatHeader({
  canStartNewChat,
  downloadMessages,
  modelName,
}: {
  readonly canStartNewChat: boolean
  readonly downloadMessages?: UIMessage[]
  readonly modelName: string
}) {
  return (
    <header className="pointer-events-none fixed top-0 right-0 left-0 z-20 h-14">
      <div className="relative mx-auto flex h-full w-full max-w-3xl items-center justify-center bg-background px-24">
        <div className="flex min-w-0 flex-col items-center">
          <span className="truncate text-sm text-muted-foreground">
            {AGENT_NAME}
          </span>
          <span className="truncate text-xs text-muted-foreground/80">
            {modelName}
          </span>
        </div>
        <div className="pointer-events-auto fixed top-3 left-6 flex items-center gap-1">
          {downloadMessages ? (
            <ConversationDownload
              className="text-muted-foreground"
              messages={downloadMessages}
              size="sm"
              variant="ghost"
            />
          ) : null}
        </div>
        {canStartNewChat ? (
          <Button
            aria-label="Start a new chat"
            className="pointer-events-auto fixed top-3 right-6 pr-4"
            onClick={() => window.location.assign("/s")}
            size="sm"
            type="button"
            variant="ghost"
          >
            <PlusIcon className="size-4" />
            <span className="hidden text-sm font-normal sm:inline">
              New chat
            </span>
          </Button>
        ) : null}
      </div>
    </header>
  )
}

function PendingThinking() {
  return (
    <Message aria-live="polite" from="assistant">
      <MessageContent>
        <div className="mb-4 flex w-full items-center gap-2 text-sm text-muted-foreground">
          <BrainIcon className="size-4" />
          <Shimmer duration={1}>Thinking</Shimmer>
        </div>
      </MessageContent>
    </Message>
  )
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unable to cancel the response."
}

function asMessageStreamEvents(
  value: readonly unknown[] | undefined
): MessageStreamEvent[] {
  if (!value || value.length === 0) return []
  return value.filter(
    (event): event is MessageStreamEvent =>
      typeof event === "object" &&
      event !== null &&
      "type" in event &&
      typeof (event as { type?: unknown }).type === "string"
  )
}

function asEveMessages(value: readonly unknown[] | undefined): EveMessage[] {
  if (!value || value.length === 0) return []
  return value.filter((message): message is EveMessage => {
    if (typeof message !== "object" || message === null) return false
    const record = message as { id?: unknown; role?: unknown; parts?: unknown }
    return (
      typeof record.id === "string" &&
      (record.role === "user" || record.role === "assistant") &&
      Array.isArray(record.parts)
    )
  })
}

/** Avoid React key clashes with the next session's turn_N ids. */
function withUniquePriorIds(
  messages: readonly EveMessage[],
  remintEpoch: number
): EveMessage[] {
  return messages.map((message, index) =>
    message.id.startsWith("prior:")
      ? message
      : { ...message, id: `prior:${remintEpoch}:${index}:${message.id}` }
  )
}

/** Drop the failed send + empty assistant shells so retry does not duplicate. */
function stripPendingUserMessage(
  messages: readonly EveMessage[],
  pending?: PendingRetry
): EveMessage[] {
  const copy = [...messages]
  while (copy.length > 0) {
    const last = copy.at(-1)
    if (
      last?.role === "assistant" &&
      last.parts.every((part) => part.type === "step-start")
    ) {
      copy.pop()
      continue
    }
    break
  }
  if (!pending) return copy
  const last = copy.at(-1)
  if (last?.role !== "user") return copy
  const text = last.parts
    .filter(
      (part): part is { type: "text"; text: string } =>
        part.type === "text" && "text" in part && typeof part.text === "string"
    )
    .map((part) => part.text)
    .join("")
    .trim()
  if (text === pending.text.trim()) {
    copy.pop()
  }
  return copy
}

function formatPriorTranscript(
  messages: ReadonlyArray<{
    readonly role: string
    readonly parts: ReadonlyArray<{
      readonly type: string
      readonly text?: string
    }>
  }>
): string | undefined {
  const lines: string[] = []
  for (const message of messages) {
    const texts = message.parts
      .filter(
        (part): part is { type: "text"; text: string } =>
          part.type === "text" &&
          typeof part.text === "string" &&
          part.text.trim().length > 0
      )
      .map((part) => part.text.trim())
    if (texts.length === 0) continue
    lines.push(`${message.role.toUpperCase()}: ${texts.join("\n")}`)
  }
  if (lines.length === 0) return undefined
  return lines.join("\n\n").slice(0, 12_000)
}

function normalizeErrorText(message: string): string {
  return message.toLowerCase()
}

/** Transient not-ready / transport — remount same sessionId briefly. */
function isRecoverableSessionError(message: string): boolean {
  const text = normalizeErrorText(message)
  return (
    text.includes("session is not ready") ||
    text.includes("session_not_ready") ||
    text.includes("econnrefused") ||
    text.includes("econnreset") ||
    text.includes("network error") ||
    text.includes("fetch failed")
  )
}

/** Durable run is gone — remint under the same chat tab. */
function isGoneSessionError(message: string): boolean {
  const text = normalizeErrorText(message)
  return (
    text.includes("no longer active") ||
    text.includes("session_not_active") ||
    text.includes("durable run no longer exists") ||
    text.includes("session run not found") ||
    text.includes("workflowrunnotfound") ||
    text.includes("failed to send the session message")
  )
}

/** Local eve/dev workflow store did not resume the run after restart. */
function isDeadLocalWorkflowError(message: string): boolean {
  const text = normalizeErrorText(message)
  return (
    text.includes("was not resumed") ||
    text.includes("start a new conversation") ||
    text.includes("local workflow run")
  )
}

function getLatestTurnFailure(
  events: ReturnType<typeof useEveAgent>["events"]
): string | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]

    if (event.type === "turn.failed") {
      return event.data.code === "MODEL_CALL_FAILED"
        ? "The model is temporarily unavailable. Please try again."
        : event.data.message
    }

    if (event.type === "turn.completed" || event.type === "turn.cancelled") {
      return undefined
    }

    if (event.type === "message.received") {
      return undefined
    }
  }

  return undefined
}

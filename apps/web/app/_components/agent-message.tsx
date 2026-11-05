"use client"

import type {
  ConversationInput,
  EveAuthorizationPart,
  EveDynamicToolPart,
  EveMessage,
  EveMessageInputRequest,
  EveMessagePart,
} from "eve/react"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  IconArrowRight as ArrowRightIcon,
  IconChevronRight as ChevronRightIcon,
  IconCircleCheck as CheckCircleIcon,
  IconCheck as CheckIcon,
  IconExternalLink as ExternalLinkIcon,
  IconFile as FileIcon,
  IconPhoto as ImageIcon,
  IconKey as KeyRoundIcon,
  IconClipboardList as ClipboardListIcon,
  IconCircleX as XCircleIcon,
} from "@tabler/icons-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@ship-happens/ui/components/collapsible"
import {
  Confirmation,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationRequest,
  ConfirmationTitle,
  ConfirmationAccepted,
  ConfirmationRejected,
} from "@ship-happens/ui/ai-elements/confirmation"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@ship-happens/ui/ai-elements/message"
import {
  Question,
  QuestionInput,
  QuestionOption,
  QuestionOptions,
  QuestionPrompt,
  type QuestionResponse,
  QuestionSubmit,
  type QuestionValue,
} from "@ship-happens/ui/ai-elements/question"
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@ship-happens/ui/ai-elements/reasoning"
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@ship-happens/ui/ai-elements/sources"
import {
  Task,
  TaskContent,
  TaskItem,
  TaskTrigger,
} from "@ship-happens/ui/ai-elements/task"
import {
  BashToolContent,
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@ship-happens/ui/ai-elements/tool"
import { Button } from "@ship-happens/ui/components/button"
import {
  parseReviewCreatedFromBash,
  type ReviewCreatedNotify,
} from "@/lib/agent/parse-review-created"
import { redactSecrets, redactSecretsDeep } from "@/lib/secret-redaction"
import { cn } from "@/lib/utils"

export type AgentInputResponse = {
  readonly optionId?: string
  readonly requestId: string
  readonly text?: string
}

type EveFilePart = Extract<EveMessagePart, { type: "file" }>

export function AgentMessage({
  canRespond,
  isStreaming,
  message,
  onInputResponses,
  questionsFor,
}: {
  readonly canRespond: (requestId: string) => boolean
  readonly isStreaming: boolean
  readonly message: EveMessage
  readonly onInputResponses: (
    responses: readonly AgentInputResponse[]
  ) => void | Promise<void>
  readonly questionsFor: (callId: string) => readonly ConversationInput[]
}) {
  // Redact before children mount so raw secrets never appear in React props/DOM.
  const safeMessage = redactEveMessage(message)
  const lastTextIndex = safeMessage.parts.reduce(
    (last, part, index) => (part.type === "text" ? index : last),
    -1
  )
  const hasAssistantText =
    safeMessage.role === "assistant" &&
    safeMessage.parts.some(
      (part) => part.type === "text" && part.text.length > 0
    )

  const sources = collectMessageSources(safeMessage.parts)
  const { tools, visible } = splitUserFacingParts(
    safeMessage.parts,
    questionsFor
  )

  return (
    <Message
      data-optimistic={safeMessage.metadata?.optimistic ? "true" : undefined}
      from={safeMessage.role}
    >
      <MessageContent>
        {sources.length > 0 ? (
          <Sources>
            <SourcesTrigger count={sources.length} />
            <SourcesContent>
              {sources.map((source) => (
                <Source
                  href={source.href}
                  key={source.href}
                  title={source.title}
                />
              ))}
            </SourcesContent>
          </Sources>
        ) : null}
        {tools.length > 0 ? (
          <ToolWorkGroup
            canRespond={canRespond}
            messageId={safeMessage.id}
            onInputResponses={onInputResponses}
            parts={tools}
            questionsFor={questionsFor}
          />
        ) : null}
        {visible.map(({ part, index }) => {
          if (hasAssistantText && part.type === "reasoning") return null
          return (
            <AgentMessagePart
              canRespond={canRespond}
              key={partKey(part, index)}
              onInputResponses={onInputResponses}
              part={part}
              questionsFor={questionsFor}
              showCaret={
                isStreaming &&
                safeMessage.role === "assistant" &&
                index === lastTextIndex
              }
            />
          )
        })}
      </MessageContent>
    </Message>
  )
}

function isFoldableTool(
  part: EveMessagePart,
  questionsFor: (callId: string) => readonly ConversationInput[]
): part is EveDynamicToolPart {
  if (part.type !== "dynamic-tool") return false
  if (questionsFor(part.toolCallId).length > 0) return false
  if (part.state === "approval-requested") return false
  if (
    part.toolMetadata?.eve?.inputRequest &&
    part.state !== "output-available"
  ) {
    if (part.state === "approval-responded" || part.state === "output-denied") {
      return false
    }
  }
  return true
}

/**
 * One work collapsible for every non-HITL tool in the message; everything else
 * (text, files, approvals) stays in the user-facing stream.
 */
function splitUserFacingParts(
  parts: readonly EveMessagePart[],
  questionsFor: (callId: string) => readonly ConversationInput[]
): {
  tools: EveDynamicToolPart[]
  visible: Array<{ part: EveMessagePart; index: number }>
} {
  const tools: EveDynamicToolPart[] = []
  const visible: Array<{ part: EveMessagePart; index: number }> = []
  parts.forEach((part, index) => {
    if (part.type === "step-start") return
    if (isFoldableTool(part, questionsFor)) {
      tools.push(part)
      return
    }
    visible.push({ part, index })
  })
  return { tools, visible }
}

function toolsStillWorking(parts: readonly EveDynamicToolPart[]): boolean {
  return parts.some(
    (part) =>
      part.state === "input-streaming" ||
      part.state === "input-available" ||
      part.state === "approval-responded" ||
      (part.state === "output-available" && part.partial === true)
  )
}

/** Persist finished durations across remounts within the tab session. */
const workedSecondsByMessageId = new Map<string, number>()

function humanizeWorkedDuration(totalSeconds: number): string {
  const s = Math.max(1, Math.round(totalSeconds))
  if (s < 60) {
    return s === 1 ? "1 second" : `${s} seconds`
  }
  const minutes = Math.floor(s / 60)
  const rem = s % 60
  if (minutes < 60) {
    if (rem === 0) {
      return minutes === 1 ? "1 minute" : `${minutes} minutes`
    }
    return `${minutes}m ${rem}s`
  }
  const hours = Math.floor(minutes / 60)
  const remMin = minutes % 60
  if (remMin === 0) {
    return hours === 1 ? "1 hour" : `${hours} hours`
  }
  return `${hours}h ${remMin}m`
}

function useWorkedSeconds(messageId: string, active: boolean): number {
  const startedAt = useRef<number | null>(null)
  const [seconds, setSeconds] = useState(
    () => workedSecondsByMessageId.get(messageId) ?? 0
  )

  useEffect(() => {
    if (!active) {
      if (startedAt.current != null) {
        const final = Math.max(
          1,
          Math.round((Date.now() - startedAt.current) / 1000)
        )
        workedSecondsByMessageId.set(messageId, final)
        setSeconds(final)
        startedAt.current = null
      }
      return
    }
    startedAt.current ??= Date.now()
    const tick = () => {
      const start = startedAt.current
      if (start == null) return
      const next = Math.max(1, Math.round((Date.now() - start) / 1000))
      setSeconds(next)
    }
    tick()
    const id = window.setInterval(tick, 500)
    return () => window.clearInterval(id)
  }, [active, messageId])

  return seconds
}

function ToolWorkGroup({
  canRespond,
  messageId,
  onInputResponses,
  parts,
  questionsFor,
}: {
  readonly canRespond: (requestId: string) => boolean
  readonly messageId: string
  readonly onInputResponses: (
    responses: readonly AgentInputResponse[]
  ) => void | Promise<void>
  readonly parts: readonly EveDynamicToolPart[]
  readonly questionsFor: (callId: string) => readonly ConversationInput[]
}) {
  // Time tool execution only — don't keep ticking through the final reply stream.
  const toolsActive = toolsStillWorking(parts)
  const elapsed = useWorkedSeconds(messageId, toolsActive)
  const [open, setOpen] = useState(false)

  const title = toolsActive
    ? elapsed > 0
      ? `Working for ${humanizeWorkedDuration(elapsed)}`
      : "Working…"
    : elapsed > 0
      ? `Worked for ${humanizeWorkedDuration(elapsed)}`
      : "Worked"

  const reviewCards = parts
    .map((part) =>
      part.toolName === "bash"
        ? parseReviewCreatedFromBash(part.input, part.output, part.errorText)
        : null
    )
    .filter((review): review is ReviewCreatedNotify => review != null)

  return (
    <div className="space-y-2">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-fit max-w-full items-center gap-1 py-0.5 text-left text-sm text-muted-foreground transition-colors hover:text-foreground">
          <span>{title}</span>
          <ChevronRightIcon
            className={cn(
              "size-3.5 shrink-0 transition-transform",
              open && "rotate-90"
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-1 border-l border-border/70 pl-3">
          {parts.map((part) => (
            <AgentMessagePart
              canRespond={canRespond}
              key={part.toolCallId}
              onInputResponses={onInputResponses}
              part={part}
              questionsFor={questionsFor}
              showCaret={false}
              suppressReviewCard
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
      {reviewCards.map((review) => (
        <ReviewCreatedCard key={review.id} review={review} />
      ))}
    </div>
  )
}

type ChatSource = { href: string; title: string }

function collectMessageSources(parts: readonly EveMessagePart[]): ChatSource[] {
  const byHref = new Map<string, ChatSource>()

  for (const part of parts) {
    const type = (part as { type?: string }).type
    if (type === "source-url" || type === "source") {
      const row = part as {
        url?: unknown
        href?: unknown
        title?: unknown
        source?: { url?: unknown; title?: unknown }
      }
      const href =
        (typeof row.url === "string" && row.url) ||
        (typeof row.href === "string" && row.href) ||
        (typeof row.source?.url === "string" && row.source.url) ||
        null
      if (!href || !/^https?:\/\//i.test(href)) continue
      const title =
        (typeof row.title === "string" && row.title) ||
        (typeof row.source?.title === "string" && row.source.title) ||
        href
      byHref.set(href, { href, title })
      continue
    }

    if (type !== "dynamic-tool") continue
    const toolPart = part as EveDynamicToolPart
    const name = toolPart.toolName.toLowerCase()
    if (
      !name.includes("web_fetch") &&
      !name.includes("webfetch") &&
      name !== "web-fetch"
    ) {
      continue
    }
    const input = toolPart.input
    const record =
      input !== null && typeof input === "object" && !Array.isArray(input)
        ? (input as Record<string, unknown>)
        : null
    const href =
      (typeof record?.url === "string" && record.url) ||
      (typeof record?.href === "string" && record.href) ||
      null
    if (!href || !/^https?:\/\//i.test(href)) continue
    byHref.set(href, {
      href,
      title: typeof record?.title === "string" ? record.title : href,
    })
  }

  return [...byHref.values()]
}

function redactEveMessage(message: EveMessage): EveMessage {
  return {
    ...message,
    parts: message.parts.map((part) => {
      if (part.type === "text" || part.type === "reasoning") {
        return { ...part, text: redactSecrets(part.text) }
      }
      if (part.type === "dynamic-tool") {
        return {
          ...part,
          input: redactSecretsDeep(part.input),
          output: redactSecretsDeep(part.output),
          errorText:
            typeof part.errorText === "string"
              ? redactSecrets(part.errorText)
              : part.errorText,
        }
      }
      return part
    }),
  } as EveMessage
}

function AgentMessagePart({
  canRespond,
  onInputResponses,
  part,
  questionsFor,
  showCaret,
  suppressReviewCard = false,
}: {
  readonly canRespond: (requestId: string) => boolean
  readonly onInputResponses: (
    responses: readonly AgentInputResponse[]
  ) => void | Promise<void>
  readonly part: EveMessagePart
  readonly questionsFor: (callId: string) => readonly ConversationInput[]
  readonly showCaret: boolean
  readonly suppressReviewCard?: boolean
}) {
  switch (part.type) {
    case "step-start":
      return null
    case "text":
      return (
        <MessageResponse caret="block" isAnimating={showCaret}>
          {part.text}
        </MessageResponse>
      )
    case "reasoning":
      return (
        <Reasoning defaultOpen isStreaming={part.state === "streaming"}>
          <ReasoningTrigger />
          <ReasoningContent>{part.text}</ReasoningContent>
        </Reasoning>
      )
    case "file":
      return <AttachmentPart part={part} />
    case "authorization":
      return <AuthorizationPrompt part={part} />
    case "dynamic-tool": {
      const questions = questionsFor(part.toolCallId)
      if (questions.length > 0) {
        return (
          <div className="space-y-4">
            {questions.map(({ request, response }) => (
              <QuestionRequest
                canRespond={canRespond(request.requestId)}
                inputRequest={request}
                inputResponse={response}
                key={request.requestId}
                onInputResponses={onInputResponses}
              />
            ))}
          </div>
        )
      }

      const reviewCreated =
        !suppressReviewCard && part.toolName === "bash"
          ? parseReviewCreatedFromBash(part.input, part.output, part.errorText)
          : null

      return (
        <>
          <Tool defaultOpen={false}>
            <ToolHeader
              state={part.state}
              title={part.toolName}
              toolName={part.toolName}
              type="dynamic-tool"
            />
            <ToolContent>
              {part.toolName === "bash" ? (
                <BashToolContent
                  errorText={part.errorText}
                  input={part.input}
                  output={part.output}
                />
              ) : (
                <>
                  <ToolInput input={part.input} />
                  <ToolOutput errorText={part.errorText} output={part.output} />
                </>
              )}
            </ToolContent>
          </Tool>
          {reviewCreated ? <ReviewCreatedCard review={reviewCreated} /> : null}
          {/* Kept outside the collapsed card so a pending approval is always visible. */}
          <InputRequestActions
            canRespond={canRespond}
            part={part}
            onInputResponses={onInputResponses}
          />
        </>
      )
    }
  }
}

function ReviewCreatedCard({ review }: { review: ReviewCreatedNotify }) {
  const router = useRouter()
  const href = `/rfp/${review.rfpId}?tab=reviews&review=${encodeURIComponent(review.id)}`

  return (
    <div className="space-y-3 rounded-md border border-blue-500/30 bg-blue-500/5 p-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300">
          <ClipboardListIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium">Review waiting on you</p>
          <p className="text-sm text-muted-foreground">{review.title}</p>
          <p className="text-xs text-muted-foreground">
            Open Reviews to Confirm, Edit, or Reject. Chat alone does not decide
            this item.
          </p>
          <Button
            size="sm"
            type="button"
            onClick={() => {
              router.push(href)
              router.refresh()
            }}
          >
            Open in Reviews
            <ExternalLinkIcon className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function QuestionRequest({
  canRespond,
  inputRequest,
  inputResponse,
  onInputResponses,
}: {
  readonly canRespond: boolean
  readonly inputRequest: EveMessageInputRequest
  readonly inputResponse?: AgentInputResponse
  readonly onInputResponses: (
    responses: readonly AgentInputResponse[]
  ) => void | Promise<void>
}) {
  const hasOptions = (inputRequest.options?.length ?? 0) > 0
  const acceptsFreeform = inputRequest.allowFreeform === true || !hasOptions
  const [questionValue, setQuestionValue] = useState<QuestionValue>({
    selectedValues: inputResponse?.optionId ? [inputResponse.optionId] : [],
    text: inputResponse?.text ?? "",
  })

  const submitOption = (optionId: string) => {
    setQuestionValue((value) => ({ ...value, selectedValues: [optionId] }))
    return onInputResponses([
      {
        optionId,
        requestId: inputRequest.requestId,
      },
    ])
  }

  const submitResponse = ({ selectedValues, text }: QuestionResponse) =>
    onInputResponses([
      {
        optionId: selectedValues[0],
        requestId: inputRequest.requestId,
        text,
      },
    ])

  return (
    <Question
      disabled={!canRespond || inputResponse !== undefined}
      onSubmit={submitResponse}
      onValueChange={setQuestionValue}
      value={questionValue}
    >
      <QuestionPrompt>{inputRequest.prompt}</QuestionPrompt>
      {hasOptions ? (
        <QuestionOptions
          className="flex-col items-stretch"
          aria-label={inputRequest.prompt}
        >
          {inputRequest.options?.map((option, index) => (
            <QuestionOption
              className="justify-start px-3 py-2 text-left"
              key={option.id}
              onClick={() => void submitOption(option.id)}
              value={option.id}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm leading-tight text-foreground">
                  {option.label}
                </span>
                {option.description ? (
                  <span className="block text-sm leading-tight text-muted-foreground">
                    {option.description}
                  </span>
                ) : null}
              </span>
              {inputResponse === undefined ? (
                <span aria-hidden="true" className="relative size-6 shrink-0">
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/8 text-xs text-muted-foreground transition-opacity group-hover/option:opacity-0 group-focus-visible/option:opacity-0">
                    {index + 1}
                  </span>
                  <ArrowRightIcon className="absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 text-muted-foreground opacity-0 transition-[color,opacity] group-hover/option:text-foreground group-hover/option:opacity-100 group-focus-visible/option:opacity-100" />
                </span>
              ) : (
                <CheckIcon className="size-4 shrink-0 opacity-0 transition-opacity group-data-[state=checked]/option:opacity-100" />
              )}
            </QuestionOption>
          ))}
        </QuestionOptions>
      ) : null}
      {acceptsFreeform ? (
        <div className="relative">
          <QuestionInput
            aria-label="Answer"
            className={inputResponse === undefined ? "pr-12 pb-12" : undefined}
            placeholder="Type your answer…"
          />
          {inputResponse === undefined &&
          questionValue.text.trim().length > 0 ? (
            <QuestionSubmit
              aria-label="Answer"
              className="absolute right-2 bottom-2"
              size="icon-sm"
            >
              <ArrowRightIcon />
            </QuestionSubmit>
          ) : null}
        </div>
      ) : null}
    </Question>
  )
}

function AttachmentPart({ part }: { readonly part: EveFilePart }) {
  const label = part.filename ?? "Attachment"
  const detail = [part.mediaType, formatBytes(part.size)]
    .filter(Boolean)
    .join(" - ")
  const isImage = part.mediaType.startsWith("image/") && part.url !== undefined
  const Icon = isImage ? ImageIcon : FileIcon
  const body = (
    <span className="flex max-w-sm items-center gap-3 rounded-md border bg-background/60 p-2 text-sm">
      {isImage ? (
        <img
          alt={label}
          className="size-12 shrink-0 rounded-sm object-cover"
          src={part.url}
        />
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{label}</span>
        {detail ? (
          <span className="block truncate text-muted-foreground">{detail}</span>
        ) : null}
      </span>
      {part.url ? (
        <ExternalLinkIcon className="size-4 shrink-0 text-muted-foreground" />
      ) : null}
    </span>
  )

  return part.url ? (
    <a href={part.url} rel="noreferrer" target="_blank">
      {body}
    </a>
  ) : (
    body
  )
}

function AuthorizationPrompt({
  part,
}: {
  readonly part: EveAuthorizationPart
}) {
  const isAuthorized =
    part.state === "completed" && part.outcome === "authorized"
  const isCompleted = part.state === "completed"
  const Icon = isAuthorized
    ? CheckCircleIcon
    : isCompleted
      ? XCircleIcon
      : KeyRoundIcon
  const instructions = part.authorization?.instructions
  const shouldShowInstructions =
    instructions !== undefined && instructions !== part.description

  return (
    <div
      className={cn(
        "space-y-3 rounded-md border p-3",
        isAuthorized
          ? "border-emerald-500/30 bg-emerald-500/5"
          : isCompleted
            ? "border-destructive/30 bg-destructive/5"
            : "border-blue-500/30 bg-blue-500/5"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
            isAuthorized
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : isCompleted
                ? "bg-destructive/10 text-destructive"
                : "bg-blue-500/10 text-blue-700 dark:text-blue-300"
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium">{authorizationTitle(part)}</p>
          <p className="text-sm text-muted-foreground">
            {authorizationDescription(part)}
          </p>
          {shouldShowInstructions ? (
            <p className="text-sm text-muted-foreground">{instructions}</p>
          ) : null}
          {part.state === "required" && part.authorization?.userCode ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Code</span>
              <code className="rounded-md bg-background px-2 py-1 font-mono">
                {part.authorization.userCode}
              </code>
            </div>
          ) : null}
          {part.state === "required" && part.authorization?.url ? (
            <Button
              nativeButton={false}
              render={
                <a
                  href={part.authorization.url}
                  rel="noreferrer"
                  target="_blank"
                />
              }
              size="sm"
            >
              <ExternalLinkIcon className="size-4" />
              Sign in with {part.displayName}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function authorizationTitle(part: EveAuthorizationPart): string {
  if (part.state === "required") {
    return `Connect ${part.displayName}`
  }
  if (part.outcome === "authorized") {
    return `${part.displayName} connected`
  }
  return `${part.displayName} authorization ${formatAuthorizationOutcome(part.outcome)}`
}

function authorizationDescription(part: EveAuthorizationPart): string {
  if (part.state === "required") {
    return part.description
  }
  if (part.outcome === "authorized") {
    return `${part.displayName} connected.`
  }
  const tail = part.reason !== undefined ? ` (${part.reason})` : ""
  return `${part.displayName} authorization ${formatAuthorizationOutcome(part.outcome)}${tail}.`
}

function formatAuthorizationOutcome(
  outcome: NonNullable<EveAuthorizationPart["outcome"]>
): string {
  switch (outcome) {
    case "authorized":
      return "authorized"
    case "declined":
      return "declined"
    case "failed":
      return "failed"
    case "timed-out":
      return "timed out"
  }
}

function formatBytes(size: number | undefined): string | undefined {
  if (size === undefined) {
    return undefined
  }
  if (size < 1024) {
    return `${size} B`
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function InputRequestActions({
  canRespond,
  onInputResponses,
  part,
}: {
  readonly canRespond: (requestId: string) => boolean
  readonly onInputResponses: (
    responses: readonly AgentInputResponse[]
  ) => void | Promise<void>
  readonly part: EveDynamicToolPart
}) {
  const inputRequest = part.toolMetadata?.eve?.inputRequest
  if (!inputRequest) {
    return null
  }

  const inputResponse = part.toolMetadata?.eve?.inputResponse
  const selectedOption = inputRequest.options?.find(
    (option) => option.id === inputResponse?.optionId
  )
  const approveOption = inputRequest.options?.find(
    (option) => option.style !== "danger"
  )
  const denyOption = inputRequest.options?.find(
    (option) => option.style === "danger"
  )
  const isConfirmationDisplay =
    inputRequest.display === "confirmation" ||
    part.state === "approval-requested" ||
    part.state === "approval-responded" ||
    part.state === "output-denied"

  if (isConfirmationDisplay && part.approval) {
    const approval =
      part.approval.approved === undefined
        ? { id: part.approval.id }
        : part.approval.approved
          ? {
              id: part.approval.id,
              approved: true as const,
              reason: part.approval.reason,
            }
          : {
              id: part.approval.id,
              approved: false as const,
              reason: part.approval.reason,
            }

    return (
      <Confirmation approval={approval} state={part.state}>
        <ConfirmationRequest>
          <ConfirmationTitle>{inputRequest.prompt}</ConfirmationTitle>
          <ConfirmationActions>
            {denyOption ? (
              <ConfirmationAction
                disabled={!canRespond(inputRequest.requestId)}
                onClick={() => {
                  void onInputResponses([
                    {
                      optionId: denyOption.id,
                      requestId: inputRequest.requestId,
                    },
                  ])
                }}
                variant="outline"
              >
                {denyOption.label}
              </ConfirmationAction>
            ) : null}
            {approveOption ? (
              <ConfirmationAction
                disabled={!canRespond(inputRequest.requestId)}
                onClick={() => {
                  void onInputResponses([
                    {
                      optionId: approveOption.id,
                      requestId: inputRequest.requestId,
                    },
                  ])
                }}
              >
                {approveOption.label}
              </ConfirmationAction>
            ) : null}
          </ConfirmationActions>
        </ConfirmationRequest>
        <ConfirmationAccepted>
          <ConfirmationTitle>
            Approved
            {selectedOption?.label || inputResponse?.text
              ? `: ${selectedOption?.label ?? inputResponse?.text}`
              : ""}
          </ConfirmationTitle>
        </ConfirmationAccepted>
        <ConfirmationRejected>
          <ConfirmationTitle>
            Denied
            {selectedOption?.label || inputResponse?.text
              ? `: ${selectedOption?.label ?? inputResponse?.text}`
              : ""}
          </ConfirmationTitle>
        </ConfirmationRejected>
      </Confirmation>
    )
  }

  const settledApproval =
    part.approval?.approved === undefined
      ? undefined
      : part.approval.approved
        ? "Approved"
        : "Denied"

  return (
    <Task
      defaultOpen
      className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3"
    >
      <TaskTrigger title={inputRequest.prompt} />
      <TaskContent>
        {inputResponse || settledApproval ? (
          <TaskItem>
            Responded:{" "}
            {selectedOption?.label ??
              inputResponse?.text ??
              inputResponse?.optionId ??
              settledApproval}
          </TaskItem>
        ) : (
          <TaskItem className="flex flex-wrap gap-2">
            {inputRequest.options?.map((option) => (
              <Button
                disabled={!canRespond(inputRequest.requestId)}
                key={option.id}
                onClick={() => {
                  void onInputResponses([
                    {
                      optionId: option.id,
                      requestId: inputRequest.requestId,
                    },
                  ])
                }}
                size="sm"
                type="button"
                variant={option.style === "danger" ? "destructive" : "default"}
              >
                {option.label}
              </Button>
            ))}
          </TaskItem>
        )}
      </TaskContent>
    </Task>
  )
}

function partKey(part: EveMessagePart, index: number): string {
  switch (part.type) {
    case "authorization":
      return part.attemptId === undefined
        ? `authorization:${part.turnId}:${part.stepIndex}:${part.name}`
        : `authorization:${part.attemptId}`
    case "dynamic-tool":
      return part.toolCallId
    case "reasoning":
    case "text":
      return `${part.type}:${part.id ?? index}`
    default:
      return `${part.type}:${index}`
  }
}

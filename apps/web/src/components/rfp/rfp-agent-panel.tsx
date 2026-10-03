import * as React from "react"
import {
  IconAnchor,
  IconBuilding,
  IconCheck,
  IconCircleDashed,
  IconCopy,
  IconFileSpreadsheet,
  IconCurrencyDollar,
  IconListCheck,
  IconMicrophone,
  IconPlus,
  IconSend2,
  IconThumbDown,
  IconThumbUp,
  IconChevronDown,
} from "@tabler/icons-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@workspace/ui/components/input-group"
import {
  Message,
  MessageContent,
  MessageFooter,
  MessageGroup,
} from "@workspace/ui/components/message"
import { Bubble, BubbleContent } from "@workspace/ui/components/bubble"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"
import {
  buildInitialAgentMessages,
  buildMockAgentReply,
  type AgentChatMessage,
  type AgentTodo,
} from "@/lib/mock/agent-chat"
import type { MockRfp } from "@/lib/mock/rfps"

const AGENT_MODES = ["Auto", "Fill", "Review"] as const

function TodoList({ todos }: { todos: AgentTodo[] }) {
  const doneCount = todos.filter((t) => t.done).length
  return (
    <div className="rounded-xl border bg-muted/40 px-3 py-2.5">
      <ul className="flex flex-col gap-1.5">
        {todos.map((todo) => (
          <li
            key={todo.id}
            className="flex items-start gap-2 text-sm text-foreground/90"
          >
            {todo.done ? (
              <IconCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            ) : (
              <IconCircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            )}
            <span className={cn(todo.done && "text-muted-foreground")}>
              {todo.label}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <IconCheck className="size-3.5 text-emerald-500" />
        {doneCount} of {todos.length} steps completed
      </p>
    </div>
  )
}

function renderInline(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean)
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="rounded bg-muted px-1 py-0.5 font-mono text-xs"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    return <React.Fragment key={index}>{part}</React.Fragment>
  })
}

function AgentMarkdown({ text }: { text: string }) {
  const blocks = text.split("\n")
  return (
    <div className="flex flex-col gap-2 text-sm leading-relaxed">
      {blocks.map((line, index) => {
        if (!line.trim()) return <div key={index} className="h-1" />
        if (line.startsWith("> ")) {
          return (
            <blockquote
              key={index}
              className="border-l-2 border-border pl-3 text-muted-foreground"
            >
              {renderInline(line.slice(2))}
            </blockquote>
          )
        }
        return <p key={index}>{renderInline(line)}</p>
      })}
    </div>
  )
}

function ChatMessage({ message }: { message: AgentChatMessage }) {
  if (message.role === "user") {
    return (
      <Message align="start">
        <MessageContent>
          <Bubble variant="ghost" align="start">
            <BubbleContent className="max-w-3xl text-[15px] leading-relaxed whitespace-pre-wrap">
              {message.text}
            </BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    )
  }

  return (
    <Message align="start">
      <MessageContent className="max-w-3xl gap-3">
        {message.todos ? <TodoList todos={message.todos} /> : null}

        {message.durationLabel ? (
          <p className="text-xs text-muted-foreground">{message.durationLabel}</p>
        ) : null}

        <AgentMarkdown text={message.text} />

        {message.stats && message.stats.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {message.stats.map((stat) => (
              <Badge
                key={stat.label}
                variant="outline"
                className={cn(
                  "rounded-full font-normal",
                  stat.tone === "positive" &&
                    "border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
                  stat.tone === "warning" &&
                    "border-amber-500/30 text-amber-700 dark:text-amber-400"
                )}
              >
                {stat.label}
              </Badge>
            ))}
          </div>
        ) : null}

        <MessageFooter className="gap-1 px-0">
          <Button variant="ghost" size="icon-sm" className="size-7">
            <IconThumbUp />
            <span className="sr-only">Helpful</span>
          </Button>
          <Button variant="ghost" size="icon-sm" className="size-7">
            <IconThumbDown />
            <span className="sr-only">Not helpful</span>
          </Button>
          <Button variant="ghost" size="icon-sm" className="size-7">
            <IconCopy />
            <span className="sr-only">Copy</span>
          </Button>
        </MessageFooter>
      </MessageContent>
    </Message>
  )
}

function AgentContextSidebar({ rfp }: { rfp: MockRfp }) {
  const items = [
    {
      icon: IconFileSpreadsheet,
      label: "Bid sheet",
      detail: rfp.templateName,
    },
    {
      icon: IconCurrencyDollar,
      label: "Carrier rates",
      detail: "Starboard contracts",
    },
    {
      icon: IconAnchor,
      label: "Ports & lanes",
      detail: "Origin / destination map",
    },
    {
      icon: IconListCheck,
      label: "Requirements",
      detail: "Customer fill rules",
    },
  ] as const

  return (
    <aside className="flex w-56 shrink-0 flex-col gap-3 border-l bg-muted/20 px-3 py-3 max-lg:hidden">
      <div>
        <p className="text-xs text-muted-foreground">Working on</p>
        <p className="truncate text-sm font-medium">{rfp.name}</p>
        <p className="truncate text-xs text-muted-foreground">{rfp.customer}</p>
      </div>

      <div className="flex flex-col gap-1.5 rounded-lg border bg-background/60 p-2.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Filled</span>
          <span className="font-medium text-emerald-600 dark:text-emerald-400">
            42
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Need review</span>
          <span className="font-medium text-amber-700 dark:text-amber-400">
            3
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Skipped</span>
          <span className="font-medium">7</span>
        </div>
      </div>

      <Separator />

      <nav className="flex flex-col gap-0.5">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            className="flex items-start gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/60"
          >
            <item.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">
                {item.label}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {item.detail}
              </span>
            </span>
          </button>
        ))}
      </nav>
    </aside>
  )
}

export function RfpAgentPanel({ rfp }: { rfp: MockRfp }) {
  const [messages, setMessages] = React.useState(() =>
    buildInitialAgentMessages(rfp)
  )
  const [draft, setDraft] = React.useState("")
  const [mode, setMode] = React.useState<(typeof AGENT_MODES)[number]>("Auto")
  const bottomRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages])

  function sendMessage() {
    const text = draft.trim()
    if (!text) return

    const userMessage: AgentChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: "user",
      text,
    }

    setMessages((prev) => [...prev, userMessage, buildMockAgentReply(text)])
    setDraft("")
  }

  return (
    <div className="flex h-[min(720px,calc(100svh-14rem))] min-h-[520px] flex-1 overflow-hidden rounded-xl border bg-background">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 lg:px-6">
            <MessageGroup>
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
            </MessageGroup>
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t bg-background/80 px-3 py-3 backdrop-blur lg:px-4">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
            <InputGroup className="h-auto rounded-2xl border-border/80 bg-muted/30 dark:bg-input/20">
              <InputGroupAddon align="block-start" className="pt-2.5">
                <InputGroupButton
                  size="icon-xs"
                  variant="ghost"
                  aria-label="Attach bid sheet or note"
                  disabled
                >
                  <IconPlus />
                </InputGroupButton>
              </InputGroupAddon>

              <InputGroupTextarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask the fill agent… e.g. prefer OOCL on Asia–USWC"
                rows={2}
                className="min-h-12 px-3"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    sendMessage()
                  }
                }}
              />

              <InputGroupAddon align="block-end" className="justify-between">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <InputGroupButton variant="ghost" size="xs" />
                    }
                  >
                    {mode}
                    <IconChevronDown data-icon="inline-end" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    <DropdownMenuGroup>
                      {AGENT_MODES.map((option) => (
                        <DropdownMenuItem
                          key={option}
                          onClick={() => setMode(option)}
                        >
                          {option}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex items-center gap-1">
                  <InputGroupButton
                    size="icon-xs"
                    variant="ghost"
                    aria-label="Voice input"
                    disabled
                  >
                    <IconMicrophone />
                  </InputGroupButton>
                  <InputGroupButton
                    size="icon-xs"
                    variant="default"
                    aria-label="Send"
                    disabled={!draft.trim()}
                    onClick={sendMessage}
                  >
                    <IconSend2 />
                  </InputGroupButton>
                </div>
              </InputGroupAddon>
            </InputGroup>

            <div className="flex flex-wrap items-center gap-2 px-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5">
                <IconBuilding className="size-3.5" />
                Org workspace
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5">
                <IconFileSpreadsheet className="size-3.5" />
                {rfp.templateName}
              </span>
              <span className="text-muted-foreground/80">
                Mock chat — not connected to the fill agent yet
              </span>
            </div>
          </div>
        </div>
      </div>

      <AgentContextSidebar rfp={rfp} />
    </div>
  )
}

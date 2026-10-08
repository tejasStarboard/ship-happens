"use client";

import type { UserContent, UIMessage } from "ai";
import { useEveAgent } from "eve/react";
import {
  AlertCircleIcon,
  BrainIcon,
  CheckIcon,
  GlobeIcon,
  MessageSquareIcon,
  PlusIcon,
  SquareIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  Conversation,
  ConversationContent,
  ConversationDownload,
  ConversationEmptyState,
  ConversationScrollButton,
  ConversationTopFade,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
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
} from "@/components/ai-elements/model-selector";
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
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Button } from "@/components/ui/button";
import {
  CHAT_MODEL_CHEFS,
  CHAT_MODELS,
  DEFAULT_CHAT_MODEL_ID,
  getChatModel,
  type ChatModelId,
} from "@/lib/chat-models";
import { cn } from "@/lib/utils";
import { WEB_CHAT_AGENT } from "@/app/eve-agent";
import { AgentMessage } from "./agent-message";

const DEFAULT_AGENT_NAME = "eve-nextjs";
const AGENT_NAME = WEB_CHAT_AGENT ?? DEFAULT_AGENT_NAME;

const SUGGESTIONS = [
  "What are the latest trends in AI?",
  "How does machine learning work?",
  "Explain quantum computing",
  "Best practices for React development",
  "Tell me about TypeScript benefits",
  "How to optimize database queries?",
];

export type WorkspaceChatContext = {
  readonly workspaceId?: string;
  readonly workspaceFiles: readonly string[];
  readonly openTabs: readonly string[];
  readonly activeTab: string | null;
};

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
}: {
  readonly sessionId?: string;
  readonly sessionless?: boolean;
  readonly variant?: "page" | "panel";
  readonly workspaceContext?: WorkspaceChatContext;
  readonly onSessionId?: (sessionId: string) => void;
  readonly onIdle?: () => void;
  readonly onTitleHint?: (title: string) => void;
  /** When false, skip rewriting the browser URL on session create (multi-chat panel). */
  readonly syncUrl?: boolean;
  readonly insertText?: string | null;
  readonly onInsertTextConsumed?: () => void;
}) {
  const [cancellationError, setCancellationError] = useState<string>();
  const [text, setText] = useState("");
  const [model, setModel] = useState<ChatModelId>(DEFAULT_CHAT_MODEL_ID);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const isPanel = variant === "panel";
  const titleHintSent = useRef(false);

  const agent = useEveAgent({
    agent: WEB_CHAT_AGENT,
    prewarm: isPanel && sessionId === undefined,
    initialSession:
      sessionId === undefined
        ? undefined
        : {
            sessionId,
            streamIndex: 0,
          },
    resume: sessionId !== undefined,
    onSessionChange(session) {
      if (session === undefined) return;
      onSessionId?.(session.sessionId);
      if (syncUrl && sessionId === undefined) {
        // Next patches window.history to navigate, which would detach the active stream.
        History.prototype.replaceState.call(
          window.history,
          window.history.state,
          "",
          `/s/${encodeURIComponent(session.sessionId)}`,
        );
      }
    },
  });

  const selectedModel = useMemo(() => getChatModel(model), [model]);
  const isBusy = agent.status === "submitted" || agent.status === "streaming";
  const isResuming = agent.status === "resuming";
  const isEmpty = agent.data.messages.length === 0;
  const lastMessage = agent.data.messages.at(-1);
  const isPendingAssistantShell =
    lastMessage?.role === "assistant" &&
    lastMessage.parts.every((part) => part.type === "step-start");
  const showPendingThinking =
    isBusy &&
    (agent.status === "submitted" || lastMessage?.role !== "assistant" || isPendingAssistantShell);
  const turnFailure = isBusy || isResuming ? undefined : getLatestTurnFailure(agent.events);
  const errorMessage = cancellationError ?? agent.error?.message ?? turnFailure;
  const hasConversationContent = sessionless || !isEmpty || errorMessage !== undefined;
  const showConversationLayout = isResuming || hasConversationContent;
  const activeSessionId = sessionId ?? agent.session?.sessionId;
  const canRespond = (requestId: string) =>
    !isResuming && agent.data.inputs[requestId]?.status === "open";
  const questionsFor = (callId: string) =>
    Object.values(agent.data.inputs).filter(
      (input) => input.request.kind === "question" && input.request.action.callId === callId,
    );

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
                note:
                  "The IDE mirrors /workspace. Prefer read_file/write_file/bash on these paths. Open tabs are what the user is viewing now. Multiple chats share this workspace.",
              },
            }
          : {}),
      },
    }),
    [model, useWebSearch, workspaceContext],
  );

  const wasBusyRef = useRef(false);
  useEffect(() => {
    const busy = agent.status === "submitted" || agent.status === "streaming";
    if (wasBusyRef.current && !busy) {
      onIdle?.();
    }
    wasBusyRef.current = busy;
  }, [agent.status, onIdle]);

  useEffect(() => {
    if (titleHintSent.current || !onTitleHint) return;
    const firstUser = agent.data.messages.find((message) => message.role === "user");
    if (!firstUser) return;
    const textPart = firstUser.parts.find(
      (part) => part.type === "text" && "text" in part && typeof part.text === "string",
    ) as { text?: string } | undefined;
    const hint = textPart?.text?.trim().replace(/\s+/g, " ").slice(0, 36);
    if (!hint) return;
    titleHintSent.current = true;
    onTitleHint(hint.length < (textPart?.text?.trim().length ?? 0) ? `${hint}…` : hint);
  }, [agent.data.messages, onTitleHint]);

  useEffect(() => {
    if (!insertText) return;
    setText((prev) => (prev.trim() ? `${prev.trim()} ${insertText}` : insertText));
    onInsertTextConsumed?.();
  }, [insertText, onInsertTextConsumed]);

  const requestCancellation = () => {
    setCancellationError(undefined);
    void agent.cancel().catch((error: unknown) => {
      setCancellationError(toErrorMessage(error));
    });
  };

  const sendText = useCallback(
    async (raw: string, files: PromptInputMessage["files"] = []) => {
      const next = raw.trim();
      if ((next.length === 0 && files.length === 0) || isResuming) return;

      setText("");
      setCancellationError(undefined);
      const options = turnOptions(isBusy);

      if (files.length === 0) {
        await agent.send(next, options);
        return;
      }

      const parts: UserContent = [];
      if (next.length > 0) {
        parts.push({ text: next, type: "text" });
      }
      for (const file of files) {
        parts.push({
          data: file.url,
          filename: file.filename,
          mediaType: file.mediaType,
          type: "file",
        });
      }

      await agent.send(parts, options);
    },
    [agent, isBusy, isResuming, turnOptions],
  );

  const handleSubmit = async (message: PromptInputMessage) => {
    await sendText(message.text, message.files);
  };

  const handleSuggestion = (suggestion: string) => {
    void sendText(suggestion);
  };

  const downloadMessages = agent.data.messages as unknown as UIMessage[];

  const composer = (
    <PromptInput accept="image/*,application/pdf,text/*" globalDrop multiple onSubmit={handleSubmit}>
      <PromptInputHeader>
        <PromptInputAttachmentsDisplay />
      </PromptInputHeader>
      <PromptInputBody>
        <PromptInputTextarea
          disabled={isResuming}
          onChange={(event) => setText(event.currentTarget.value)}
          placeholder={useWebSearch ? "Ask with web search preference…" : "Send a message…"}
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
            disabled={isResuming}
            onTranscriptionChange={(transcript) => {
              setText((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
            }}
            size="icon-sm"
            type="button"
            variant="ghost"
          />
          <ModelSelector onOpenChange={setModelSelectorOpen} open={modelSelectorOpen}>
            <ModelSelectorTrigger asChild>
              <PromptInputButton className="gap-2" type="button" variant="ghost">
                <ModelSelectorLogo provider={selectedModel.chefSlug} />
                <ModelSelectorName className="max-w-28 sm:max-w-40">
                  {selectedModel.name}
                </ModelSelectorName>
              </PromptInputButton>
            </ModelSelectorTrigger>
            <ModelSelectorContent title="Select a model">
              <ModelSelectorInput placeholder="Search models…" />
              <ModelSelectorList>
                <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                {CHAT_MODEL_CHEFS.map((chef) => (
                  <ModelSelectorGroup heading={chef} key={chef}>
                    {CHAT_MODELS.filter((entry) => entry.chef === chef).map((entry) => {
                      const isSelected = entry.id === model;
                      return (
                        <ModelSelectorItem
                          key={entry.id}
                          onSelect={() => {
                            setModel(entry.id);
                            setModelSelectorOpen(false);
                          }}
                          value={`${entry.name} ${entry.id}`}
                        >
                          <ModelSelectorLogo provider={entry.chefSlug} />
                          <ModelSelectorName>{entry.name}</ModelSelectorName>
                          <ModelSelectorLogoGroup>
                            {entry.providers.map((provider) => (
                              <ModelSelectorLogo key={provider} provider={provider} />
                            ))}
                          </ModelSelectorLogoGroup>
                          {isSelected ? <CheckIcon className="size-4" /> : <span className="size-4" />}
                        </ModelSelectorItem>
                      );
                    })}
                  </ModelSelectorGroup>
                ))}
              </ModelSelectorList>
            </ModelSelectorContent>
          </ModelSelector>
        </PromptInputTools>
        <ComposerAction
          hasInputText={text.trim().length > 0}
          isBusy={isBusy}
          isResuming={isResuming}
          onCancel={requestCancellation}
          status={agent.status}
        />
      </PromptInputFooter>
    </PromptInput>
  );

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
          icon={<MessageSquareIcon className={isPanel ? "size-7" : "size-10"} />}
          title={isPanel ? "Agent" : `Chat with ${AGENT_NAME}`}
        />
      ) : null}
      {agent.data.messages.map((message, index) =>
        showPendingThinking &&
        isPendingAssistantShell &&
        message.id === lastMessage.id ? null : (
          <AgentMessage
            canRespond={canRespond}
            isStreaming={agent.status === "streaming" && index === agent.data.messages.length - 1}
            key={message.id}
            message={message}
            questionsFor={questionsFor}
            onInputResponses={(inputResponses) => {
              setCancellationError(undefined);
              return agent.respond(inputResponses, turnOptions(false));
            }}
          />
        ),
      )}
      {showPendingThinking ? <PendingThinking /> : null}
      {errorMessage ? <ErrorMessage message={errorMessage} /> : null}
    </>
  );

  if (isPanel) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-background">
        <div className="flex h-8 shrink-0 items-center justify-between gap-2 border-border border-b px-2">
          <span className="truncate px-1 font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
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
          <ConversationContent className="gap-4 px-3 pt-3 pb-4">{messages}</ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="shrink-0 border-border border-t bg-background p-2">{composer}</div>
      </div>
    );
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
            : "flex max-w-2xl flex-1 flex-col items-center justify-center gap-8 pb-[8vh]",
        )}
      >
        {showConversationLayout ? null : (
          <div className="flex w-full flex-col items-center gap-6 text-center">
            <div className="space-y-2">
              <h1 className="font-medium text-5xl tracking-tighter">{AGENT_NAME}</h1>
              <p className="text-muted-foreground text-sm">
                Durable agent chat · pick a model below
              </p>
            </div>
            <Suggestions className="px-1">
              {SUGGESTIONS.map((suggestion) => (
                <Suggestion key={suggestion} onClick={handleSuggestion} suggestion={suggestion} />
              ))}
            </Suggestions>
          </div>
        )}
        <div className="w-full space-y-3">
          {showConversationLayout && isEmpty && !errorMessage ? (
            <Suggestions className="px-1">
              {SUGGESTIONS.map((suggestion) => (
                <Suggestion key={suggestion} onClick={handleSuggestion} suggestion={suggestion} />
              ))}
            </Suggestions>
          ) : null}
          {composer}
        </div>
      </div>
    </main>
  );
}

function PromptInputAttachmentsDisplay() {
  const attachments = usePromptInputAttachments();

  if (attachments.files.length === 0) {
    return null;
  }

  return (
    <Attachments className="w-full" variant="inline">
      {attachments.files.map((file) => (
        <Attachment data={file} key={file.id} onRemove={() => attachments.remove(file.id)}>
          <AttachmentPreview />
          <span className="max-w-40 truncate text-xs">{file.filename ?? "Attachment"}</span>
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
}

function ComposerAction({
  hasInputText,
  isBusy,
  isResuming,
  onCancel,
  status,
}: {
  readonly hasInputText: boolean;
  readonly isBusy: boolean;
  readonly isResuming: boolean;
  readonly onCancel: () => void;
  readonly status: ReturnType<typeof useEveAgent>["status"];
}) {
  const attachments = usePromptInputAttachments();
  const canSubmit = hasInputText || attachments.files.length > 0;

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
    );
  }

  return (
    <PromptInputButton aria-label="Stop" className="static" onClick={onCancel} variant="outline">
      <SquareIcon className="size-3 fill-current" />
    </PromptInputButton>
  );
}

function ErrorMessage({ message }: { readonly message: string }) {
  return (
    <Message className="max-w-full" from="assistant">
      <MessageContent>
        <div
          className="flex w-full items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm"
          role="alert"
        >
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div>
            <p className="font-medium">Request failed</p>
            <p className="mt-0.5 text-muted-foreground">{message}</p>
          </div>
        </div>
      </MessageContent>
    </Message>
  );
}

function ChatHeader({
  canStartNewChat,
  downloadMessages,
  modelName,
}: {
  readonly canStartNewChat: boolean;
  readonly downloadMessages?: UIMessage[];
  readonly modelName: string;
}) {
  return (
    <header className="pointer-events-none fixed top-0 right-0 left-0 z-20 h-14">
      <div className="relative mx-auto flex h-full w-full max-w-3xl items-center justify-center bg-background px-24">
        <div className="flex min-w-0 flex-col items-center">
          <span className="truncate text-muted-foreground text-sm">{AGENT_NAME}</span>
          <span className="truncate text-muted-foreground/80 text-xs">{modelName}</span>
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
            <span className="hidden font-normal text-sm sm:inline">New chat</span>
          </Button>
        ) : null}
      </div>
    </header>
  );
}

function PendingThinking() {
  return (
    <Message aria-live="polite" from="assistant">
      <MessageContent>
        <div className="mb-4 flex w-full items-center gap-2 text-muted-foreground text-sm">
          <BrainIcon className="size-4" />
          <Shimmer duration={1}>Thinking</Shimmer>
        </div>
      </MessageContent>
    </Message>
  );
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to cancel the response.";
}

function getLatestTurnFailure(
  events: ReturnType<typeof useEveAgent>["events"],
): string | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];

    if (event.type === "turn.failed") {
      return event.data.code === "MODEL_CALL_FAILED"
        ? "The model is temporarily unavailable. Please try again."
        : event.data.message;
    }

    if (event.type === "turn.completed" || event.type === "turn.cancelled") {
      return undefined;
    }

    if (event.type === "message.received") {
      return undefined;
    }
  }

  return undefined;
}

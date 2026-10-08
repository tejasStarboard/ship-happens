import { defineAgent, defineDynamic } from "eve";
import { anthropic } from "eve/models/anthropic";
import type { ModelMessage } from "ai";
import {
  DEFAULT_CHAT_MODEL_ID,
  getChatModel,
  isChatModelId,
  type ChatModelId,
} from "@/lib/chat-models";

const CLIENT_CONTEXT_PREFIX = "Client context:\n";

function messageText(message: ModelMessage): string {
  if (typeof message.content === "string") {
    return message.content;
  }
  if (!Array.isArray(message.content)) {
    return "";
  }
  return message.content
    .map((part) => (part.type === "text" && "text" in part ? part.text : ""))
    .join("");
}

function preferredModelFromMessages(messages: readonly ModelMessage[]): ChatModelId {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const text = messageText(messages[index]);
    if (!text.startsWith(CLIENT_CONTEXT_PREFIX)) {
      continue;
    }
    try {
      const parsed = JSON.parse(text.slice(CLIENT_CONTEXT_PREFIX.length)) as {
        model?: unknown;
      };
      if (typeof parsed.model === "string" && isChatModelId(parsed.model)) {
        return parsed.model;
      }
    } catch {
      // Ignore malformed client context and keep scanning.
    }
  }
  return DEFAULT_CHAT_MODEL_ID;
}

export default defineAgent({
  model: defineDynamic({
    events: {
      // Live LanguageModel objects are only valid from step.started.
      "step.started": (_event, ctx) => {
        const selected = getChatModel(preferredModelFromMessages(ctx.messages));
        return {
          model: anthropic(selected.id),
          modelContextWindowTokens: selected.contextWindowTokens,
          reasoning: selected.reasoning,
        };
      },
    },
  }),
  // better-sqlite3 ships a native .node binary; keep it external so eve's
  // compile step does not break the addon path inside channel auth.
  build: {
    externalDependencies: ["better-sqlite3"],
  },
});

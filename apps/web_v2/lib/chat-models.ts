/** Anthropic models available in the web chat model picker (direct API, not Gateway). */
export const CHAT_MODELS = [
  {
    chef: "Anthropic",
    chefSlug: "anthropic" as const,
    id: "claude-sonnet-5",
    name: "Claude Sonnet 5",
    providers: ["anthropic"] as const,
    contextWindowTokens: 200_000,
    reasoning: "low" as const,
  },
  {
    chef: "Anthropic",
    chefSlug: "anthropic" as const,
    id: "claude-sonnet-5-5",
    name: "Claude Sonnet 5.5",
    providers: ["anthropic"] as const,
    contextWindowTokens: 200_000,
    reasoning: "low" as const,
  },
  {
    chef: "Anthropic",
    chefSlug: "anthropic" as const,
    id: "claude-opus-5",
    name: "Claude Opus 5",
    providers: ["anthropic"] as const,
    contextWindowTokens: 200_000,
    reasoning: "high" as const,
  },
  {
    chef: "Anthropic",
    chefSlug: "anthropic" as const,
    id: "claude-haiku-4-5-20251001",
    name: "Claude Haiku 4.5",
    providers: ["anthropic"] as const,
    contextWindowTokens: 200_000,
    reasoning: "low" as const,
  },
] as const;

export type ChatModelId = (typeof CHAT_MODELS)[number]["id"];

export const DEFAULT_CHAT_MODEL_ID: ChatModelId = "claude-sonnet-5";

export const CHAT_MODEL_CHEFS = ["Anthropic"] as const;

export function isChatModelId(value: string): value is ChatModelId {
  return CHAT_MODELS.some((model) => model.id === value);
}

export function getChatModel(id: string) {
  return CHAT_MODELS.find((model) => model.id === id) ?? CHAT_MODELS[0];
}

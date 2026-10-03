import { createResumableStreamContext } from "resumable-stream/ioredis"
import { Redis } from "ioredis"
import { env } from "@/env"

/**
 * AI SDK v7 resumable UIMessage streams (Redis pub/sub).
 * Chunks live in Redis; Postgres only stores `rfp_chats.activeStreamId`.
 * @see https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-resume-streams
 *
 * `waitUntil: null` is correct for long-lived Node (Vite/Nitro). On Vercel
 * Fluid/serverless, pass a platform `waitUntil` when wiring the chat route.
 */
export function createRfpResumableStreamContext(
  waitUntil: ((promise: Promise<unknown>) => void) | null = null
) {
  const url = env.REDIS_URL
  // Pub/sub needs dedicated connections (cannot share with command clients).
  const publisher = new Redis(url)
  const subscriber = new Redis(url)

  return createResumableStreamContext({
    waitUntil,
    keyPrefix: "rfp-chat",
    publisher,
    subscriber,
  })
}

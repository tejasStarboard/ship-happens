import { asc, eq } from "drizzle-orm"
import type { UIMessage } from "ai"
import { db } from "@/db"
import { rfpChats, rfpMessages } from "@/db/schema"

type RfpChatId = (typeof rfpChats.$inferSelect)["id"]

/**
 * Load AI SDK v7 UIMessages for an RFP chat.
 * @see https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence
 */
export async function loadRfpChatMessages(
  chatId: string
): Promise<UIMessage[]> {
  const rows = await db
    .select()
    .from(rfpMessages)
    .where(eq(rfpMessages.chatId, chatId))
    .orderBy(asc(rfpMessages.createdAt))

  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    parts: row.parts,
    ...(row.metadata != null ? { metadata: row.metadata } : {}),
  }))
}

/**
 * Replace-all save of UIMessages for a chat.
 * Call from `toUIMessageStream({ onEnd })` after a completed turn (AI SDK v7).
 */
export async function saveRfpChatMessages({
  chatId,
  messages,
  activeStreamId,
}: {
  chatId: RfpChatId
  messages: UIMessage[]
  /** Pass `null` to clear; omit to leave unchanged. */
  activeStreamId?: string | null
}): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(rfpMessages).where(eq(rfpMessages.chatId, chatId))

    if (messages.length > 0) {
      await tx.insert(rfpMessages).values(
        messages.map((message) => ({
          id: message.id,
          chatId,
          role: message.role as "system" | "user" | "assistant",
          parts: message.parts,
          metadata: message.metadata ?? null,
        }))
      )
    }

    if (activeStreamId !== undefined) {
      await tx
        .update(rfpChats)
        .set({ activeStreamId })
        .where(eq(rfpChats.id, chatId))
    }
  })
}

/** Point the chat at a Redis resumable stream (or clear when done/stopped). */
export async function setRfpChatActiveStreamId({
  chatId,
  activeStreamId,
}: {
  chatId: RfpChatId
  activeStreamId: string | null
}): Promise<void> {
  await db
    .update(rfpChats)
    .set({ activeStreamId })
    .where(eq(rfpChats.id, chatId))
}

export async function getRfpChatActiveStreamId(
  chatId: string
): Promise<string | null> {
  const [row] = await db
    .select({ activeStreamId: rfpChats.activeStreamId })
    .from(rfpChats)
    .where(eq(rfpChats.id, chatId))
    .limit(1)

  return row?.activeStreamId ?? null
}

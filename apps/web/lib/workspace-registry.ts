import { randomUUID } from "node:crypto"
import { and, eq, desc, sql } from "drizzle-orm"
import { access, readdir, rm } from "node:fs/promises"
import { constants as fsConstants } from "node:fs"
import path from "node:path"
import { db } from "@/lib/db"
import { rfpChats, rfpSourceFiles, rfps } from "@/lib/db/schema"
import { DomainError } from "@/lib/domain/errors"
import {
  assertOrgOwnsWorkspace,
  isValidWorkspaceId,
} from "@/lib/domain/workspace/workspace.authorize"
import {
  extensionForMime,
  sanitizeFileName,
} from "@/lib/storage/spreadsheet-constants"
import {
  ensureWorkspace,
  isValidSessionId,
  mergeWorkspaceFiles,
  WORKSPACES_ROOT,
  workspaceFileExists,
  workspaceRoot,
  writeWorkspaceFile,
} from "@/lib/workspace-fs"

export { isValidWorkspaceId }

export type WorkspaceChatRecord = {
  readonly id: string
  readonly workspaceId: string
  readonly sessionId: string | null
  readonly title: string
  readonly createdAt: number
}

export type WorkspaceRecord = {
  readonly id: string
  readonly title: string
  readonly createdAt: number
  readonly chats: WorkspaceChatRecord[]
}

export type WorkspaceListItem = {
  readonly id: string
  readonly title: string
  readonly createdAt: number
  readonly chatCount: number
}

type WorkspaceChatMeta = {
  id: string
  sessionId: string | null
  title: string
  createdAt: number
}

type RfpMetadata = {
  workspaceChats?: WorkspaceChatMeta[]
  [key: string]: unknown
}

function chatId() {
  return `chat_${randomUUID().replaceAll("-", "").slice(0, 16)}`
}

function sessionIdFromAgentSession(
  agentSession: Record<string, unknown> | null | undefined
): string | null {
  if (!agentSession) return null
  const value = agentSession.eveSessionId
  return typeof value === "string" ? value : null
}

function chatsFromRows(
  workspaceId: string,
  rows: Array<{
    id: string
    title: string
    createdAt: Date | null
    agentSession: Record<string, unknown> | null
  }>
): WorkspaceChatRecord[] {
  return rows.map((row) => ({
    id: row.id,
    workspaceId,
    sessionId: sessionIdFromAgentSession(row.agentSession),
    title: row.title,
    createdAt: row.createdAt?.getTime() ?? Date.now(),
  }))
}

/** Legacy metadata fallback while migrating off dual chat storage. */
function chatsFromMetadata(
  workspaceId: string,
  metadata: RfpMetadata | null | undefined
): WorkspaceChatRecord[] {
  return (metadata?.workspaceChats ?? []).map((c) => ({
    id: c.id,
    workspaceId,
    sessionId: c.sessionId,
    title: c.title,
    createdAt: c.createdAt,
  }))
}

/**
 * Persist chats in `rfp_chats` only (source of truth).
 * Clears legacy `metadata.workspaceChats` after write.
 */
async function writeChats(
  workspaceId: string,
  chats: WorkspaceChatRecord[]
): Promise<void> {
  const row = await db.query.rfps.findFirst({
    where: eq(rfps.id, workspaceId),
    with: { chats: true },
  })
  if (!row) throw new DomainError("Workspace not found", "NOT_FOUND")

  const existingIds = new Set(row.chats.map((c) => c.id))
  const nextIds = new Set(chats.map((c) => c.id))

  for (const chat of chats) {
    await db
      .insert(rfpChats)
      .values({
        id: chat.id,
        rfpId: workspaceId,
        organizationId: row.organizationId,
        title: chat.title,
        agentSession: chat.sessionId ? { eveSessionId: chat.sessionId } : null,
      })
      .onConflictDoUpdate({
        target: rfpChats.id,
        set: {
          title: chat.title,
          agentSession: chat.sessionId
            ? { eveSessionId: chat.sessionId }
            : null,
          updatedAt: new Date(),
        },
      })
  }

  for (const id of existingIds) {
    if (!nextIds.has(id)) {
      await db.delete(rfpChats).where(eq(rfpChats.id, id))
    }
  }

  const meta = { ...(row.metadata as RfpMetadata | null) }
  if (meta.workspaceChats) {
    delete meta.workspaceChats
    await db
      .update(rfps)
      .set({ metadata: meta, updatedAt: new Date() })
      .where(eq(rfps.id, workspaceId))
  }
}

export async function listWorkspaces(
  organizationId: string
): Promise<WorkspaceListItem[]> {
  const rows = await db
    .select()
    .from(rfps)
    .where(eq(rfps.organizationId, organizationId))
    .orderBy(desc(rfps.updatedAt))

  const chatCounts = await db
    .select({
      rfpId: rfpChats.rfpId,
      // drizzle count would need sql`count(*)` — approximate via group later
      id: rfpChats.id,
    })
    .from(rfpChats)
    .where(eq(rfpChats.organizationId, organizationId))

  const countByRfp = new Map<string, number>()
  for (const chat of chatCounts) {
    countByRfp.set(chat.rfpId, (countByRfp.get(chat.rfpId) ?? 0) + 1)
  }

  return rows.map((row) => {
    const fromMeta = chatsFromMetadata(row.id, row.metadata as RfpMetadata)
    const chatCount = Math.max(countByRfp.get(row.id) ?? 0, fromMeta.length, 1)
    return {
      id: row.id,
      title: row.name,
      createdAt: row.createdAt.getTime(),
      chatCount,
    }
  })
}

export async function pruneMissingWorkspaceFolders(
  organizationId: string
): Promise<number> {
  const rows = await db
    .select({ id: rfps.id })
    .from(rfps)
    .where(eq(rfps.organizationId, organizationId))
  let pruned = 0
  for (const row of rows) {
    const folder = path.join(WORKSPACES_ROOT, row.id)
    try {
      await access(folder, fsConstants.F_OK)
    } catch {
      // Keep Postgres RFP rows; only FS is optional for mock/agent workspaces.
      pruned += 1
    }
  }
  return pruned
}

export async function deleteWorkspace(
  organizationId: string,
  workspaceId: string
): Promise<void> {
  await assertOrgOwnsWorkspace(organizationId, workspaceId)
  await db
    .delete(rfps)
    .where(
      and(eq(rfps.id, workspaceId), eq(rfps.organizationId, organizationId))
    )
  try {
    await rm(workspaceRoot(workspaceId), { recursive: true, force: true })
  } catch {
    // folder may already be gone
  }
}

export async function adoptOrphanSessionFolders(): Promise<number> {
  // Legacy sqlite/session mirrors — no longer adopted into Postgres RFPs.
  try {
    await readdir(WORKSPACES_ROOT)
  } catch {
    return 0
  }
  return 0
}

export async function createWorkspace(
  organizationId: string,
  ownerUserId: string,
  title = "Workspace"
): Promise<WorkspaceRecord> {
  const id = `ws_${randomUUID().replaceAll("-", "").slice(0, 20)}`
  const createdAt = new Date()
  const primaryChat: WorkspaceChatRecord = {
    id: chatId(),
    workspaceId: id,
    sessionId: null,
    title: "Chat 1",
    createdAt: createdAt.getTime(),
  }

  await db.insert(rfps).values({
    id,
    organizationId,
    name: title,
    status: "queued",
    ownerUserId,
    metadata: {},
  })

  await db.insert(rfpChats).values({
    id: primaryChat.id,
    rfpId: id,
    organizationId,
    title: primaryChat.title,
  })

  await ensureWorkspace(id)
  return (await getWorkspace(id, organizationId))!
}

/**
 * Ensure a mock/product RFP has a Postgres row + FS workspace + chat metadata.
 * Idempotent — safe to call when opening the Agent tab.
 */
export async function ensureRfpWorkspace(input: {
  organizationId: string
  ownerUserId: string
  rfp: {
    id: string
    name: string
    customer?: string | null
    status?:
      "queued" | "running" | "needs_review" | "done" | "failed" | "cancelled"
  }
}): Promise<WorkspaceRecord> {
  const { organizationId, ownerUserId, rfp } = input
  if (!isValidWorkspaceId(rfp.id)) {
    throw new Error("Invalid RFP / workspace id")
  }

  const existing = await db.query.rfps.findFirst({
    where: and(eq(rfps.id, rfp.id), eq(rfps.organizationId, organizationId)),
  })

  if (!existing) {
    const primaryChatId = chatId()
    await db.insert(rfps).values({
      id: rfp.id,
      organizationId,
      name: rfp.name,
      customer: rfp.customer ?? null,
      status: rfp.status ?? "queued",
      ownerUserId,
      metadata: {},
    })
    await db.insert(rfpChats).values({
      id: primaryChatId,
      rfpId: rfp.id,
      organizationId,
      title: "Fill agent",
    })
  }

  await ensureWorkspace(rfp.id)
  // Durable Blob → ephemeral host FS (needed on Vercel /tmp cold starts).
  await hydrateWorkspaceFromSourceFiles(rfp.id)
  return (await getWorkspace(rfp.id, organizationId))!
}

export async function getWorkspace(
  workspaceId: string,
  organizationId: string
): Promise<WorkspaceRecord | null> {
  if (!isValidWorkspaceId(workspaceId)) return null
  const row = await db.query.rfps.findFirst({
    where: and(
      eq(rfps.id, workspaceId),
      eq(rfps.organizationId, organizationId)
    ),
    with: { chats: true },
  })
  if (!row) return null

  let chats = chatsFromRows(row.id, row.chats)
  if (chats.length === 0) {
    const legacy = chatsFromMetadata(row.id, row.metadata as RfpMetadata)
    if (legacy.length > 0) {
      await writeChats(row.id, legacy)
      chats = legacy
    }
  }

  if (chats.length === 0) {
    const created: WorkspaceChatRecord = {
      id: chatId(),
      workspaceId: row.id,
      sessionId: null,
      title: "Fill agent",
      createdAt: Date.now(),
    }
    await writeChats(row.id, [created])
    return {
      id: row.id,
      title: row.name,
      createdAt: row.createdAt.getTime(),
      chats: [created],
    }
  }

  return {
    id: row.id,
    title: row.name,
    createdAt: row.createdAt.getTime(),
    chats,
  }
}

export async function addWorkspaceChat(
  organizationId: string,
  workspaceId: string,
  title?: string
): Promise<WorkspaceChatRecord> {
  const workspace = await getWorkspace(workspaceId, organizationId)
  if (!workspace) throw new DomainError("Workspace not found", "NOT_FOUND")

  const record: WorkspaceChatRecord = {
    id: chatId(),
    workspaceId,
    sessionId: null,
    title: title ?? `Chat ${workspace.chats.length + 1}`,
    createdAt: Date.now(),
  }
  await writeChats(workspaceId, [...workspace.chats, record])
  return record
}

export async function bindChatSession(
  organizationId: string,
  workspaceId: string,
  chatIdValue: string,
  sessionId: string
): Promise<WorkspaceChatRecord> {
  if (!isValidSessionId(sessionId)) {
    throw new DomainError("Invalid session id", "VALIDATION")
  }
  const workspace = await getWorkspace(workspaceId, organizationId)
  if (!workspace) throw new DomainError("Workspace not found", "NOT_FOUND")

  const chats = workspace.chats.map((chat) => {
    if (chat.sessionId === sessionId && chat.id !== chatIdValue) {
      return { ...chat, sessionId: null }
    }
    if (chat.id === chatIdValue) {
      return { ...chat, sessionId }
    }
    return chat
  })

  const bound = chats.find((c) => c.id === chatIdValue)
  if (!bound) throw new DomainError("Chat not found", "NOT_FOUND")

  await writeChats(workspaceId, chats)
  return bound
}

/**
 * Re-seed `source/` files from durable Blob URLs when the host workspace
 * mirror is empty (common on Vercel `/tmp` after cold starts).
 */
export async function hydrateWorkspaceFromSourceFiles(
  workspaceId: string
): Promise<number> {
  if (!isValidWorkspaceId(workspaceId)) return 0

  const sources = await db
    .select({
      fileName: rfpSourceFiles.fileName,
      fileUrl: rfpSourceFiles.fileUrl,
      mimeType: rfpSourceFiles.mimeType,
    })
    .from(rfpSourceFiles)
    .where(eq(rfpSourceFiles.rfpId, workspaceId))

  if (sources.length === 0) return 0

  await ensureWorkspace(workspaceId)
  let written = 0

  for (const source of sources) {
    const safeName =
      sanitizeFileName(source.fileName) ||
      `workbook${extensionForMime(source.mimeType, source.fileName)}`
    const relativePath = `source/${safeName}`

    if (await workspaceFileExists(workspaceId, relativePath)) continue

    try {
      const response = await fetch(source.fileUrl)
      if (!response.ok) {
        console.warn(
          "[workspace] failed to hydrate source file",
          workspaceId,
          relativePath,
          response.status
        )
        continue
      }
      const buffer = Buffer.from(await response.arrayBuffer())
      if (buffer.byteLength === 0) continue
      await writeWorkspaceFile(workspaceId, relativePath, buffer)
      written += 1
    } catch (error) {
      console.warn(
        "[workspace] hydrate source file error",
        workspaceId,
        relativePath,
        error
      )
    }
  }

  return written
}

export async function reconcileWorkspaceFiles(
  organizationId: string,
  workspaceId: string
): Promise<number> {
  const workspace = await getWorkspace(workspaceId, organizationId)
  if (!workspace) return 0
  await ensureWorkspace(workspaceId)
  let copied = await hydrateWorkspaceFromSourceFiles(workspaceId)
  for (const chat of workspace.chats) {
    if (!chat.sessionId) continue
    copied += await mergeWorkspaceFiles(chat.sessionId, workspaceId)
  }
  return copied
}

export async function renameWorkspaceChat(
  organizationId: string,
  workspaceId: string,
  chatIdValue: string,
  title: string
): Promise<void> {
  const workspace = await getWorkspace(workspaceId, organizationId)
  if (!workspace) throw new DomainError("Workspace not found", "NOT_FOUND")
  const chats = workspace.chats.map((chat) =>
    chat.id === chatIdValue ? { ...chat, title: title.trim() || "Chat" } : chat
  )
  await writeChats(workspaceId, chats)
}

export async function deleteWorkspaceChat(
  organizationId: string,
  workspaceId: string,
  chatIdValue: string
): Promise<boolean> {
  const workspace = await getWorkspace(workspaceId, organizationId)
  if (!workspace) return false
  if (workspace.chats.length <= 1) {
    throw new DomainError("Keep at least one chat", "VALIDATION")
  }
  const chats = workspace.chats.filter((chat) => chat.id !== chatIdValue)
  await writeChats(workspaceId, chats)
  return true
}

/**
 * Resolve eve session → workspace via indexed `rfp_chats.agent_session`,
 * falling back to legacy `metadata.workspaceChats` JSON (no full-table JS scan).
 */
export async function resolveWorkspaceIdForSession(
  sessionId: string,
  organizationId?: string
): Promise<string | null> {
  if (!isValidSessionId(sessionId)) return null

  const chatWhere = organizationId
    ? and(
        sql`${rfpChats.agentSession}->>'eveSessionId' = ${sessionId}`,
        eq(rfpChats.organizationId, organizationId)
      )
    : sql`${rfpChats.agentSession}->>'eveSessionId' = ${sessionId}`

  const fromChat = await db
    .select({ rfpId: rfpChats.rfpId })
    .from(rfpChats)
    .where(chatWhere)
    .limit(1)
    .then((rows) => rows[0] ?? null)
  if (fromChat) return fromChat.rfpId

  const metaWhere = organizationId
    ? and(
        sql`EXISTS (
          SELECT 1
          FROM jsonb_array_elements(
            COALESCE(${rfps.metadata}->'workspaceChats', '[]'::jsonb)
          ) AS chat
          WHERE chat->>'sessionId' = ${sessionId}
        )`,
        eq(rfps.organizationId, organizationId)
      )
    : sql`EXISTS (
        SELECT 1
        FROM jsonb_array_elements(
          COALESCE(${rfps.metadata}->'workspaceChats', '[]'::jsonb)
        ) AS chat
        WHERE chat->>'sessionId' = ${sessionId}
      )`

  const fromMeta = await db
    .select({ id: rfps.id })
    .from(rfps)
    .where(metaWhere)
    .limit(1)
    .then((rows) => rows[0] ?? null)

  return fromMeta?.id ?? null
}

export async function workspaceIdForSync(sessionId: string): Promise<string> {
  const mapped = await resolveWorkspaceIdForSession(sessionId)
  if (mapped) return mapped
  console.warn(
    "[workspace-sync] no workspace mapping for session; binding may be late",
    sessionId
  )
  return sessionId
}

export async function findWorkspaceIdByChatOrSession(
  id: string,
  organizationId: string
): Promise<string | null> {
  const byWorkspace = await getWorkspace(id, organizationId)
  if (byWorkspace) return byWorkspace.id
  return resolveWorkspaceIdForSession(id, organizationId)
}

/** Re-export for callers that imported WORKSPACES_ROOT via registry historically. */
export { WORKSPACES_ROOT }

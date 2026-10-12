import { randomUUID } from "node:crypto";
import { and, eq, desc } from "drizzle-orm";
import { access, readdir, rm } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { rfpChats, rfps } from "@/lib/db/schema";
import {
  ensureWorkspace,
  isValidSessionId,
  mergeWorkspaceFiles,
  WORKSPACES_ROOT,
  workspaceRoot,
} from "@/lib/workspace-fs";

export type WorkspaceChatRecord = {
  readonly id: string;
  readonly workspaceId: string;
  readonly sessionId: string | null;
  readonly title: string;
  readonly createdAt: number;
};

export type WorkspaceRecord = {
  readonly id: string;
  readonly title: string;
  readonly createdAt: number;
  readonly chats: WorkspaceChatRecord[];
};

export type WorkspaceListItem = {
  readonly id: string;
  readonly title: string;
  readonly createdAt: number;
  readonly chatCount: number;
};

type WorkspaceChatMeta = {
  id: string;
  sessionId: string | null;
  title: string;
  createdAt: number;
};

type RfpMetadata = {
  workspaceChats?: WorkspaceChatMeta[];
  [key: string]: unknown;
};

export function isValidWorkspaceId(id: string): boolean {
  return isValidSessionId(id);
}

function chatId() {
  return `chat_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

function readChats(
  workspaceId: string,
  metadata: RfpMetadata | null | undefined,
  primary?: { id: string; title: string; createdAt: Date | null } | null,
): WorkspaceChatRecord[] {
  const fromMeta = metadata?.workspaceChats ?? [];
  if (fromMeta.length > 0) {
    return fromMeta.map((c) => ({
      id: c.id,
      workspaceId,
      sessionId: c.sessionId,
      title: c.title,
      createdAt: c.createdAt,
    }));
  }
  if (primary) {
    return [
      {
        id: primary.id,
        workspaceId,
        sessionId: null,
        title: primary.title,
        createdAt: primary.createdAt?.getTime() ?? Date.now(),
      },
    ];
  }
  return [];
}

async function writeChats(
  workspaceId: string,
  chats: WorkspaceChatRecord[],
): Promise<void> {
  const row = await db.query.rfps.findFirst({
    where: eq(rfps.id, workspaceId),
    with: { chat: true },
  });
  if (!row) throw new Error("Workspace not found");

  // Keep rfp_chats.id stable (1:1 with rfp); remap first chat id if needed.
  const stablePrimaryId = row.chat?.id ?? chats[0]?.id;
  const normalized = chats.map((c, index) =>
    index === 0 && stablePrimaryId
      ? { ...c, id: stablePrimaryId }
      : c,
  );

  const meta = { ...(row.metadata as RfpMetadata | null) };
  meta.workspaceChats = normalized.map((c) => ({
    id: c.id,
    sessionId: c.sessionId,
    title: c.title,
    createdAt: c.createdAt,
  }));

  await db
    .update(rfps)
    .set({ metadata: meta, updatedAt: new Date() })
    .where(eq(rfps.id, workspaceId));

  const primary = normalized[0];
  if (primary) {
    await db
      .insert(rfpChats)
      .values({
        id: primary.id,
        rfpId: workspaceId,
        organizationId: row.organizationId,
        title: primary.title,
        agentSession: primary.sessionId
          ? { eveSessionId: primary.sessionId }
          : null,
      })
      .onConflictDoUpdate({
        target: rfpChats.rfpId,
        set: {
          title: primary.title,
          agentSession: primary.sessionId
            ? { eveSessionId: primary.sessionId }
            : null,
          updatedAt: new Date(),
        },
      });
  }
}

export async function listWorkspaces(
  organizationId: string,
): Promise<WorkspaceListItem[]> {
  const rows = await db
    .select()
    .from(rfps)
    .where(eq(rfps.organizationId, organizationId))
    .orderBy(desc(rfps.updatedAt));

  return rows.map((row) => {
    const chats = readChats(row.id, row.metadata as RfpMetadata);
    return {
      id: row.id,
      title: row.name,
      createdAt: row.createdAt.getTime(),
      chatCount: Math.max(chats.length, 1),
    };
  });
}

export async function pruneMissingWorkspaceFolders(
  organizationId: string,
): Promise<number> {
  const rows = await db
    .select({ id: rfps.id })
    .from(rfps)
    .where(eq(rfps.organizationId, organizationId));
  let pruned = 0;
  for (const row of rows) {
    const folder = path.join(WORKSPACES_ROOT, row.id);
    try {
      await access(folder, fsConstants.F_OK);
    } catch {
      // Keep Postgres RFP rows; only FS is optional for mock/agent workspaces.
      pruned += 1;
    }
  }
  return pruned;
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  if (!(await getWorkspace(workspaceId))) {
    throw new Error("Workspace not found");
  }
  await db.delete(rfps).where(eq(rfps.id, workspaceId));
  try {
    await rm(workspaceRoot(workspaceId), { recursive: true, force: true });
  } catch {
    // folder may already be gone
  }
}

export async function adoptOrphanSessionFolders(): Promise<number> {
  // Legacy sqlite/session mirrors — no longer adopted into Postgres RFPs.
  try {
    await readdir(WORKSPACES_ROOT);
  } catch {
    return 0;
  }
  return 0;
}

export async function createWorkspace(
  organizationId: string,
  ownerUserId: string,
  title = "Workspace",
): Promise<WorkspaceRecord> {
  const id = `ws_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
  const createdAt = new Date();
  const primaryChat: WorkspaceChatRecord = {
    id: chatId(),
    workspaceId: id,
    sessionId: null,
    title: "Chat 1",
    createdAt: createdAt.getTime(),
  };

  await db.insert(rfps).values({
    id,
    organizationId,
    name: title,
    status: "queued",
    ownerUserId,
    metadata: {
      workspaceChats: [
        {
          id: primaryChat.id,
          sessionId: null,
          title: primaryChat.title,
          createdAt: primaryChat.createdAt,
        },
      ],
    },
  });

  await db.insert(rfpChats).values({
    id: primaryChat.id,
    rfpId: id,
    organizationId,
    title: primaryChat.title,
  });

  await ensureWorkspace(id);
  return (await getWorkspace(id))!;
}

/**
 * Ensure a mock/product RFP has a Postgres row + FS workspace + chat metadata.
 * Idempotent — safe to call when opening the Agent tab.
 */
export async function ensureRfpWorkspace(input: {
  organizationId: string;
  ownerUserId: string;
  rfp: {
    id: string;
    name: string;
    customer?: string | null;
    status?: "queued" | "running" | "needs_review" | "done" | "failed" | "cancelled";
  };
}): Promise<WorkspaceRecord> {
  const { organizationId, ownerUserId, rfp } = input;
  if (!isValidWorkspaceId(rfp.id)) {
    throw new Error("Invalid RFP / workspace id");
  }

  const existing = await db.query.rfps.findFirst({
    where: and(eq(rfps.id, rfp.id), eq(rfps.organizationId, organizationId)),
  });

  if (!existing) {
    const primaryChatId = chatId();
    const createdAt = Date.now();
    await db.insert(rfps).values({
      id: rfp.id,
      organizationId,
      name: rfp.name,
      customer: rfp.customer ?? null,
      status: rfp.status ?? "queued",
      ownerUserId,
      metadata: {
        workspaceChats: [
          {
            id: primaryChatId,
            sessionId: null,
            title: "Fill agent",
            createdAt,
          },
        ],
      },
    });
    await db.insert(rfpChats).values({
      id: primaryChatId,
      rfpId: rfp.id,
      organizationId,
      title: "Fill agent",
    });
  }

  await ensureWorkspace(rfp.id);
  return (await getWorkspace(rfp.id))!;
}

export async function getWorkspace(
  workspaceId: string,
): Promise<WorkspaceRecord | null> {
  if (!isValidWorkspaceId(workspaceId)) return null;
  const row = await db.query.rfps.findFirst({
    where: eq(rfps.id, workspaceId),
    with: { chat: true },
  });
  if (!row) return null;

  const chats = readChats(
    row.id,
    row.metadata as RfpMetadata,
    row.chat
      ? {
          id: row.chat.id,
          title: row.chat.title,
          createdAt: row.chat.createdAt,
        }
      : null,
  );

  if (chats.length === 0) {
    const created: WorkspaceChatRecord = {
      id: row.chat?.id ?? chatId(),
      workspaceId: row.id,
      sessionId: null,
      title: "Fill agent",
      createdAt: Date.now(),
    };
    await writeChats(row.id, [created]);
    return {
      id: row.id,
      title: row.name,
      createdAt: row.createdAt.getTime(),
      chats: [created],
    };
  }

  return {
    id: row.id,
    title: row.name,
    createdAt: row.createdAt.getTime(),
    chats,
  };
}

export async function addWorkspaceChat(
  workspaceId: string,
  title?: string,
): Promise<WorkspaceChatRecord> {
  const workspace = await getWorkspace(workspaceId);
  if (!workspace) throw new Error("Workspace not found");

  const record: WorkspaceChatRecord = {
    id: chatId(),
    workspaceId,
    sessionId: null,
    title: title ?? `Chat ${workspace.chats.length + 1}`,
    createdAt: Date.now(),
  };
  await writeChats(workspaceId, [...workspace.chats, record]);
  return record;
}

export async function bindChatSession(
  workspaceId: string,
  chatIdValue: string,
  sessionId: string,
): Promise<WorkspaceChatRecord> {
  if (!isValidSessionId(sessionId)) throw new Error("Invalid session id");
  const workspace = await getWorkspace(workspaceId);
  if (!workspace) throw new Error("Workspace not found");

  const chats = workspace.chats.map((chat) => {
    if (chat.sessionId === sessionId && chat.id !== chatIdValue) {
      return { ...chat, sessionId: null };
    }
    if (chat.id === chatIdValue) {
      return { ...chat, sessionId };
    }
    return chat;
  });

  const bound = chats.find((c) => c.id === chatIdValue);
  if (!bound) throw new Error("Chat not found");

  await writeChats(workspaceId, chats);
  return bound;
}

export async function reconcileWorkspaceFiles(
  workspaceId: string,
): Promise<number> {
  const workspace = await getWorkspace(workspaceId);
  if (!workspace) return 0;
  await ensureWorkspace(workspaceId);
  let copied = 0;
  for (const chat of workspace.chats) {
    if (!chat.sessionId) continue;
    copied += await mergeWorkspaceFiles(chat.sessionId, workspaceId);
  }
  return copied;
}

export async function renameWorkspaceChat(
  workspaceId: string,
  chatIdValue: string,
  title: string,
): Promise<void> {
  const workspace = await getWorkspace(workspaceId);
  if (!workspace) throw new Error("Workspace not found");
  const chats = workspace.chats.map((chat) =>
    chat.id === chatIdValue
      ? { ...chat, title: title.trim() || "Chat" }
      : chat,
  );
  await writeChats(workspaceId, chats);
}

export async function deleteWorkspaceChat(
  workspaceId: string,
  chatIdValue: string,
): Promise<boolean> {
  const workspace = await getWorkspace(workspaceId);
  if (!workspace) return false;
  if (workspace.chats.length <= 1) {
    throw new Error("Keep at least one chat");
  }
  const chats = workspace.chats.filter((chat) => chat.id !== chatIdValue);
  await writeChats(workspaceId, chats);
  return true;
}

export async function resolveWorkspaceIdForSession(
  sessionId: string,
): Promise<string | null> {
  const rows = await db.select().from(rfps);
  for (const row of rows) {
    const chats = readChats(row.id, row.metadata as RfpMetadata);
    if (chats.some((c) => c.sessionId === sessionId)) {
      return row.id;
    }
  }
  return null;
}

export async function workspaceIdForSync(sessionId: string): Promise<string> {
  const mapped = await resolveWorkspaceIdForSession(sessionId);
  if (mapped) return mapped;
  console.warn(
    "[workspace-sync] no workspace mapping for session; binding may be late",
    sessionId,
  );
  return sessionId;
}

export async function findWorkspaceIdByChatOrSession(
  id: string,
): Promise<string | null> {
  const byWorkspace = await getWorkspace(id);
  if (byWorkspace) return byWorkspace.id;
  return resolveWorkspaceIdForSession(id);
}

/** Re-export for callers that imported WORKSPACES_ROOT via registry historically. */
export { WORKSPACES_ROOT };

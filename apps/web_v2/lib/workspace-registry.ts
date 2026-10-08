import { randomUUID } from "node:crypto";
import { sqlite } from "@/lib/db";
import {
  collectSyncFiles,
  ensureWorkspace,
  isValidSessionId,
  mergeWorkspaceFiles,
  WORKSPACES_ROOT,
  workspaceRoot,
} from "@/lib/workspace-fs";
import { access, readdir, rm } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";

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

sqlite.pragma("foreign_keys = ON");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'Workspace',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS workspace_chats (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    session_id TEXT UNIQUE,
    title TEXT NOT NULL DEFAULT 'Chat',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_workspace_chats_workspace
    ON workspace_chats(workspace_id);
`);

export function isValidWorkspaceId(id: string): boolean {
  return isValidSessionId(id);
}

export type WorkspaceListItem = {
  readonly id: string;
  readonly title: string;
  readonly createdAt: number;
  readonly chatCount: number;
};

export function listWorkspaces(): WorkspaceListItem[] {
  return sqlite
    .prepare(
      `SELECT
         w.id AS id,
         w.title AS title,
         w.created_at AS createdAt,
         COUNT(c.id) AS chatCount
       FROM workspaces w
       LEFT JOIN workspace_chats c ON c.workspace_id = w.id
       GROUP BY w.id
       ORDER BY w.created_at DESC`,
    )
    .all() as WorkspaceListItem[];
}

function deleteWorkspaceRow(workspaceId: string): void {
  const tx = sqlite.transaction(() => {
    sqlite.prepare(`DELETE FROM workspace_chats WHERE workspace_id = ?`).run(workspaceId);
    sqlite.prepare(`DELETE FROM workspaces WHERE id = ?`).run(workspaceId);
  });
  tx();
}

/** Drop DB rows whose `data/workspaces/<id>` folder was removed by hand. */
export async function pruneMissingWorkspaceFolders(): Promise<number> {
  const rows = sqlite.prepare(`SELECT id FROM workspaces`).all() as Array<{ id: string }>;
  let pruned = 0;
  for (const row of rows) {
    const folder = path.join(WORKSPACES_ROOT, row.id);
    try {
      await access(folder, fsConstants.F_OK);
    } catch {
      deleteWorkspaceRow(row.id);
      pruned += 1;
    }
  }
  return pruned;
}

/** Delete workspace metadata and its files folder. */
export async function deleteWorkspace(workspaceId: string): Promise<void> {
  if (!getWorkspace(workspaceId)) {
    throw new Error("Workspace not found");
  }
  deleteWorkspaceRow(workspaceId);
  try {
    await rm(workspaceRoot(workspaceId), { recursive: true, force: true });
  } catch {
    // folder may already be gone
  }
}

/**
 * Promote leftover `wrun_*` host mirrors (from before workspace ids were
 * separate from eve session ids) into real workspace rows so files reappear.
 */
export async function adoptOrphanSessionFolders(): Promise<number> {
  let adopted = 0;
  let names: string[];
  try {
    names = await readdir(WORKSPACES_ROOT);
  } catch {
    return 0;
  }

  const insertWorkspace = sqlite.prepare(
    `INSERT OR IGNORE INTO workspaces (id, title, created_at) VALUES (?, ?, ?)`,
  );
  const insertChat = sqlite.prepare(
    `INSERT OR IGNORE INTO workspace_chats (id, workspace_id, session_id, title, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  );

  for (const name of names) {
    if (!name.startsWith("wrun_") || !isValidSessionId(name)) continue;
    if (getWorkspace(name)) continue;
    if (resolveWorkspaceIdForSession(name)) {
      // Already a chat session under another workspace — merge files there.
      const workspaceId = resolveWorkspaceIdForSession(name)!;
      await mergeWorkspaceFiles(name, workspaceId);
      continue;
    }

    const files = await collectSyncFiles(name);
    if (files.length === 0) continue;

    const createdAt = Date.now();
    const chatId = `chat_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
    const tx = sqlite.transaction(() => {
      insertWorkspace.run(name, "Recovered workspace", createdAt);
      insertChat.run(chatId, name, name, "Chat 1", createdAt);
    });
    tx();
    adopted += 1;
  }

  return adopted;
}

export function createWorkspace(title = "Workspace"): WorkspaceRecord {
  const id = `ws_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
  const createdAt = Date.now();
  const insertWorkspace = sqlite.prepare(
    `INSERT INTO workspaces (id, title, created_at) VALUES (?, ?, ?)`,
  );
  const insertChat = sqlite.prepare(
    `INSERT INTO workspace_chats (id, workspace_id, session_id, title, created_at)
     VALUES (?, ?, NULL, ?, ?)`,
  );

  const chatId = `chat_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
  const tx = sqlite.transaction(() => {
    insertWorkspace.run(id, title, createdAt);
    insertChat.run(chatId, id, "Chat 1", createdAt);
  });
  tx();
  void ensureWorkspace(id);

  return getWorkspace(id)!;
}

export function getWorkspace(workspaceId: string): WorkspaceRecord | null {
  if (!isValidWorkspaceId(workspaceId)) return null;
  const workspace = sqlite
    .prepare(`SELECT id, title, created_at AS createdAt FROM workspaces WHERE id = ?`)
    .get(workspaceId) as { id: string; title: string; createdAt: number } | undefined;
  if (!workspace) return null;

  const chats = sqlite
    .prepare(
      `SELECT id, workspace_id AS workspaceId, session_id AS sessionId, title, created_at AS createdAt
       FROM workspace_chats
       WHERE workspace_id = ?
       ORDER BY created_at ASC`,
    )
    .all(workspaceId) as Array<{
    id: string;
    workspaceId: string;
    sessionId: string | null;
    title: string;
    createdAt: number;
  }>;

  return { ...workspace, chats };
}

export function addWorkspaceChat(workspaceId: string, title?: string): WorkspaceChatRecord {
  const workspace = getWorkspace(workspaceId);
  if (!workspace) throw new Error("Workspace not found");

  const id = `chat_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
  const createdAt = Date.now();
  const nextTitle = title ?? `Chat ${workspace.chats.length + 1}`;
  sqlite
    .prepare(
      `INSERT INTO workspace_chats (id, workspace_id, session_id, title, created_at)
       VALUES (?, ?, NULL, ?, ?)`,
    )
    .run(id, workspaceId, nextTitle, createdAt);

  return {
    id,
    workspaceId,
    sessionId: null,
    title: nextTitle,
    createdAt,
  };
}

export function bindChatSession(
  workspaceId: string,
  chatId: string,
  sessionId: string,
): WorkspaceChatRecord {
  if (!isValidSessionId(sessionId)) throw new Error("Invalid session id");
  const existing = sqlite
    .prepare(`SELECT id FROM workspace_chats WHERE id = ? AND workspace_id = ?`)
    .get(chatId, workspaceId);
  if (!existing) throw new Error("Chat not found");

  // One session can only belong to one chat.
  sqlite.prepare(`UPDATE workspace_chats SET session_id = NULL WHERE session_id = ?`).run(sessionId);
  sqlite
    .prepare(`UPDATE workspace_chats SET session_id = ? WHERE id = ? AND workspace_id = ?`)
    .run(sessionId, chatId, workspaceId);

  const row = sqlite
    .prepare(
      `SELECT id, workspace_id AS workspaceId, session_id AS sessionId, title, created_at AS createdAt
       FROM workspace_chats WHERE id = ?`,
    )
    .get(chatId) as WorkspaceChatRecord;
  return row;
}

/** Pull any files that landed under chat session folders into the workspace folder. */
export async function reconcileWorkspaceFiles(workspaceId: string): Promise<number> {
  const workspace = getWorkspace(workspaceId);
  if (!workspace) return 0;
  await ensureWorkspace(workspaceId);
  let copied = 0;
  for (const chat of workspace.chats) {
    if (!chat.sessionId) continue;
    copied += await mergeWorkspaceFiles(chat.sessionId, workspaceId);
  }
  return copied;
}

export function renameWorkspaceChat(
  workspaceId: string,
  chatId: string,
  title: string,
): void {
  sqlite
    .prepare(`UPDATE workspace_chats SET title = ? WHERE id = ? AND workspace_id = ?`)
    .run(title.trim() || "Chat", chatId, workspaceId);
}

export function deleteWorkspaceChat(workspaceId: string, chatId: string): boolean {
  const count = sqlite
    .prepare(`SELECT COUNT(*) AS count FROM workspace_chats WHERE workspace_id = ?`)
    .get(workspaceId) as { count: number };
  if (count.count <= 1) {
    throw new Error("Keep at least one chat");
  }
  const result = sqlite
    .prepare(`DELETE FROM workspace_chats WHERE id = ? AND workspace_id = ?`)
    .run(chatId, workspaceId);
  return result.changes > 0;
}

export function resolveWorkspaceIdForSession(sessionId: string): string | null {
  const row = sqlite
    .prepare(`SELECT workspace_id AS workspaceId FROM workspace_chats WHERE session_id = ?`)
    .get(sessionId) as { workspaceId: string } | undefined;
  return row?.workspaceId ?? null;
}

/**
 * Host file mirror id for a live agent session.
 * Prefer the durable workspace id. Falling back to the session id is what caused
 * uploads/edits to disappear from the UI (stored under `wrun_*` while the
 * explorer reads `ws_*`).
 */
export function workspaceIdForSync(sessionId: string): string {
  const mapped = resolveWorkspaceIdForSession(sessionId);
  if (mapped) return mapped;
  console.warn(
    "[workspace-sync] no workspace mapping for session; binding may be late",
    sessionId,
  );
  return sessionId;
}

export function findWorkspaceIdByChatOrSession(id: string): string | null {
  const byWorkspace = getWorkspace(id);
  if (byWorkspace) return byWorkspace.id;
  return resolveWorkspaceIdForSession(id);
}

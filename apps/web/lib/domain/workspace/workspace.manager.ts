/**
 * Workspace lifecycle manager — hydrate/sync/authorize facade.
 * Persistence helpers still live in `@/lib/workspace-registry` during migration;
 * new code should call through this manager / createAppContext().workspaces.
 */
import { assertOrgOwnsWorkspace } from "@/lib/domain/workspace/workspace.authorize"
import type { VercelBlobStorage } from "@/lib/storage/vbs"
import {
  addWorkspaceChat,
  bindChatSession,
  createWorkspace,
  deleteWorkspace,
  deleteWorkspaceChat,
  ensureRfpWorkspace,
  getWorkspace,
  hydrateWorkspaceFromSourceFiles,
  listWorkspaces,
  reconcileWorkspaceFiles,
  renameWorkspaceChat,
  resolveWorkspaceIdForSession,
  type WorkspaceChatRecord,
  type WorkspaceListItem,
  type WorkspaceRecord,
} from "@/lib/workspace-registry"
import { ensureWorkspace, mergeWorkspaceFiles } from "@/lib/workspace-fs"

export class WorkspaceManager {
  constructor(private readonly _blob: VercelBlobStorage) {}

  assertOwned(organizationId: string, workspaceId: string) {
    return assertOrgOwnsWorkspace(organizationId, workspaceId)
  }

  list(organizationId: string): Promise<WorkspaceListItem[]> {
    return listWorkspaces(organizationId)
  }

  get(
    organizationId: string,
    workspaceId: string
  ): Promise<WorkspaceRecord | null> {
    return getWorkspace(workspaceId, organizationId)
  }

  create(
    organizationId: string,
    ownerUserId: string,
    title?: string
  ): Promise<WorkspaceRecord> {
    return createWorkspace(organizationId, ownerUserId, title)
  }

  delete(organizationId: string, workspaceId: string): Promise<void> {
    return deleteWorkspace(organizationId, workspaceId)
  }

  ensureRfp = ensureRfpWorkspace

  hydrate(workspaceId: string): Promise<number> {
    return hydrateWorkspaceFromSourceFiles(workspaceId)
  }

  reconcile(organizationId: string, workspaceId: string): Promise<number> {
    return reconcileWorkspaceFiles(organizationId, workspaceId)
  }

  async ensureHostMirror(workspaceId: string): Promise<void> {
    await ensureWorkspace(workspaceId)
    await hydrateWorkspaceFromSourceFiles(workspaceId)
  }

  mergeSessionFiles(sessionId: string, workspaceId: string): Promise<number> {
    return mergeWorkspaceFiles(sessionId, workspaceId)
  }

  addChat(
    organizationId: string,
    workspaceId: string,
    title?: string
  ): Promise<WorkspaceChatRecord> {
    return addWorkspaceChat(organizationId, workspaceId, title)
  }

  bindSession(
    organizationId: string,
    workspaceId: string,
    chatId: string,
    sessionId: string
  ): Promise<WorkspaceChatRecord> {
    return bindChatSession(organizationId, workspaceId, chatId, sessionId)
  }

  renameChat(
    organizationId: string,
    workspaceId: string,
    chatId: string,
    title: string
  ): Promise<void> {
    return renameWorkspaceChat(organizationId, workspaceId, chatId, title)
  }

  deleteChat(
    organizationId: string,
    workspaceId: string,
    chatId: string
  ): Promise<boolean> {
    return deleteWorkspaceChat(organizationId, workspaceId, chatId)
  }

  resolveBySession(
    sessionId: string,
    organizationId?: string
  ): Promise<string | null> {
    return resolveWorkspaceIdForSession(sessionId, organizationId)
  }
}

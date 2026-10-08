import { defineHook } from "eve/hooks";
import { mergeWorkspaceFiles } from "@/lib/workspace-fs";
import { workspaceIdForSync } from "@/lib/workspace-registry";
import { pullSandboxToWorkspace, pushWorkspaceToSandbox } from "@/lib/workspace-sync";

/**
 * Keep the host workspace mirror (`data/workspaces/<workspaceId>`) and the
 * session sandbox `/workspace` in sync. Multiple chats in one workspace share
 * the same host files; each chat session has its own sandbox.
 */
export default defineHook({
  events: {
    async "turn.started"(_event, ctx) {
      try {
        const sessionId = ctx.session.id;
        const workspaceId = workspaceIdForSync(sessionId);
        // If bind raced the first turn, also push any files already under the session folder.
        if (workspaceId !== sessionId) {
          await mergeWorkspaceFiles(sessionId, workspaceId);
        }
        const sandbox = await ctx.getSandbox();
        const count = await pushWorkspaceToSandbox(workspaceId, sandbox);
        if (count > 0) {
          console.info("[workspace-sync] pushed host → sandbox", {
            sessionId,
            workspaceId,
            files: count,
          });
        }
      } catch (error) {
        console.warn("[workspace-sync] push failed", error);
      }
    },

    async "turn.completed"(_event, ctx) {
      try {
        const sessionId = ctx.session.id;
        const workspaceId = workspaceIdForSync(sessionId);
        const sandbox = await ctx.getSandbox();
        const count = await pullSandboxToWorkspace(workspaceId, sandbox);
        // Always merge session-local mirror into the durable workspace folder.
        if (workspaceId !== sessionId) {
          await mergeWorkspaceFiles(sessionId, workspaceId);
        }
        console.info("[workspace-sync] pulled sandbox → host", {
          sessionId,
          workspaceId,
          files: count,
        });
      } catch (error) {
        console.warn("[workspace-sync] pull failed", error);
      }
    },
  },
});

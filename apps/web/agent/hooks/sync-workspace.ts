import { defineHook } from "eve/hooks"
import { createAppContext } from "@/lib/di/create-app-context"
import { injectShClientCli } from "@/lib/sh-client/sandbox-cli"
import { mergeWorkspaceFiles } from "@/lib/workspace-fs"
import {
  hydrateWorkspaceFromSourceFiles,
  workspaceIdForSync,
} from "@/lib/workspace-registry"
import {
  pullSandboxToWorkspace,
  pushWorkspaceToSandbox,
} from "@/lib/workspace-sync"

/**
 * Keep the host workspace mirror (`WORKSPACES_ROOT/<workspaceId>`) and the
 * session sandbox `/workspace` in sync. Multiple chats in one workspace share
 * the same host files; each chat session has its own sandbox.
 */
export default defineHook({
  events: {
    async "turn.started"(_event, ctx) {
      try {
        const sessionId = ctx.session.id
        const workspaceId = await workspaceIdForSync(sessionId)
        // Blob-backed source workbooks → host FS before sandbox push (Vercel /tmp).
        await hydrateWorkspaceFromSourceFiles(workspaceId)
        // If bind raced the first turn, also push any files already under the session folder.
        if (workspaceId !== sessionId) {
          await mergeWorkspaceFiles(sessionId, workspaceId)
        }
        const sandbox = await ctx.getSandbox()
        const count = await pushWorkspaceToSandbox(workspaceId, sandbox)
        if (count > 0) {
          console.info("[workspace-sync] pushed host → sandbox", {
            sessionId,
            workspaceId,
            files: count,
          })
        }

        // Mint fill-scoped Better Auth API key + install sh-client (once per sandbox).
        const hasShEnv = await sandbox.run({
          command:
            "if [[ -f /workspace/.eve/sh-client.env ]]; then echo __SH_ENV_OK__; else echo __SH_ENV_MISSING__; fi",
        })
        if (hasShEnv.stdout.includes("__SH_ENV_MISSING__")) {
          try {
            await injectShClientCli(sandbox, { fillId: workspaceId })
          } catch (error) {
            console.warn("[workspace-sync] sh-client inject failed", error)
          }
        }
      } catch (error) {
        console.warn("[workspace-sync] push failed", error)
      }
    },

    async "turn.completed"(_event, ctx) {
      try {
        const sessionId = ctx.session.id
        const workspaceId = await workspaceIdForSync(sessionId)
        const sandbox = await ctx.getSandbox()
        const count = await pullSandboxToWorkspace(workspaceId, sandbox)
        // Always merge session-local mirror into the durable workspace folder.
        if (workspaceId !== sessionId) {
          await mergeWorkspaceFiles(sessionId, workspaceId)
        }
        console.info("[workspace-sync] pulled sandbox → host", {
          sessionId,
          workspaceId,
          files: count,
        })

        try {
          const result =
            await createAppContext().workspaces.persistEditedSources(
              workspaceId
            )
          if (result.uploaded > 0) {
            console.info("[workspace-sync] persisted edited sources → Blob", {
              sessionId,
              workspaceId,
              ...result,
            })
          }
        } catch (persistError) {
          console.warn(
            "[workspace-sync] persist edited sources failed",
            persistError
          )
        }
      } catch (error) {
        console.warn("[workspace-sync] pull failed", error)
      }
    },
  },
})

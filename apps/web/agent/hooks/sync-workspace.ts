import { defineHook } from "eve/hooks"
import { getAccountRulesSession } from "@/lib/account-rules/workspace"
import { createAppContext } from "@/lib/di/create-app-context"
import { ensureShClientCli } from "@/lib/sh-client/sandbox-cli"
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
 *
 * Account-rules (Mira) sessions are registered separately and get an org-scoped
 * sh-client (no SH_FILL_ID) instead of the fill inject path.
 */
export default defineHook({
  events: {
    async "turn.started"(_event, ctx) {
      try {
        const sessionId = ctx.session.id
        const rules = await getAccountRulesSession(sessionId)
        if (rules) {
          const sandbox = await ctx.getSandbox()
          const count = await pushWorkspaceToSandbox(rules.workspaceId, sandbox)
          if (count > 0) {
            console.info("[workspace-sync] account-rules pushed host → sandbox", {
              sessionId,
              workspaceId: rules.workspaceId,
              files: count,
            })
          }
          try {
            await ensureShClientCli(sandbox, {
              kind: "account-rules",
              organizationId: rules.organizationId,
              userId: rules.userId,
            })
          } catch (error) {
            console.warn(
              "[workspace-sync] account-rules sh-client ensure failed",
              error
            )
          }
          return
        }

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

        // Install / refresh sh-client when missing, SH_APP_URL stale, or +x lost.
        try {
          await ensureShClientCli(sandbox, {
            kind: "fill",
            fillId: workspaceId,
          })
        } catch (error) {
          console.warn("[workspace-sync] sh-client ensure failed", error)
        }
      } catch (error) {
        console.warn("[workspace-sync] push failed", error)
      }
    },

    async "turn.completed"(_event, ctx) {
      try {
        const sessionId = ctx.session.id
        const rules = await getAccountRulesSession(sessionId)
        if (rules) {
          const sandbox = await ctx.getSandbox()
          const count = await pullSandboxToWorkspace(
            rules.workspaceId,
            sandbox
          )
          console.info("[workspace-sync] account-rules pulled sandbox → host", {
            sessionId,
            workspaceId: rules.workspaceId,
            files: count,
          })
          return
        }

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

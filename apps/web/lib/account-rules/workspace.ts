import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { accountRulesWorkspaceId } from "@/lib/account-rules/ids"
import { DomainError } from "@/lib/domain/errors"
import {
  ensureWorkspace,
  isValidSessionId,
  WORKSPACES_ROOT,
} from "@/lib/workspace-fs"

export { accountRulesWorkspaceId }

export type AccountRulesSessionBind = {
  sessionId: string
  organizationId: string
  userId: string
  workspaceId: string
  boundAt: number
}

const BINDS_DIR = path.join(
  /*turbopackIgnore: true*/ WORKSPACES_ROOT,
  "_account-rules-binds"
)

export async function ensureAccountRulesWorkspace(
  organizationId: string
): Promise<string> {
  const workspaceId = accountRulesWorkspaceId(organizationId)
  if (!isValidSessionId(workspaceId)) {
    throw new DomainError(
      "Invalid organization id for rules workspace",
      "VALIDATION"
    )
  }
  await ensureWorkspace(workspaceId)
  // Marker so humans/agents can see this is a rules sandbox, not a fill.
  await writeFile(
    path.join(
      /*turbopackIgnore: true*/ WORKSPACES_ROOT,
      workspaceId,
      "README.txt"
    ),
    "Account rules workspace (overlays + floor margins). Prefer sh-client.\n",
    "utf8"
  )
  return workspaceId
}

async function bindPath(sessionId: string): Promise<string> {
  if (!isValidSessionId(sessionId)) {
    throw new DomainError("Invalid session id", "VALIDATION")
  }
  await mkdir(/*turbopackIgnore: true*/ BINDS_DIR, { recursive: true })
  return path.join(/*turbopackIgnore: true*/ BINDS_DIR, `${sessionId}.json`)
}

export async function registerAccountRulesSession(input: {
  sessionId: string
  organizationId: string
  userId: string
}): Promise<AccountRulesSessionBind> {
  const workspaceId = await ensureAccountRulesWorkspace(input.organizationId)
  const bind: AccountRulesSessionBind = {
    sessionId: input.sessionId,
    organizationId: input.organizationId,
    userId: input.userId,
    workspaceId,
    boundAt: Date.now(),
  }
  const file = await bindPath(input.sessionId)
  await writeFile(file, `${JSON.stringify(bind, null, 2)}\n`, "utf8")
  return bind
}

export async function unregisterAccountRulesSession(
  sessionId: string
): Promise<void> {
  if (!isValidSessionId(sessionId)) return
  const file = path.join(
    /*turbopackIgnore: true*/ BINDS_DIR,
    `${sessionId}.json`
  )
  await rm(file, { force: true })
}

export async function getAccountRulesSession(
  sessionId: string
): Promise<AccountRulesSessionBind | null> {
  if (!isValidSessionId(sessionId)) return null
  const file = path.join(
    /*turbopackIgnore: true*/ BINDS_DIR,
    `${sessionId}.json`
  )
  try {
    const raw = await readFile(file, "utf8")
    const parsed = JSON.parse(raw) as Partial<AccountRulesSessionBind>
    if (
      typeof parsed.sessionId !== "string" ||
      typeof parsed.organizationId !== "string" ||
      typeof parsed.userId !== "string" ||
      typeof parsed.workspaceId !== "string"
    ) {
      return null
    }
    return {
      sessionId: parsed.sessionId,
      organizationId: parsed.organizationId,
      userId: parsed.userId,
      workspaceId: parsed.workspaceId,
      boundAt: typeof parsed.boundAt === "number" ? parsed.boundAt : Date.now(),
    }
  } catch {
    return null
  }
}

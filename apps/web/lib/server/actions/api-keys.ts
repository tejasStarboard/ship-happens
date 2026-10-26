"use server"

import { and, desc, eq, sql } from "drizzle-orm"
import { apikey } from "@workspace/db"
import {
  createFillAgentApiKey,
  SH_AGENT_API_KEY_CONFIG_ID,
} from "@/lib/auth/sh-api-key"
import { requireOrgAdminSession } from "@/lib/auth/session"
import { createAppContext } from "@/lib/di/create-app-context"
import { DomainError } from "@/lib/domain/errors"
import {
  domainErrorMessage,
  domainErrorStatus,
} from "@ship-happens/fill/browser"

export type ApiKeyListItem = {
  id: string
  name: string | null
  start: string | null
  prefix: string | null
  enabled: boolean | null
  fillId: string | null
  ownerUserId: string
  expiresAt: string | null
  createdAt: string
  lastRequest: string | null
}

function parseMetadata(raw: string | null): {
  organizationId?: string
  fillId?: string
} {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      organizationId:
        typeof parsed.organizationId === "string"
          ? parsed.organizationId
          : undefined,
      fillId: typeof parsed.fillId === "string" ? parsed.fillId : undefined,
    }
  } catch {
    return {}
  }
}

function actionError(error: unknown): { ok: false; error: string } {
  const status = domainErrorStatus(error)
  return {
    ok: false,
    error:
      status === 500
        ? "Request failed"
        : domainErrorMessage(error, "Request failed"),
  }
}

export async function listShAgentApiKeys(): Promise<
  { ok: true; keys: ApiKeyListItem[] } | { ok: false; error: string }
> {
  try {
    const { organizationId } = await requireOrgAdminSession()
    const { db } = createAppContext()

    const rows = await db
      .select({
        id: apikey.id,
        name: apikey.name,
        start: apikey.start,
        prefix: apikey.prefix,
        enabled: apikey.enabled,
        referenceId: apikey.referenceId,
        metadata: apikey.metadata,
        expiresAt: apikey.expiresAt,
        createdAt: apikey.createdAt,
        lastRequest: apikey.lastRequest,
      })
      .from(apikey)
      .where(
        and(
          eq(apikey.configId, SH_AGENT_API_KEY_CONFIG_ID),
          sql`${apikey.metadata}::jsonb ->> 'organizationId' = ${organizationId}`
        )
      )
      .orderBy(desc(apikey.createdAt))

    return {
      ok: true,
      keys: rows.map((row) => {
        const meta = parseMetadata(row.metadata)
        return {
          id: row.id,
          name: row.name,
          start: row.start,
          prefix: row.prefix,
          enabled: row.enabled,
          fillId: meta.fillId ?? null,
          ownerUserId: row.referenceId,
          expiresAt: row.expiresAt?.toISOString() ?? null,
          createdAt: row.createdAt.toISOString(),
          lastRequest: row.lastRequest?.toISOString() ?? null,
        }
      }),
    }
  } catch (error) {
    return actionError(error)
  }
}

export async function createShAgentApiKey(input: {
  fillId: string
  expiresInDays?: number
}): Promise<
  | { ok: true; id: string; key: string; fillId: string }
  | { ok: false; error: string }
> {
  try {
    const { organizationId, session } = await requireOrgAdminSession()
    const fillId = input.fillId.trim()
    if (!fillId) {
      throw new DomainError("fillId is required", "VALIDATION")
    }

    const { repos } = createAppContext()
    const fill = await repos.rfps.findByIdForOrganization(
      organizationId,
      fillId
    )
    if (!fill) {
      throw new DomainError(`Fill not found: ${fillId}`, "NOT_FOUND")
    }

    const days = input.expiresInDays ?? 7
    if (!Number.isFinite(days) || days < 1 || days > 90) {
      throw new DomainError("expiresInDays must be 1–90", "VALIDATION")
    }

    const created = await createFillAgentApiKey({
      userId: session.user.id,
      organizationId,
      fillId,
      expiresIn: Math.round(days * 24 * 60 * 60),
    })

    return {
      ok: true,
      id: created.id,
      key: created.key,
      fillId,
    }
  } catch (error) {
    return actionError(error)
  }
}

export async function revokeShAgentApiKey(
  keyId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { organizationId } = await requireOrgAdminSession()
    if (!keyId.trim()) {
      throw new DomainError("keyId is required", "VALIDATION")
    }

    const { db } = createAppContext()
    const updated = await db
      .update(apikey)
      .set({ enabled: false, updatedAt: new Date() })
      .where(
        and(
          eq(apikey.id, keyId),
          eq(apikey.configId, SH_AGENT_API_KEY_CONFIG_ID),
          sql`${apikey.metadata}::jsonb ->> 'organizationId' = ${organizationId}`
        )
      )
      .returning({ id: apikey.id })

    if (!updated[0]) {
      throw new DomainError("API key not found", "NOT_FOUND")
    }

    return { ok: true }
  } catch (error) {
    return actionError(error)
  }
}

export async function deleteShAgentApiKey(
  keyId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { organizationId } = await requireOrgAdminSession()
    if (!keyId.trim()) {
      throw new DomainError("keyId is required", "VALIDATION")
    }

    const { db } = createAppContext()
    const deleted = await db
      .delete(apikey)
      .where(
        and(
          eq(apikey.id, keyId),
          eq(apikey.configId, SH_AGENT_API_KEY_CONFIG_ID),
          sql`${apikey.metadata}::jsonb ->> 'organizationId' = ${organizationId}`
        )
      )
      .returning({ id: apikey.id })

    if (!deleted[0]) {
      throw new DomainError("API key not found", "NOT_FOUND")
    }

    return { ok: true }
  } catch (error) {
    return actionError(error)
  }
}

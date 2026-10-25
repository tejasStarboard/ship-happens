import { auth } from "@/lib/auth"
import { DomainError } from "@/lib/domain/errors"

export const SH_AGENT_API_KEY_CONFIG_ID = "sh-agent"

export type ShApiKeyContext = {
  keyId: string
  userId: string
  organizationId: string
  fillId: string | null
  permissions: Record<string, string[]> | null
}

function asMetadata(value: unknown): {
  organizationId?: string
  fillId?: string
} {
  if (!value || typeof value !== "object") return {}
  const obj = value as Record<string, unknown>
  return {
    organizationId:
      typeof obj.organizationId === "string" ? obj.organizationId : undefined,
    fillId: typeof obj.fillId === "string" ? obj.fillId : undefined,
  }
}

function parsePermissions(value: unknown): Record<string, string[]> | null {
  if (!value) return null
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, string[]>
    } catch {
      return null
    }
  }
  if (typeof value === "object") {
    return value as Record<string, string[]>
  }
  return null
}

/**
 * Authenticate `/api/sh/*` requests via Better Auth API key (`x-api-key`).
 * Keys are minted for the fill owner with metadata `{ organizationId, fillId }`.
 */
export async function requireShApiKey(
  request: Request,
  options?: { permissions?: Record<string, string[]> }
): Promise<ShApiKeyContext> {
  const key = request.headers.get("x-api-key")?.trim()
  if (!key) {
    throw new DomainError("Missing x-api-key header", "UNAUTHORIZED")
  }

  const result = await auth.api.verifyApiKey({
    body: {
      key,
      configId: SH_AGENT_API_KEY_CONFIG_ID,
      ...(options?.permissions ? { permissions: options.permissions } : {}),
    },
  })

  if (!result.valid || !result.key) {
    const errMessage = result.error?.message
    throw new DomainError(
      typeof errMessage === "string" ? errMessage : "Invalid API key",
      "UNAUTHORIZED"
    )
  }

  const metadata = asMetadata(result.key.metadata)
  const organizationId = metadata.organizationId
  if (!organizationId) {
    throw new DomainError(
      "API key missing organizationId metadata",
      "FORBIDDEN"
    )
  }

  return {
    keyId: result.key.id,
    userId: result.key.referenceId,
    organizationId,
    fillId: metadata.fillId ?? null,
    permissions: parsePermissions(result.key.permissions),
  }
}

/** Ensure the key may access this fill (metadata fill lock + org ownership). */
export function assertFillAccess(ctx: ShApiKeyContext, fillId: string): void {
  if (ctx.fillId && ctx.fillId !== fillId) {
    throw new DomainError(
      `API key is scoped to fill ${ctx.fillId}, not ${fillId}`,
      "FORBIDDEN"
    )
  }
}

/**
 * Mint a short-lived agent API key for a fill sandbox.
 * Returns the plaintext key once (Better Auth only stores the hash).
 */
export async function createFillAgentApiKey(input: {
  userId: string
  organizationId: string
  fillId: string
  /** Seconds until expiry. Default 24h. */
  expiresIn?: number
}): Promise<{ key: string; id: string }> {
  const data = await auth.api.createApiKey({
    body: {
      configId: SH_AGENT_API_KEY_CONFIG_ID,
      userId: input.userId,
      name: `fill-${input.fillId.slice(0, 24)}`,
      expiresIn: input.expiresIn ?? 60 * 60 * 24,
      metadata: {
        organizationId: input.organizationId,
        fillId: input.fillId,
      },
      permissions: {
        fill: ["read", "reviews"],
      },
    },
  })

  if (!data?.key) {
    throw new DomainError("Failed to create API key", "VALIDATION")
  }

  return { key: data.key, id: data.id }
}

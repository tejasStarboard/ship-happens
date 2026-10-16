/**
 * Runtime config for sb-client.
 * Secrets from env only — never log STARBOARD_HANDSHAKE_KEY or client secrets.
 */

export interface Config {
  appDomain: string
  handshakeKey: string
  /** Public API client credentials (Mode A). */
  clientId: string | null
  clientSecret: string | null
  /** Direct company UUID (Mode B — first-party/dev). */
  companyId: string | null
}

function required(name: string, value: string | undefined): string {
  const trimmed = value?.trim()
  if (!trimmed) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return trimmed
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const appDomain = required(
    "STARBOARD_APP_DOMAIN",
    env.STARBOARD_APP_DOMAIN
  ).replace(/\/$/, "")
  const handshakeKey = required(
    "STARBOARD_HANDSHAKE_KEY",
    env.STARBOARD_HANDSHAKE_KEY
  )

  const clientId =
    env.SB_CLIENT_CLIENT_ID?.trim() || env.SB_MCP_CLIENT_ID?.trim() || null
  const clientSecret =
    env.SB_CLIENT_CLIENT_SECRET?.trim() ||
    env.SB_MCP_CLIENT_SECRET?.trim() ||
    null
  const companyId =
    env.SB_CLIENT_COMPANY_ID?.trim() || env.SB_MCP_COMPANY_ID?.trim() || null

  const hasClientCreds = Boolean(clientId && clientSecret)
  if (clientId && !clientSecret) {
    throw new Error(
      "SB_CLIENT_CLIENT_SECRET is required when SB_CLIENT_CLIENT_ID is set"
    )
  }
  if (clientSecret && !clientId) {
    throw new Error(
      "SB_CLIENT_CLIENT_ID is required when SB_CLIENT_CLIENT_SECRET is set"
    )
  }
  if (!hasClientCreds && !companyId) {
    throw new Error(
      "Auth required: set SB_CLIENT_CLIENT_ID + SB_CLIENT_CLIENT_SECRET, or SB_CLIENT_COMPANY_ID (dev)"
    )
  }

  return {
    appDomain,
    handshakeKey,
    clientId,
    clientSecret,
    companyId: hasClientCreds ? null : companyId,
  }
}

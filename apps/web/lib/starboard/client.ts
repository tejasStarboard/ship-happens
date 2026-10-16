import {
  AuthError,
  createClient,
  StarboardApiError,
  type CreateClientOptions,
  type StarboardClient,
} from "@starboard/sb-client"
import { env } from "@/env"

export { AuthError, StarboardApiError, type StarboardClient }

/** Misconfigured or incomplete Starboard env — safe to surface to callers. */
export class StarboardConfigError extends Error {
  readonly statusCode = 503

  constructor(message: string) {
    super(message)
    this.name = "StarboardConfigError"
  }
}

export type StarboardAuthMode = "client_credentials" | "company_id"

export type StarboardEnvStatus = {
  configured: boolean
  appDomain: boolean
  handshakeKey: boolean
  authMode: StarboardAuthMode | null
}

/**
 * Whether Starboard env is complete enough to instantiate `@starboard/sb-client`.
 * Does not call the network.
 */
export function getStarboardEnvStatus(): StarboardEnvStatus {
  const appDomain = Boolean(env.STARBOARD_APP_DOMAIN)
  const handshakeKey = Boolean(env.STARBOARD_HANDSHAKE_KEY)
  const hasClientCreds = Boolean(
    env.SB_CLIENT_CLIENT_ID && env.SB_CLIENT_CLIENT_SECRET
  )
  const hasCompanyId = Boolean(env.SB_CLIENT_COMPANY_ID)

  let authMode: StarboardAuthMode | null = null
  if (hasClientCreds) authMode = "client_credentials"
  else if (hasCompanyId) authMode = "company_id"

  return {
    configured: appDomain && handshakeKey && authMode !== null,
    appDomain,
    handshakeKey,
    authMode,
  }
}

export function isStarboardConfigured(): boolean {
  return getStarboardEnvStatus().configured
}

function requireStarboardOptions(): CreateClientOptions {
  const status = getStarboardEnvStatus()
  if (!status.appDomain) {
    throw new StarboardConfigError("Missing required env: STARBOARD_APP_DOMAIN")
  }
  if (!status.handshakeKey) {
    throw new StarboardConfigError(
      "Missing required env: STARBOARD_HANDSHAKE_KEY"
    )
  }
  if (!status.authMode) {
    throw new StarboardConfigError(
      "Auth required: set SB_CLIENT_CLIENT_ID + SB_CLIENT_CLIENT_SECRET, or SB_CLIENT_COMPANY_ID (dev)"
    )
  }
  if (env.SB_CLIENT_CLIENT_ID && !env.SB_CLIENT_CLIENT_SECRET) {
    throw new StarboardConfigError(
      "SB_CLIENT_CLIENT_SECRET is required when SB_CLIENT_CLIENT_ID is set"
    )
  }
  if (env.SB_CLIENT_CLIENT_SECRET && !env.SB_CLIENT_CLIENT_ID) {
    throw new StarboardConfigError(
      "SB_CLIENT_CLIENT_ID is required when SB_CLIENT_CLIENT_SECRET is set"
    )
  }

  return {
    appDomain: env.STARBOARD_APP_DOMAIN,
    handshakeKey: env.STARBOARD_HANDSHAKE_KEY,
    clientId: env.SB_CLIENT_CLIENT_ID,
    clientSecret: env.SB_CLIENT_CLIENT_SECRET,
    companyId:
      status.authMode === "client_credentials"
        ? undefined
        : env.SB_CLIENT_COMPANY_ID,
  }
}

/**
 * Authenticated Starboard client for server routes/actions.
 * Logs auth/API failures without secrets (no handshake key / client secret).
 */
export async function createStarboardClient(): Promise<StarboardClient> {
  const options = requireStarboardOptions()

  try {
    return await createClient(options)
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      console.error("[starboard] auth/handshake failed", {
        status: err.statusCode,
        message: err.message,
        authMode: getStarboardEnvStatus().authMode,
        appDomain: env.STARBOARD_APP_DOMAIN,
      })
      throw err
    }
    if (err instanceof StarboardApiError) {
      console.error("[starboard] API error", {
        status: err.statusCode,
        message: err.message,
      })
      throw err
    }
    console.error("[starboard] client init failed", {
      message: err instanceof Error ? err.message : String(err),
    })
    throw err
  }
}

/** Smoke check: verify credentials and return company scope (no secrets). */
export async function testStarboardAuth(): Promise<{
  status: "OK"
  companyId: string
  clientId: string | null
  authMode: StarboardAuthMode
}> {
  const client = await createStarboardClient()
  const authMode = getStarboardEnvStatus().authMode
  if (!authMode) {
    throw new StarboardConfigError("Starboard auth mode unresolved after init")
  }
  return {
    status: "OK",
    companyId: client.companyId,
    clientId: client.clientId,
    authMode,
  }
}

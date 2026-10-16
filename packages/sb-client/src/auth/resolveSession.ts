import type { Config } from "../config.js"
import type { AuthSession } from "./types.js"
import { AuthError } from "./types.js"
import { parseBasicAuthHeader, verifyPublicApiClient } from "./verify.js"

/**
 * Resolve the authenticated tenant.
 *
 * Mode A: public_api_clients (client_id + secret) → company_id from verify.
 * Mode B: SB_CLIENT_COMPANY_ID (dev) with handshake only.
 * Optional Authorization Basic overrides env client credentials.
 */
export async function resolveAuthSession(params: {
  config: Config
  authorizationHeader?: string
  fetchImpl?: typeof fetch
}): Promise<AuthSession> {
  const { config, authorizationHeader, fetchImpl } = params

  if (authorizationHeader) {
    const { clientId, clientSecret } = parseBasicAuthHeader(authorizationHeader)
    return verifyPublicApiClient({
      appDomain: config.appDomain,
      handshakeKey: config.handshakeKey,
      clientId,
      clientSecret,
      fetchImpl,
    })
  }

  if (config.clientId && config.clientSecret) {
    return verifyPublicApiClient({
      appDomain: config.appDomain,
      handshakeKey: config.handshakeKey,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      fetchImpl,
    })
  }

  if (config.companyId) {
    return { companyId: config.companyId, clientId: null }
  }

  throw new AuthError("No credentials configured", 401)
}

import type { AuthSession } from "./types.js"
import { AuthError } from "./types.js"

/**
 * Verify public API client credentials via the webapp (same path as Go public-api).
 * POST /api/public_api_clients/verify with handshake key.
 * Never logs the secret.
 */
export async function verifyPublicApiClient(params: {
  appDomain: string
  handshakeKey: string
  clientId: string
  clientSecret: string
  fetchImpl?: typeof fetch
}): Promise<AuthSession> {
  const { appDomain, handshakeKey, clientId, clientSecret } = params
  const fetchImpl = params.fetchImpl ?? fetch

  const res = await fetchImpl(`${appDomain}/api/public_api_clients/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-starboard-handshake-key": handshakeKey,
    },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  })

  if (res.status === 401) {
    throw new AuthError("Invalid credentials", 401)
  }
  if (!res.ok) {
    throw new AuthError(
      `Credential verification failed (${res.status})`,
      res.status === 503 ? 503 : 500
    )
  }

  const body = (await res.json()) as { client_id?: string; company_id?: string }
  if (!body.company_id) {
    throw new AuthError("Credential verification returned no company_id", 500)
  }

  return {
    companyId: body.company_id,
    clientId: body.client_id ?? clientId,
  }
}

/** Parse `Authorization: Basic base64(client_id:client_secret)`. */
export function parseBasicAuthHeader(header: string | undefined): {
  clientId: string
  clientSecret: string
} {
  if (!header?.startsWith("Basic ")) {
    throw new AuthError(
      "Missing or invalid Authorization header (expected Basic)",
      401
    )
  }
  const encoded = header.slice("Basic ".length).trim()
  let decoded: string
  try {
    decoded = Buffer.from(encoded, "base64").toString("utf8")
  } catch {
    throw new AuthError("Invalid Basic auth encoding", 401)
  }
  const colon = decoded.indexOf(":")
  if (colon <= 0) {
    throw new AuthError("Invalid Basic auth credentials", 401)
  }
  return {
    clientId: decoded.slice(0, colon),
    clientSecret: decoded.slice(colon + 1),
  }
}

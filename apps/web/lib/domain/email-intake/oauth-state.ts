import { createHmac, timingSafeEqual } from "node:crypto"
import { env } from "@/env"

export type OAuthStatePayload = {
  organizationId: string
  userId: string
  provider: "gmail" | "outlook"
  nonce: string
  exp: number
}

function sign(body: string): string {
  return createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(body)
    .digest("base64url")
}

export function encodeOAuthState(payload: OAuthStatePayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  )
  return `${body}.${sign(body)}`
}

export function decodeOAuthState(token: string): OAuthStatePayload {
  const [body, sig] = token.split(".")
  if (!body || !sig) throw new Error("Invalid OAuth state")
  const expected = sign(body)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Invalid OAuth state signature")
  }
  const payload = JSON.parse(
    Buffer.from(body, "base64url").toString("utf8")
  ) as OAuthStatePayload
  if (payload.exp < Date.now()) {
    throw new Error("OAuth state expired")
  }
  return payload
}

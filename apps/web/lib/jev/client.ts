import { TypeSafeClient } from "@typesafe-ai/sdk"
import { env } from "@/env"

let cached: TypeSafeClient | null = null

/** Shared Jev (TypeSafe System One) client. Reads `JEV_API_KEY`. */
export function getJevClient(): TypeSafeClient {
  if (cached) return cached
  const apiKey = env.JEV_API_KEY
  if (!apiKey) {
    throw new Error(
      "JEV_API_KEY is not configured — cannot call Jev (email / geo)"
    )
  }
  cached = new TypeSafeClient({
    apiKey,
    defaultModel: "jev-latest",
  })
  return cached
}

export function isJevConfigured(): boolean {
  return Boolean(env.JEV_API_KEY)
}

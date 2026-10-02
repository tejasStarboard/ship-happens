import { Sandbox } from "e2b"
import { env } from "@/env"

/** Default sandbox lifetime for a fill turn (ms). */
export const E2B_DEFAULT_TIMEOUT_MS = 30 * 60 * 1000

export function requireE2BApiKey(): string {
  const key = env.E2B_API_KEY
  if (!key) {
    throw new Error("E2B_API_KEY is not set")
  }
  return key
}

/**
 * Create an E2B sandbox for filler jobs.
 * Prefer a custom template (`E2B_TEMPLATE_ID`) with Python + Excel libs.
 */
export async function createFillSandbox(options?: {
  timeoutMs?: number
}): Promise<Sandbox> {
  const apiKey = requireE2BApiKey()
  const timeoutMs = options?.timeoutMs ?? E2B_DEFAULT_TIMEOUT_MS
  const template = env.E2B_TEMPLATE_ID

  if (template) {
    return Sandbox.create(template, { apiKey, timeoutMs })
  }

  return Sandbox.create({ apiKey, timeoutMs })
}

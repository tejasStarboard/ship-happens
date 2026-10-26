import { choice } from "@typesafe-ai/sdk"
import type { CrmMatchResult } from "@ship-happens/fill"
import { getJevClient, isJevConfigured } from "./client"

/**
 * Lightweight CRM-ish customer label normalize via Jev.
 * Always fail-open: returns null when Jev is down / unconfigured / unsure.
 */
export async function matchCustomerLabel(
  label: string
): Promise<CrmMatchResult | null> {
  const trimmed = label.trim()
  if (!trimmed || !isJevConfigured()) return null

  try {
    const client = getJevClient()
    const response = await client.systemOne({
      state: { customerLabel: trimmed },
      questions: {
        match: choice(
          "Is this a usable BCO / shipper company display name for a fill?",
          {
            usable:
              "A recognizable company or customer name we can show on the fill",
            not_usable:
              "Garbage, a person name only, a port, or not a customer org",
          }
        ),
      },
    })

    const answer = response.answers.match
    const confidence =
      typeof answer.confidence === "number" ? answer.confidence : 0
    if (answer.choice !== "usable" || confidence < 0.7) return null

    return { displayName: trimmed, confidence }
  } catch {
    return null
  }
}

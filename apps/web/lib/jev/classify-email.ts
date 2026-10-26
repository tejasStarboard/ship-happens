import { choice } from "@typesafe-ai/sdk"
import { getJevClient } from "./client"

export const EMAIL_RELEVANCE_CONFIDENCE_THRESHOLD = 0.7

export type EmailClassifyInput = {
  subject: string
  from: string
  bodyText: string
  attachmentNames: string[]
}

export type EmailClassifyResult = {
  classification: "relevant" | "not_relevant"
  confidence: number
  shouldIngest: boolean
  raw: Record<string, unknown>
}

/**
 * Jev System One decision: is this email a BCO/RFP bid sheet Ship Happens
 * should turn into a fill?
 */
export async function classifyEmailAsBcoSheet(
  input: EmailClassifyInput
): Promise<EmailClassifyResult> {
  const client = getJevClient()
  const response = await client.systemOne({
    state: {
      subject: input.subject,
      from: input.from,
      bodyText: input.bodyText.slice(0, 12_000),
      attachmentNames: input.attachmentNames,
    },
    questions: {
      relevance: choice(
        "Is this email a BCO/RFP bid-sheet request Ship Happens should ingest?",
        {
          relevant:
            "Customer tender / BCO bid sheet / RFP workbook attachment to price",
          not_relevant:
            "Unrelated mail, vendor rate sheets for Starboard, noise, or no tender intent",
        }
      ),
    },
  })

  const answer = response.answers.relevance
  const classification = answer.choice
  const confidence =
    typeof answer.confidence === "number" ? answer.confidence : 0

  return {
    classification,
    confidence,
    shouldIngest:
      classification === "relevant" &&
      confidence >= EMAIL_RELEVANCE_CONFIDENCE_THRESHOLD,
    raw: {
      model: response.model,
      answers: response.answers,
      usage: response.usage,
    },
  }
}

/** Pure gate used by unit tests (no network). */
export function gateEmailRelevance(
  classification: "relevant" | "not_relevant",
  confidence: number,
  threshold = EMAIL_RELEVANCE_CONFIDENCE_THRESHOLD
): boolean {
  return classification === "relevant" && confidence >= threshold
}

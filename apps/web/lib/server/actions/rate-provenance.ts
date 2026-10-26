"use server"

import { AuthError, StarboardApiError } from "@ship-happens/sb-client"
import { requireOrgSession } from "@/lib/auth/session"
import {
  createStarboardClient,
  isStarboardConfigured,
  StarboardConfigError,
} from "@/lib/starboard/client"

export type RateProvenanceLinks = {
  rateDocUrl: string | null
  vendorEmailUrl: string | null
}

/**
 * Lazy-sign Starboard rate-doc provenance for Review audit (SB-7089).
 * Failures soft-return nulls so expand/export never breaks.
 */
export async function resolveRateProvenanceLinks(input: {
  vendorRateDocId: string | null
  vendorEmailUrl: string | null
}): Promise<RateProvenanceLinks> {
  await requireOrgSession()

  const persistedEmail =
    typeof input.vendorEmailUrl === "string" && input.vendorEmailUrl.trim()
      ? input.vendorEmailUrl.trim()
      : null

  const docId =
    typeof input.vendorRateDocId === "string" && input.vendorRateDocId.trim()
      ? input.vendorRateDocId.trim()
      : null

  if (!docId) {
    return { rateDocUrl: null, vendorEmailUrl: persistedEmail }
  }

  if (!isStarboardConfigured()) {
    return { rateDocUrl: null, vendorEmailUrl: persistedEmail }
  }

  try {
    const client = await createStarboardClient()
    const signed = await client.rates.getRateDocSignedUrl(docId)
    return {
      rateDocUrl: signed.signedUrl,
      vendorEmailUrl: persistedEmail,
    }
  } catch (err) {
    if (
      err instanceof AuthError ||
      err instanceof StarboardApiError ||
      err instanceof StarboardConfigError
    ) {
      console.warn("[rate-provenance] soft-fail signed URL", {
        status: err.statusCode,
        message: err.message,
      })
      return { rateDocUrl: null, vendorEmailUrl: persistedEmail }
    }
    console.warn("[rate-provenance] soft-fail signed URL", {
      message: err instanceof Error ? err.message : String(err),
    })
    return { rateDocUrl: null, vendorEmailUrl: persistedEmail }
  }
}

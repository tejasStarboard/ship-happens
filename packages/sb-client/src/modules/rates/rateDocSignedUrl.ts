import type { StarboardHttp } from "../../http/starboardHttp.js"

/** UUID v1–v5 (matches Starboard vendor_rate_doc.id). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isRateDocId(value: string): boolean {
  return UUID_RE.test(value)
}

export type RateDocSignedUrlResult = {
  /** Private docs-bucket signed download URL when available. */
  signedUrl: string | null
  name: string | null
  /**
   * True when Starboard has email display data even if the attachment URL
   * is missing (old saves / attachment_missing).
   */
  hasEmailSource: boolean
  error: string | null
  message: string | null
}

type RawSignedUrlBody = {
  signedUrl?: string | null
  name?: string | null
  emailDisplayData?: unknown
  error?: string
  message?: string
}

/**
 * GET /api/vendor_rates/rate_docs/get_signed_url?rate_doc_id=…
 * Requires handshake + company scope (or a browser session on Starboard).
 */
export async function getRateDocSignedUrl(
  http: StarboardHttp,
  rateDocId: string
): Promise<RateDocSignedUrlResult> {
  if (!isRateDocId(rateDocId)) {
    return {
      signedUrl: null,
      name: null,
      hasEmailSource: false,
      error: "file_not_found",
      message: "This rate has no source document.",
    }
  }

  const path = `/vendor_rates/rate_docs/get_signed_url?rate_doc_id=${encodeURIComponent(rateDocId)}`
  const body = await http.request<RawSignedUrlBody>("GET", path)
  const signedUrl =
    typeof body.signedUrl === "string" && body.signedUrl.length > 0
      ? body.signedUrl
      : null

  return {
    signedUrl,
    name: typeof body.name === "string" ? body.name : null,
    hasEmailSource: body.emailDisplayData != null,
    error: typeof body.error === "string" ? body.error : null,
    message: typeof body.message === "string" ? body.message : null,
  }
}

/** Pull durable provenance fields from a search/resolve hit. */
export function provenanceFromSearchHit(hit: {
  vendor_rate_doc_id?: unknown
  vendor_email_url?: unknown
  [key: string]: unknown
}): {
  vendorRateDocId: string | null
  vendorEmailUrl: string | null
} {
  const docId =
    typeof hit.vendor_rate_doc_id === "string" && hit.vendor_rate_doc_id.trim()
      ? hit.vendor_rate_doc_id.trim()
      : null
  const emailUrl =
    typeof hit.vendor_email_url === "string" && hit.vendor_email_url.trim()
      ? hit.vendor_email_url.trim()
      : null
  return {
    vendorRateDocId: docId,
    vendorEmailUrl: emailUrl,
  }
}

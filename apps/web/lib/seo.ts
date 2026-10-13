/** Display name used in document titles and Open Graph tags. */
export const APP_NAME = "Ship Happens"

export const APP_DESCRIPTION = "Automate filing RFP bid sheets"

/** Absolute site origin when known (set via env in production). */
export const APP_URL = (() => {
  const value = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL
  return value?.replace(/\/$/, "") || undefined
})()

/** Default social / share image. */
export const APP_OG_IMAGE = "/icon-512.png"

/** Build a tab/SEO title like `Sign in · Ship Happens`. */
export function pageTitle(segment?: string | null): string {
  const trimmed = segment?.trim()
  if (!trimmed) return APP_NAME
  return `${trimmed} · ${APP_NAME}`
}

/** Display name used in document titles and Open Graph tags. */
export const APP_NAME = "Ship Happens"

export const APP_DESCRIPTION = "Automate filing RFP bid sheets"

/** Absolute site origin when known (set via env in production). */
export const APP_URL = (() => {
  try {
    const value = import.meta.env?.VITE_APP_URL as string | undefined
    return value?.replace(/\/$/, "") || undefined
  } catch {
    return undefined
  }
})()

/** Default social / share image. */
export const APP_OG_IMAGE = "/icon-512.png"

/** Build a tab/SEO title like `Sign in · Ship Happens`. */
export function pageTitle(segment?: string | null): string {
  const trimmed = segment?.trim()
  if (!trimmed) return APP_NAME
  return `${trimmed} · ${APP_NAME}`
}

type MetaTag =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string }

type HeadResult = {
  meta: MetaTag[]
  links?: Array<{ rel: string; href: string; type?: string; sizes?: string }>
}

type PageMetaOptions = {
  title?: string | null
  description?: string | null
  /** When true, ask crawlers not to index (authenticated / private UI). */
  noIndex?: boolean
  ogType?: string
  url?: string | null
  image?: string | null
}

function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  if (APP_URL)
    return `${APP_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`
  return pathOrUrl
}

/** Shared meta builder for route `head` options. */
export function pageMeta({
  title,
  description = APP_DESCRIPTION,
  noIndex = false,
  ogType = "website",
  url,
  image = APP_OG_IMAGE,
}: PageMetaOptions = {}): HeadResult {
  const resolvedTitle = pageTitle(title)
  const resolvedDescription = description?.trim() || APP_DESCRIPTION
  const resolvedImage = image ? absoluteUrl(image) : undefined
  const resolvedUrl = url ? absoluteUrl(url) : undefined

  const meta: MetaTag[] = [
    { title: resolvedTitle },
    { name: "description", content: resolvedDescription },
    { name: "application-name", content: APP_NAME },
    { name: "apple-mobile-web-app-title", content: APP_NAME },
    { property: "og:title", content: resolvedTitle },
    { property: "og:description", content: resolvedDescription },
    { property: "og:type", content: ogType },
    { property: "og:site_name", content: APP_NAME },
    {
      name: "twitter:card",
      content: resolvedImage ? "summary_large_image" : "summary",
    },
    { name: "twitter:title", content: resolvedTitle },
    { name: "twitter:description", content: resolvedDescription },
  ]

  if (resolvedUrl) {
    meta.push({ property: "og:url", content: resolvedUrl })
  }

  if (resolvedImage) {
    meta.push(
      { property: "og:image", content: resolvedImage },
      { name: "twitter:image", content: resolvedImage }
    )
  }

  if (noIndex) {
    meta.push({ name: "robots", content: "noindex, nofollow" })
  }

  return { meta }
}

/** Display name used in document titles and Open Graph tags. */
export const APP_NAME = "Ship Happens"

export const APP_DESCRIPTION = "Automate filing RFP bid sheets"

/** Build a tab/SEO title like `Sign in · Project One`. */
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
  links?: Array<{ rel: string; href: string }>
}

type PageMetaOptions = {
  title?: string | null
  description?: string | null
  /** When true, ask crawlers not to index (authenticated / private UI). */
  noIndex?: boolean
  ogType?: string
  url?: string | null
}

/** Shared meta builder for route `head` options. */
export function pageMeta({
  title,
  description = APP_DESCRIPTION,
  noIndex = false,
  ogType = "website",
  url,
}: PageMetaOptions = {}): HeadResult {
  const resolvedTitle = pageTitle(title)
  const resolvedDescription = description?.trim() || APP_DESCRIPTION

  const meta: MetaTag[] = [
    { title: resolvedTitle },
    { name: "description", content: resolvedDescription },
    { property: "og:title", content: resolvedTitle },
    { property: "og:description", content: resolvedDescription },
    { property: "og:type", content: ogType },
    { property: "og:site_name", content: APP_NAME },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: resolvedTitle },
    { name: "twitter:description", content: resolvedDescription },
  ]

  if (url) {
    meta.push({ property: "og:url", content: url })
  }

  if (noIndex) {
    meta.push({ name: "robots", content: "noindex, nofollow" })
  }

  return { meta }
}

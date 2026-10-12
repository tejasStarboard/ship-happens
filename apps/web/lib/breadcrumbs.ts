import type { ReactNode } from "react"

export type AppBreadcrumb = {
  label: string
  to?: string
  params?: Record<string, string>
  search?: Record<string, string | undefined>
  icon?: ReactNode
}

type MatchLike = {
  routeId: string
  pathname: string
  params: Record<string, unknown>
  loaderData?: unknown
  search?: Record<string, unknown>
}

/**
 * Build header breadcrumbs from the active route matches.
 */
export function buildBreadcrumbs(matches: MatchLike[]): AppBreadcrumb[] {
  const leaf = matches[matches.length - 1]
  if (!leaf) return [{ label: "RFPs", to: "/rfp" }]

  const routeId = leaf.routeId
  const params = leaf.params as Record<string, string>
  const loaderData = leaf.loaderData as Record<string, unknown> | undefined

  if (routeId.includes("/settings/profile")) {
    return [{ label: "Settings", to: "/settings" }, { label: "Profile" }]
  }

  if (routeId.includes("/settings/preferences")) {
    return [{ label: "Settings", to: "/settings" }, { label: "Preferences" }]
  }

  if (routeId.includes("/settings/members")) {
    return [{ label: "Settings", to: "/settings" }, { label: "Members" }]
  }

  if (routeId.includes("/settings")) {
    return [{ label: "Settings" }]
  }

  if (routeId.includes("/rfp/$id")) {
    const rfp = loaderData?.rfp as { name?: string } | undefined
    return [
      { label: "RFPs", to: "/rfp" },
      { label: rfp?.name ?? params.id ?? "RFP" },
    ]
  }

  if (routeId.includes("/rfp")) {
    return [{ label: "RFPs" }]
  }

  if (routeId.includes("/templates/$templateId")) {
    const template = loaderData?.template as { name?: string } | undefined
    return [
      { label: "Templates", to: "/templates" },
      { label: template?.name ?? params.templateId ?? "Template" },
    ]
  }

  if (routeId.includes("/templates")) {
    return [{ label: "Templates" }]
  }

  if (routeId.includes("/rates")) {
    return [{ label: "Rates" }]
  }

  return [{ label: "RFPs", to: "/rfp" }]
}

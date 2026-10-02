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
  if (!leaf) return [{ label: "Dashboard", to: "/" }]

  const routeId = leaf.routeId

  if (routeId.includes("/settings/profile")) {
    return [{ label: "Settings", to: "/settings" }, { label: "Profile" }]
  }

  if (routeId.includes("/settings/preferences")) {
    return [{ label: "Settings", to: "/settings" }, { label: "Preferences" }]
  }

  if (routeId.includes("/settings")) {
    return [{ label: "Settings" }]
  }

  if (routeId.includes("/members")) {
    return [{ label: "Members" }]
  }

  return [{ label: "Dashboard" }]
}

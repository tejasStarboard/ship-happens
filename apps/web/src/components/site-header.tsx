import { Link, useMatches } from "@tanstack/react-router"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { Separator } from "@workspace/ui/components/separator"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"
import { buildBreadcrumbs } from "@/lib/breadcrumbs"

export function SiteHeader() {
  const matches = useMatches()

  const crumbs = buildBreadcrumbs(
    matches.map((m) => ({
      routeId: m.routeId,
      pathname: m.pathname,
      params: m.params as Record<string, unknown>,
      loaderData: m.loaderData,
      search: m.search as Record<string, unknown>,
    }))
  )

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2" />
        <Breadcrumb className="min-w-0 flex-1">
          <BreadcrumbList>
            {crumbs.map((crumb, index) => {
              const isLast = index === crumbs.length - 1
              const label = (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  {crumb.icon}
                  <span className="truncate">{crumb.label}</span>
                </span>
              )
              return (
                <BreadcrumbItem key={`${crumb.label}-${index}`}>
                  {index > 0 ? <BreadcrumbSeparator /> : null}
                  {isLast || !crumb.to ? (
                    <BreadcrumbPage className="truncate">
                      {label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      render={
                        <Link
                          to={crumb.to}
                          params={crumb.params}
                          search={crumb.search}
                        />
                      }
                      className="truncate"
                    >
                      {label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}

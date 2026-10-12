"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
import { Fragment } from "react"

function crumbsFromPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean)
  if (parts.length === 0) {
    return [{ label: "Home", href: "/rfp" as string | null }]
  }
  const crumbs: { label: string; href: string | null }[] = []
  let acc = ""
  for (let i = 0; i < parts.length; i += 1) {
    acc += `/${parts[i]}`
    const label = parts[i]
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
    crumbs.push({
      label,
      href: i === parts.length - 1 ? null : acc,
    })
  }
  return crumbs
}

export function SiteHeader() {
  const pathname = usePathname()
  const crumbs = crumbsFromPath(pathname)

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2" />
        <Breadcrumb className="min-w-0 flex-1">
          <BreadcrumbList>
            {crumbs.map((crumb, index) => {
              const isLast = index === crumbs.length - 1
              return (
                <Fragment key={`${crumb.label}-${index}`}>
                  {index > 0 ? <BreadcrumbSeparator /> : null}
                  <BreadcrumbItem>
                    {isLast || !crumb.href ? (
                      <BreadcrumbPage className="truncate">
                        {crumb.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        render={<Link href={crumb.href} />}
                        className="truncate"
                      >
                        {crumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}

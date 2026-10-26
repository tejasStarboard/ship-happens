"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { IconSearch } from "@tabler/icons-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@ship-happens/ui/components/breadcrumb"
import { Button } from "@ship-happens/ui/components/button"
import { Separator } from "@ship-happens/ui/components/separator"
import { SidebarTrigger } from "@ship-happens/ui/components/sidebar"
import { Fragment } from "react"
import { CommandPalette } from "@/components/command/command-palette"

const SEGMENT_LABELS: Record<string, string> = {
  rfp: "Fill desk",
  templates: "Templates",
  overlays: "Overlays",
  rates: "Starboard rates",
  help: "Help",
  settings: "Settings",
  profile: "Profile",
  preferences: "Preferences",
  members: "Members",
  "floor-margins": "Floor margins",
  "fill-export": "Fill export",
}

function labelForSegment(segment: string, index: number, parts: string[]) {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment]
  if (parts[0] === "rfp" && index === 1) return "Fill"
  if (parts[0] === "templates" && index === 1) return "Template"
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function crumbsFromPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean)
  if (parts.length === 0) {
    return [{ label: "Fill desk", href: "/rfp" as string | null }]
  }
  const crumbs: { label: string; href: string | null }[] = []
  let acc = ""
  for (let i = 0; i < parts.length; i += 1) {
    acc += `/${parts[i]}`
    crumbs.push({
      label: labelForSegment(parts[i]!, i, parts),
      href: i === parts.length - 1 ? null : acc,
    })
  }
  return crumbs
}

export function SiteHeader() {
  const pathname = usePathname()
  const crumbs = crumbsFromPath(pathname)
  const [commandOpen, setCommandOpen] = useState(false)

  return (
    <>
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="flex w-full items-center gap-1 px-4 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-2 h-4" />
          <Breadcrumb className="min-w-0 flex-1">
            <BreadcrumbList className="text-sm">
              {crumbs.map((crumb, index) => {
                const isLast = index === crumbs.length - 1
                return (
                  <Fragment key={`${crumb.label}-${index}`}>
                    {index > 0 ? <BreadcrumbSeparator /> : null}
                    <BreadcrumbItem>
                      {isLast || !crumb.href ? (
                        <BreadcrumbPage className="truncate font-medium">
                          {crumb.label}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink
                          render={<Link href={crumb.href} />}
                          className="truncate text-muted-foreground"
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

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-2 hidden h-8 gap-2 border-border/80 bg-muted/40 text-muted-foreground sm:inline-flex"
            onClick={() => setCommandOpen(true)}
          >
            <IconSearch className="size-3.5" />
            <span className="text-xs">Search</span>
            <kbd className="pointer-events-none ml-1 hidden rounded border border-border bg-background px-1.5 font-mono text-[10px] text-muted-foreground md:inline">
              ⌘K
            </kbd>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="sm:hidden"
            aria-label="Open command palette"
            onClick={() => setCommandOpen(true)}
          >
            <IconSearch className="size-4" />
          </Button>
        </div>
      </header>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  )
}

"use client"

import { type Icon, IconChevronRight } from "@tabler/icons-react"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@ship-happens/ui/components/collapsible"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@ship-happens/ui/components/sidebar"
import { cn } from "@ship-happens/ui/lib/utils"

export type NavMainItem = {
  title: string
  url: string
  icon?: Icon
  items?: { title: string; url: string }[]
}

export function NavMain({ items }: { items: NavMainItem[] }) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive =
              item.url === "/"
                ? pathname === "/"
                : pathname === item.url || pathname.startsWith(`${item.url}/`)

            if (item.items?.length) {
              return (
                <NavCollapsibleItem
                  key={item.title}
                  item={item}
                  pathname={pathname}
                  isActive={isActive}
                  onNavigate={(url) => router.push(url)}
                />
              )
            }

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={isActive}
                  className={
                    isActive
                      ? "relative after:absolute after:top-1.5 after:bottom-1.5 after:left-0 after:w-px after:bg-[var(--selection-line)]"
                      : undefined
                  }
                  onClick={() => {
                    if (item.url && item.url !== "#") {
                      router.push(item.url)
                    }
                  }}
                >
                  {item.icon ? <item.icon className="size-4" /> : null}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

function NavCollapsibleItem({
  item,
  pathname,
  isActive,
  onNavigate,
}: {
  item: NavMainItem
  pathname: string
  isActive: boolean
  onNavigate: (url: string) => void
}) {
  const childActive = item.items?.some((sub) => {
    const subPath = sub.url.split("#")[0]!
    return pathname === subPath || pathname.startsWith(`${subPath}/`)
  })
  const [open, setOpen] = useState(Boolean(isActive || childActive))

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger
          className={cn(
            "flex h-8 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm text-sidebar-foreground ring-sidebar-ring outline-hidden transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2",
            (isActive || childActive) &&
              "relative bg-sidebar-accent font-medium text-sidebar-accent-foreground after:absolute after:top-1.5 after:bottom-1.5 after:left-0 after:w-px after:bg-[var(--selection-line)]"
          )}
        >
          {item.icon ? <item.icon className="size-4 shrink-0" /> : null}
          <span className="truncate">{item.title}</span>
          <IconChevronRight className="ml-auto size-4 shrink-0 transition-transform group-data-[panel-open]/collapsible:rotate-90 group-data-[state=open]/collapsible:rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.items?.map((sub) => {
              const subPath = sub.url.split("#")[0]!
              const subActive =
                pathname === subPath || pathname.startsWith(`${subPath}/`)
              return (
                <SidebarMenuSubItem key={sub.title}>
                  <SidebarMenuSubButton
                    isActive={subActive}
                    href={sub.url}
                    onClick={(e) => {
                      e.preventDefault()
                      onNavigate(sub.url)
                    }}
                  >
                    <span>{sub.title}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              )
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

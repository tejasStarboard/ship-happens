"use client"

import { type Icon } from "@tabler/icons-react"
import { usePathname, useRouter } from "next/navigation"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: Icon
  }[]
}) {
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

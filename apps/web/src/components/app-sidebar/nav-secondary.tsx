import * as React from "react"
import { type Icon } from "@tabler/icons-react"
import { useNavigate } from "@tanstack/react-router"
import { Kbd } from "@workspace/ui/components/kbd"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"

export type NavSecondaryItem = {
  title: string
  url?: string
  icon: Icon
  onClick?: () => void
  shortcut?: string
}

export function NavSecondary({
  items,
  ...props
}: {
  items: NavSecondaryItem[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const navigate = useNavigate()

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                onClick={() => {
                  if (item.onClick) {
                    item.onClick()
                    return
                  }
                  if (item.url && item.url !== "#") {
                    navigate({ to: item.url })
                  }
                }}
              >
                <item.icon />
                <span>{item.title}</span>
              </SidebarMenuButton>
              {item.shortcut ? (
                <SidebarMenuBadge>
                  <Kbd className="bg-transparent text-muted-foreground">
                    {item.shortcut}
                  </Kbd>
                </SidebarMenuBadge>
              ) : null}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

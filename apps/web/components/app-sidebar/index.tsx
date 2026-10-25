"use client"

import * as React from "react"
import {
  IconCurrencyDollar,
  IconFileSpreadsheet,
  IconHelp,
  IconLayersSubtract,
  IconSettings,
  IconTemplate,
} from "@tabler/icons-react"

import { NavMain } from "./nav-main"
import { NavSecondary } from "./nav-secondary"
import { NavUser, type NavUserData } from "./nav-user"
import { OrgSwitcher, type OrgSwitcherItem } from "./org-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@workspace/ui/components/sidebar"

const navMain = [
  {
    title: "Fill desk",
    url: "/rfp",
    icon: IconFileSpreadsheet,
  },
  {
    title: "Templates",
    url: "/templates",
    icon: IconTemplate,
  },
  {
    title: "Overlays",
    url: "/overlays",
    icon: IconLayersSubtract,
  },
  {
    title: "Starboard rates",
    url: "/rates",
    icon: IconCurrencyDollar,
  },
]

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  orgs: OrgSwitcherItem[]
  user: NavUserData
}

export function AppSidebar({ orgs, user, ...props }: AppSidebarProps) {
  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border"
      {...props}
    >
      <SidebarHeader className="border-b border-sidebar-border">
        <OrgSwitcher orgs={orgs} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary
          className="mt-auto"
          items={[
            {
              title: "Settings",
              url: "/settings",
              icon: IconSettings,
            },
            {
              title: "Get Help",
              url: "/help",
              icon: IconHelp,
            },
          ]}
        />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}

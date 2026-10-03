import * as React from "react"
import {
  IconCurrencyDollar,
  IconFileSpreadsheet,
  IconHelp,
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
    title: "RFPs",
    url: "/rfp",
    icon: IconFileSpreadsheet,
  },
  {
    title: "Templates",
    url: "/templates",
    icon: IconTemplate,
  },
  {
    title: "Rates",
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
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
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
              url: "#",
              icon: IconHelp,
            },
          ]}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}

import * as React from "react"
import { useRouter } from "@tanstack/react-router"
import {
  IconCheck,
  IconCopy,
  IconPlus,
  IconSelector,
} from "@tabler/icons-react"
import { toast } from "sonner"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar"
import { useServerMutation } from "@/hooks/use-server-mutation"
import { authClient } from "@/lib/auth/client"

export type OrgSwitcherItem = {
  id: string
  title: string
  slug?: string | null
  logoUrl?: string | null
  isActive?: boolean
}

function OrgMark({
  title,
  logoUrl,
  size = "md",
}: {
  title: string
  logoUrl?: string | null
  size?: "sm" | "md"
}) {
  const hasLogo = Boolean(logoUrl)
  const box =
    size === "sm"
      ? "size-6 rounded-md"
      : hasLogo
        ? "size-8 rounded-lg"
        : "size-8 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
  const initial = title.trim().charAt(0).toUpperCase() || "?"

  return (
    <Avatar className={`${box} shrink-0 after:rounded-[inherit]`}>
      {logoUrl ? (
        <AvatarImage src={logoUrl} alt="" className="rounded-[inherit]" />
      ) : null}
      <AvatarFallback
        className={
          size === "sm"
            ? "rounded-md border bg-background text-[10px]"
            : "rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
        }
      >
        {initial}
      </AvatarFallback>
    </Avatar>
  )
}

export function OrgSwitcher({ orgs }: { orgs: OrgSwitcherItem[] }) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const { mutate, pending } = useServerMutation()
  const [switchingId, setSwitchingId] = React.useState<string | null>(null)

  const activeOrg = orgs.find((org) => org.isActive) ?? orgs[0] ?? null

  async function switchOrg(org: OrgSwitcherItem) {
    if (org.id === activeOrg?.id || switchingId || pending) return
    setSwitchingId(org.id)
    try {
      await mutate(
        async () => {
          const { error } = await authClient.organization.setActive({
            organizationId: org.id,
          })
          if (error) {
            throw new Error(error.message ?? "Could not switch organization")
          }
        },
        {
          errorMessage: "Could not switch organization",
          // Soft-reload below so beforeLoad + loaders see the new active org.
          invalidate: false,
        }
      )
      await router.invalidate({ sync: true })
      await router.navigate({ to: "/", replace: true })
    } catch {
      // toast handled by useServerMutation
    } finally {
      setSwitchingId(null)
    }
  }

  if (!activeOrg) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            className="gap-2"
            onClick={() => void router.navigate({ to: "/select-org" })}
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <IconPlus className="size-4" />
            </div>
            <span className="truncate font-medium">Create organization</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <OrgMark title={activeOrg.title} logoUrl={activeOrg.logoUrl} />
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{activeOrg.title}</span>
              {activeOrg.slug ? (
                <span className="truncate text-xs text-muted-foreground">
                  {activeOrg.slug}
                </span>
              ) : null}
            </div>
            <IconSelector className="ml-auto size-4 shrink-0 text-muted-foreground" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>Organizations</DropdownMenuLabel>
              {orgs.map((org) => {
                const isActive = org.id === activeOrg.id
                return (
                  <DropdownMenuItem
                    key={org.id}
                    disabled={switchingId != null}
                    onClick={() => void switchOrg(org)}
                    className="gap-2 p-2"
                  >
                    <OrgMark
                      title={org.title}
                      logoUrl={org.logoUrl}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1 truncate">{org.title}</span>
                    {isActive ? (
                      <IconCheck className="size-4 shrink-0 text-foreground" />
                    ) : null}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="gap-2 p-2"
                onClick={() => void router.navigate({ to: "/select-org" })}
              >
                <div className="flex size-6 shrink-0 items-center justify-center rounded-md border bg-background">
                  <IconPlus className="size-3.5" />
                </div>
                <span className="font-medium text-muted-foreground">
                  Add organization
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 p-2"
                onClick={() => {
                  void navigator.clipboard.writeText(activeOrg.id).then(
                    () => toast.success("Organization ID copied"),
                    () => toast.error("Could not copy organization ID")
                  )
                }}
              >
                <div className="flex size-6 shrink-0 items-center justify-center rounded-md border bg-background">
                  <IconCopy className="size-3.5" />
                </div>
                <span className="font-medium text-muted-foreground">
                  Copy active org ID
                </span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

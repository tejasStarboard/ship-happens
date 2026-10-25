import { redirect } from "next/navigation"
import type { CSSProperties, ReactNode } from "react"
import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { getSession, listOrganizations } from "@/lib/auth/session"

export default async function AppLayout({
  children,
}: {
  readonly children: ReactNode
}) {
  const session = await getSession()
  if (!session) {
    redirect("/sign-in")
  }
  if (!session.session.activeOrganizationId) {
    redirect("/select-org")
  }

  const orgs = await listOrganizations()
  const activeOrgId = session.session.activeOrganizationId
  const user = session.user

  return (
    <SidebarProvider
      defaultOpen
      style={
        {
          "--sidebar-width": "15.5rem",
          "--sidebar-width-icon": "3.5rem",
          "--header-height": "3rem",
        } as CSSProperties
      }
    >
      <AppSidebar
        collapsible="icon"
        orgs={(orgs ?? []).map((org) => ({
          id: org.id,
          title: org.name,
          slug: org.slug,
          logoUrl: org.logo ?? null,
          isActive: org.id === activeOrgId,
        }))}
        user={{
          name: user.name,
          email: user.email,
          avatar: user.image ?? null,
        }}
      />
      <SidebarInset className="flex max-h-svh flex-col overflow-hidden">
        <SiteHeader />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

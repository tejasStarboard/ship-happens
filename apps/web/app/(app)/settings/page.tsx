import Link from "next/link"
import {
  IconAdjustmentsHorizontal,
  IconChevronRight,
  IconKey,
  IconUser,
  IconUsers,
} from "@tabler/icons-react"
import { PageChrome } from "@/components/shared/page-chrome"
import { getOptionalOrgAdminSession } from "@/lib/auth/session"

const generalLinks = [
  {
    href: "/settings/preferences",
    title: "Preferences",
    description: "Theme and home view for this browser.",
    icon: IconAdjustmentsHorizontal,
  },
  {
    href: "/settings/profile",
    title: "Profile",
    description: "Your name, email, and avatar.",
    icon: IconUser,
  },
  {
    href: "/settings/members",
    title: "Members",
    description: "Invite and manage organization members.",
    icon: IconUsers,
  },
] as const

const adminLinks = [
  {
    href: "/settings/api-keys",
    title: "API keys",
    description: "Agent / sh-client keys for this organization (admin only).",
    icon: IconKey,
  },
] as const

function SettingsLinkList({
  links,
}: {
  links: readonly {
    href: string
    title: string
    description: string
    icon: (typeof generalLinks)[number]["icon"]
  }[]
}) {
  return (
    <div className="overflow-hidden rounded-[6px] border border-border bg-card">
      <div className="divide-y divide-border">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/40"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border">
              <item.icon className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{item.title}</div>
              <div className="truncate text-xs text-muted-foreground">
                {item.description}
              </div>
            </div>
            <IconChevronRight className="size-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  )
}

export default async function SettingsIndexPage() {
  const isAdmin = Boolean(await getOptionalOrgAdminSession())

  return (
    <PageChrome
      title="Settings"
      description="Personal and organization controls."
      className="mx-auto w-full max-w-3xl"
    >
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-xs font-medium text-muted-foreground">
            General
          </h2>
          <SettingsLinkList links={generalLinks} />
        </section>
        {isAdmin ? (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 text-xs font-medium text-muted-foreground">
              Organization admin
            </h2>
            <SettingsLinkList links={adminLinks} />
          </section>
        ) : null}
      </div>
    </PageChrome>
  )
}

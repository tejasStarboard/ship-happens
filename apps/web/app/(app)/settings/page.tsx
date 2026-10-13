import Link from "next/link"
import {
  IconAdjustmentsHorizontal,
  IconChevronRight,
  IconUser,
  IconUsers,
} from "@tabler/icons-react"

const links = [
  {
    href: "/settings/preferences",
    title: "Preferences",
    description: "Theme and display preferences.",
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

export default function SettingsIndexPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6 lg:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your personal and organization settings.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-medium text-muted-foreground">
          General
        </h2>
        <div className="overflow-hidden rounded-lg border">
          <div className="divide-y">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted/40">
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
      </section>
    </div>
  )
}

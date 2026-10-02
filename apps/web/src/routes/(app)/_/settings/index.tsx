import { createFileRoute, Link } from "@tanstack/react-router"
import {
  IconAdjustmentsHorizontal,
  IconChevronRight,
  IconUser,
} from "@tabler/icons-react"
import { pageMeta } from "@/lib/seo"

export const Route = createFileRoute("/(app)/_/settings/")({
  head: () => pageMeta({ title: "Settings", noIndex: true }),
  component: SettingsIndexPage,
})

function SettingsIndexPage() {
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
            <Link
              to="/settings/preferences"
              className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/40"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                <IconAdjustmentsHorizontal className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">Preferences</div>
                <div className="truncate text-xs text-muted-foreground">
                  Display names, theme, and more
                </div>
              </div>
              <IconChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
            <Link
              to="/settings/profile"
              className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/40"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                <IconUser className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">Profile</div>
                <div className="truncate text-xs text-muted-foreground">
                  Name, email, username, and profile picture
                </div>
              </div>
              <IconChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

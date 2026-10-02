import { createFileRoute, Link } from "@tanstack/react-router"
import { PreferencesForm } from "@/components/settings/preferences-form"
import { pageMeta } from "@/lib/seo"

export const Route = createFileRoute("/(app)/_/settings/preferences")({
  head: () => pageMeta({ title: "Preferences", noIndex: true }),
  component: PreferencesSettingsPage,
})

function PreferencesSettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 lg:px-6">
      <div>
        <Link
          to="/settings"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Settings
        </Link>
        <div className="mt-2">
          <h1 className="text-2xl font-semibold tracking-tight">Preferences</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your personal app preferences.
          </p>
        </div>
      </div>

      <PreferencesForm />
    </div>
  )
}

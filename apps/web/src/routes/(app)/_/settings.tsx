import { createFileRoute, Outlet } from "@tanstack/react-router"
import { pageMeta } from "@/lib/seo"

export const Route = createFileRoute("/(app)/_/settings")({
  head: () => pageMeta({ title: "Settings", noIndex: true }),
  component: SettingsLayout,
})

function SettingsLayout() {
  return <Outlet />
}

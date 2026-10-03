import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/(app)/_/templates")({
  component: TemplatesLayout,
})

function TemplatesLayout() {
  return <Outlet />
}

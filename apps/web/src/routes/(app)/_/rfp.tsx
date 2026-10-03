import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/(app)/_/rfp")({
  component: RfpLayout,
})

function RfpLayout() {
  return <Outlet />
}

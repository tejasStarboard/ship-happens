import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/(auth)/_")({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}

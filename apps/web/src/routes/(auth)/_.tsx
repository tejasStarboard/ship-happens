import { createFileRoute, Outlet } from "@tanstack/react-router"
import { AuthPage } from "@/components/auth/auth-shell"

export const Route = createFileRoute("/(auth)/_")({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <AuthPage>
      <Outlet />
    </AuthPage>
  )
}

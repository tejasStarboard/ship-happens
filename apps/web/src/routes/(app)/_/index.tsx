import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/(app)/_/")({
  beforeLoad: () => {
    throw redirect({ to: "/rfp" })
  },
})

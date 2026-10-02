import { createFileRoute } from "@tanstack/react-router"
import { SectionCards } from "@/components/section-cards"
import { pageMeta } from "@/lib/seo"

export const Route = createFileRoute("/(app)/_/")({
  head: () => pageMeta({ title: "Dashboard", noIndex: true }),
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome to Ship Happens — your RFP fill workspace.
          </p>
        </div>
        <SectionCards />
      </div>
    </div>
  )
}

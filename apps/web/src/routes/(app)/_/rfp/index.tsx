import { createFileRoute } from "@tanstack/react-router"
import { RfpsTable } from "@/components/rfp/rfps-table"
import { pageMeta } from "@/lib/seo"

export const Route = createFileRoute("/(app)/_/rfp/")({
  head: () => pageMeta({ title: "RFPs", noIndex: true }),
  component: RfpsPage,
})

function RfpsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <RfpsTable />
    </div>
  )
}

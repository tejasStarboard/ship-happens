import { createFileRoute } from "@tanstack/react-router"
import { TemplatesTable } from "@/components/templates/templates-table"
import { pageMeta } from "@/lib/seo"

export const Route = createFileRoute("/(app)/_/templates/")({
  head: () => pageMeta({ title: "Templates", noIndex: true }),
  component: TemplatesPage,
})

function TemplatesPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <TemplatesTable />
    </div>
  )
}

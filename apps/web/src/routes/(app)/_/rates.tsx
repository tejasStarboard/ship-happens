import { createFileRoute } from "@tanstack/react-router"
import { RatesQuery } from "@/components/rates/rates-query"
import { pageMeta } from "@/lib/seo"

export const Route = createFileRoute("/(app)/_/rates")({
  head: () => pageMeta({ title: "Rates", noIndex: true }),
  component: RatesPage,
})

function RatesPage() {
  return <RatesQuery />
}

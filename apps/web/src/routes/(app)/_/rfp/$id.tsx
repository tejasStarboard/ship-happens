import { createFileRoute, notFound } from "@tanstack/react-router"
import { RfpDetail } from "@/components/rfp/rfp-detail"
import { getMockRfp } from "@/lib/mock/rfps"
import { pageMeta } from "@/lib/seo"

export const Route = createFileRoute("/(app)/_/rfp/$id")({
  loader: ({ params }) => {
    const rfp = getMockRfp(params.id)
    if (!rfp) throw notFound()
    return { rfp }
  },
  head: ({ loaderData }) =>
    pageMeta({
      title: loaderData?.rfp.name ?? "RFP",
      noIndex: true,
    }),
  component: RfpDetailPage,
})

function RfpDetailPage() {
  const { rfp } = Route.useLoaderData()
  return <RfpDetail rfp={rfp} />
}

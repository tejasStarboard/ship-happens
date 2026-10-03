import { createFileRoute, notFound } from "@tanstack/react-router"
import { TemplateDetail } from "@/components/templates/template-detail"
import { getMockTemplate } from "@/lib/mock/templates"
import { pageMeta } from "@/lib/seo"

export const Route = createFileRoute("/(app)/_/templates/$templateId")({
  loader: ({ params }) => {
    const template = getMockTemplate(params.templateId)
    if (!template) throw notFound()
    return { template }
  },
  head: ({ loaderData }) =>
    pageMeta({
      title: loaderData?.template.name ?? "Template",
      noIndex: true,
    }),
  component: TemplateDetailPage,
})

function TemplateDetailPage() {
  const { template } = Route.useLoaderData()
  return <TemplateDetail template={template} />
}

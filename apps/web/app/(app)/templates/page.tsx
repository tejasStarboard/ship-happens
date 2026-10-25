import { TemplatesTable } from "@/components/templates/templates-table"
import { listOrgTemplates } from "@/lib/server/templates"

export default async function TemplatesPage() {
  const templates = await listOrgTemplates()

  return <TemplatesTable templates={templates} />
}

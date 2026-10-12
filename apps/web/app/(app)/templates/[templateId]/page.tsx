import { notFound } from "next/navigation";
import { TemplateDetail } from "@/components/templates/template-detail";
import { getOrgTemplate } from "@/lib/server/templates";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  const template = await getOrgTemplate(templateId);
  if (!template) notFound();
  return <TemplateDetail template={template} />;
}

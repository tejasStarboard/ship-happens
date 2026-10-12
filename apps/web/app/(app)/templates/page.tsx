import { TemplatesTable } from "@/components/templates/templates-table";
import { listOrgTemplates } from "@/lib/server/templates";

export default async function TemplatesPage() {
  const templates = await listOrgTemplates();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto py-4 md:gap-6 md:py-6">
      <TemplatesTable templates={templates} />
    </div>
  );
}

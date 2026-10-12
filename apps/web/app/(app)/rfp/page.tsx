import { RfpsTable } from "@/components/rfp/rfps-table";
import { listOrgRfps } from "@/lib/server/rfps";

export default async function RfpIndexPage() {
  const rfps = await listOrgRfps();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto py-4 md:gap-6 md:py-6">
      <RfpsTable rfps={rfps} />
    </div>
  );
}

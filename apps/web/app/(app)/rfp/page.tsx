import { RfpsTable } from "@/components/rfp/rfps-table"
import { listOrgRfps } from "@/lib/server/rfps"

export default async function RfpIndexPage() {
  const rfps = await listOrgRfps()

  return <RfpsTable rfps={rfps} />
}

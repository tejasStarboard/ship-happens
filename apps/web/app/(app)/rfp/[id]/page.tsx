import { notFound } from "next/navigation"
import { RfpDetail } from "@/components/rfp/rfp-detail"
import { requireOrgSession } from "@/lib/server/session"
import { getOrgRfp } from "@/lib/server/rfps"
import { ensureRfpWorkspace } from "@/lib/workspace-registry"

export default async function RfpDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { organizationId, session } = await requireOrgSession()
  const { id } = await params
  const rfp = await getOrgRfp(id)
  if (!rfp) notFound()

  await ensureRfpWorkspace({
    organizationId,
    ownerUserId: session.user.id,
    rfp: {
      id: rfp.id,
      name: rfp.name,
      customer: rfp.customer,
      status: rfp.status,
    },
  })

  return <RfpDetail rfp={rfp} />
}

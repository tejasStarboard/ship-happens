import { requireOrgSession } from "@/lib/auth/session"
import { createAppContext } from "@/lib/di/create-app-context"
import type { RfpDetailView, RfpListItem } from "@/lib/domain/rfp/rfp.types"

export type {
  RfpDetailView,
  RfpListItem,
  RfpLogView,
  RfpProgressStepView,
  RfpSourceFileView,
  RfpStatus,
} from "@/lib/domain/rfp/rfp.types"

export async function listOrgRfps(): Promise<RfpListItem[]> {
  const { organizationId, session } = await requireOrgSession()
  return createAppContext().rfps.list(
    organizationId,
    session.user.name ?? "Member"
  )
}

export async function getOrgRfp(id: string): Promise<RfpListItem | null> {
  const detail = await getOrgRfpDetail(id)
  if (!detail) return null
  return {
    id: detail.id,
    name: detail.name,
    customer: detail.customer,
    status: detail.status,
    templateName: detail.templateName,
    updatedAt: detail.updatedAt,
    owner: detail.owner,
  }
}

export async function getOrgRfpDetail(
  id: string
): Promise<RfpDetailView | null> {
  const { organizationId, session } = await requireOrgSession()
  return createAppContext().rfps.getDetail(
    organizationId,
    id,
    session.user.name ?? "Member"
  )
}

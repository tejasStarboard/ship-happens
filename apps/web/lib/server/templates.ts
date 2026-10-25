import { requireOrgSession } from "@/lib/auth/session"
import { createAppContext } from "@/lib/di/create-app-context"
import type { TemplateListItem } from "@/lib/domain/templates/template.types"

export type { TemplateListItem }

export async function listOrgTemplates(): Promise<TemplateListItem[]> {
  const { organizationId, session } = await requireOrgSession()
  return createAppContext().templates.list(
    organizationId,
    session.user.name ?? "Member"
  )
}

export async function getOrgTemplate(
  id: string
): Promise<TemplateListItem | null> {
  const { organizationId, session } = await requireOrgSession()
  return createAppContext().templates.get(
    organizationId,
    id,
    session.user.name ?? "Member"
  )
}

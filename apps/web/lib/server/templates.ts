import { and, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { templates } from "@/lib/db/schema"
import type { MockTemplate } from "@/lib/mock/templates"
import { requireOrgSession } from "@/lib/server/session"

export type TemplateListItem = MockTemplate

export async function listOrgTemplates(): Promise<TemplateListItem[]> {
  const { organizationId, session } = await requireOrgSession()

  const rows = await db
    .select()
    .from(templates)
    .where(eq(templates.organizationId, organizationId))
    .orderBy(desc(templates.updatedAt))

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    uploadedAt: row.createdAt.toISOString(),
    uploadedBy: session.user.name ?? "Member",
    customer: row.customer,
    fileUrl: row.fileUrl,
  }))
}

export async function getOrgTemplate(
  id: string
): Promise<TemplateListItem | null> {
  const { organizationId, session } = await requireOrgSession()

  const row = await db
    .select()
    .from(templates)
    .where(
      and(eq(templates.id, id), eq(templates.organizationId, organizationId))
    )
    .limit(1)
    .then((rows) => rows[0] ?? null)

  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    uploadedAt: row.createdAt.toISOString(),
    uploadedBy: session.user.name ?? "Member",
    customer: row.customer,
    fileUrl: row.fileUrl,
  }
}

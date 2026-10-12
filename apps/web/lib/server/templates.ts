import { and, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { templates } from "@/lib/db/schema"
import { MOCK_TEMPLATES, type MockTemplate } from "@/lib/mock/templates"
import { requireOrgSession } from "@/lib/server/session"

export type TemplateListItem = MockTemplate

function demoTemplateId(organizationId: string, mockId: string) {
  return `${mockId}__${organizationId}`
}

async function seedDemoTemplatesIfEmpty(
  organizationId: string,
  uploadedByUserId: string
): Promise<void> {
  const existing = await db
    .select({ id: templates.id })
    .from(templates)
    .where(eq(templates.organizationId, organizationId))
    .limit(1)
  if (existing.length > 0) return

  await db.insert(templates).values(
    MOCK_TEMPLATES.map((template) => ({
      id: demoTemplateId(organizationId, template.id),
      organizationId,
      name: template.name,
      fileName: template.fileName,
      mimeType: template.mimeType,
      sizeBytes: template.sizeBytes,
      fileUrl: template.fileUrl,
      customer: template.customer,
      uploadedByUserId,
      metadata: { demoSeed: true, mockId: template.id },
      createdAt: new Date(template.uploadedAt),
      updatedAt: new Date(template.uploadedAt),
    }))
  )
}

export async function listOrgTemplates(): Promise<TemplateListItem[]> {
  const { organizationId, session } = await requireOrgSession()
  await seedDemoTemplatesIfEmpty(organizationId, session.user.id)

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
  await seedDemoTemplatesIfEmpty(organizationId, session.user.id)

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

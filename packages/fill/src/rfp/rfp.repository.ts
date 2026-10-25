import { and, desc, eq } from "drizzle-orm"
import type { Database } from "@workspace/db"
import { rfpSourceFiles, rfps, templates } from "@workspace/db"

export type AppDb = Database

export class RfpRepository {
  constructor(private readonly db: AppDb) {}

  listByOrganization(organizationId: string) {
    return this.db
      .select({
        id: rfps.id,
        name: rfps.name,
        customer: rfps.customer,
        status: rfps.status,
        metadata: rfps.metadata,
        updatedAt: rfps.updatedAt,
        templateName: templates.name,
        ownerName: rfps.ownerUserId,
        filledFileUrl: rfps.filledFileUrl,
      })
      .from(rfps)
      .leftJoin(templates, eq(rfps.templateId, templates.id))
      .where(eq(rfps.organizationId, organizationId))
      .orderBy(desc(rfps.updatedAt))
  }

  findByIdForOrganization(organizationId: string, id: string) {
    return this.db
      .select({
        id: rfps.id,
        name: rfps.name,
        customer: rfps.customer,
        status: rfps.status,
        metadata: rfps.metadata,
        updatedAt: rfps.updatedAt,
        templateName: templates.name,
        ownerName: rfps.ownerUserId,
        filledFileUrl: rfps.filledFileUrl,
      })
      .from(rfps)
      .leftJoin(templates, eq(rfps.templateId, templates.id))
      .where(and(eq(rfps.id, id), eq(rfps.organizationId, organizationId)))
      .limit(1)
      .then((rows) => rows[0] ?? null)
  }

  listSourceFiles(rfpId: string) {
    return this.db
      .select()
      .from(rfpSourceFiles)
      .where(eq(rfpSourceFiles.rfpId, rfpId))
      .orderBy(desc(rfpSourceFiles.createdAt))
  }

  findTemplateIdForOrganization(organizationId: string, templateId: string) {
    return this.db
      .select({ id: templates.id })
      .from(templates)
      .where(
        and(
          eq(templates.id, templateId),
          eq(templates.organizationId, organizationId)
        )
      )
      .limit(1)
      .then((rows) => rows[0] ?? null)
  }
}

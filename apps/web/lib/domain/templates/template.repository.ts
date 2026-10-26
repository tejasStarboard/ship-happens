import { and, desc, eq } from "drizzle-orm"
import { templates } from "@ship-happens/db"
import type { AppDb } from "@ship-happens/fill"

export class TemplateRepository {
  constructor(private readonly db: AppDb) {}

  listByOrganization(organizationId: string) {
    return this.db
      .select()
      .from(templates)
      .where(eq(templates.organizationId, organizationId))
      .orderBy(desc(templates.updatedAt))
  }

  findByIdForOrganization(organizationId: string, id: string) {
    return this.db
      .select()
      .from(templates)
      .where(
        and(eq(templates.id, id), eq(templates.organizationId, organizationId))
      )
      .limit(1)
      .then((rows) => rows[0] ?? null)
  }
}

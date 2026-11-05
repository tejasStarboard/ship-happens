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

  async updateIdentity(
    organizationId: string,
    id: string,
    input: { name?: string; customer?: string | null }
  ) {
    const patch: {
      name?: string
      customer?: string | null
      updatedAt: Date
    } = { updatedAt: new Date() }
    if (input.name !== undefined) patch.name = input.name
    if (input.customer !== undefined) patch.customer = input.customer
    await this.db
      .update(templates)
      .set(patch)
      .where(
        and(eq(templates.id, id), eq(templates.organizationId, organizationId))
      )
  }

  async deleteForOrganization(organizationId: string, id: string) {
    await this.db
      .delete(templates)
      .where(
        and(eq(templates.id, id), eq(templates.organizationId, organizationId))
      )
  }
}

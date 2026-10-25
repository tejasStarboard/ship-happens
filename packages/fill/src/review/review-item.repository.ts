import { and, asc, desc, eq } from "drizzle-orm"
import { rfpReviewItems } from "@workspace/db"
import type { AppDb } from "../rfp/rfp.repository"
import type { ReviewItemStatus } from "./review-item.types"

export class ReviewItemRepository {
  constructor(private readonly db: AppDb) {}

  insert(row: typeof rfpReviewItems.$inferInsert) {
    return this.db
      .insert(rfpReviewItems)
      .values(row)
      .returning()
      .then((rows) => rows[0]!)
  }

  findByIdForOrganization(organizationId: string, id: string) {
    return this.db
      .select()
      .from(rfpReviewItems)
      .where(
        and(
          eq(rfpReviewItems.id, id),
          eq(rfpReviewItems.organizationId, organizationId)
        )
      )
      .limit(1)
      .then((rows) => rows[0] ?? null)
  }

  findByIdForFill(organizationId: string, rfpId: string, id: string) {
    return this.db
      .select()
      .from(rfpReviewItems)
      .where(
        and(
          eq(rfpReviewItems.id, id),
          eq(rfpReviewItems.rfpId, rfpId),
          eq(rfpReviewItems.organizationId, organizationId)
        )
      )
      .limit(1)
      .then((rows) => rows[0] ?? null)
  }

  listForFill(
    organizationId: string,
    rfpId: string,
    options?: { status?: ReviewItemStatus }
  ) {
    const filters = [
      eq(rfpReviewItems.rfpId, rfpId),
      eq(rfpReviewItems.organizationId, organizationId),
    ]
    if (options?.status) {
      filters.push(eq(rfpReviewItems.status, options.status))
    }
    return this.db
      .select()
      .from(rfpReviewItems)
      .where(and(...filters))
      .orderBy(desc(rfpReviewItems.createdAt), asc(rfpReviewItems.id))
  }

  updateById(id: string, patch: Partial<typeof rfpReviewItems.$inferInsert>) {
    return this.db
      .update(rfpReviewItems)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(rfpReviewItems.id, id))
      .returning()
      .then((rows) => rows[0] ?? null)
  }
}

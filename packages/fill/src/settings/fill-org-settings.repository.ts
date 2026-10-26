import { eq } from "drizzle-orm"
import { fillOrgSettings } from "@ship-happens/db"
import type { AppDb } from "../rfp/rfp.repository"
import {
  DEFAULT_UNEXPECTED_FEE_MODE,
  isUnexpectedFeeMode,
  type UnexpectedFeeMode,
} from "../rates/fee-bindings"
import type { FillOrgSettingsView } from "./fill-org-settings.types"

function toView(row: typeof fillOrgSettings.$inferSelect): FillOrgSettingsView {
  const mode = isUnexpectedFeeMode(row.unexpectedFeeMode)
    ? row.unexpectedFeeMode
    : DEFAULT_UNEXPECTED_FEE_MODE
  return {
    organizationId: row.organizationId,
    unexpectedFeeMode: mode,
    updatedAt: row.updatedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  }
}

export class FillOrgSettingsRepository {
  constructor(private readonly db: AppDb) {}

  async get(organizationId: string): Promise<FillOrgSettingsView | null> {
    const row = await this.db
      .select()
      .from(fillOrgSettings)
      .where(eq(fillOrgSettings.organizationId, organizationId))
      .limit(1)
      .then((rows) => rows[0] ?? null)
    return row ? toView(row) : null
  }

  async upsert(input: {
    organizationId: string
    unexpectedFeeMode: UnexpectedFeeMode
  }): Promise<FillOrgSettingsView> {
    const existing = await this.get(input.organizationId)
    if (existing) {
      await this.db
        .update(fillOrgSettings)
        .set({ unexpectedFeeMode: input.unexpectedFeeMode })
        .where(eq(fillOrgSettings.organizationId, input.organizationId))
    } else {
      await this.db.insert(fillOrgSettings).values({
        organizationId: input.organizationId,
        unexpectedFeeMode: input.unexpectedFeeMode,
      })
    }
    const next = await this.get(input.organizationId)
    if (!next) {
      throw new Error("Failed to persist fill org settings")
    }
    return next
  }
}

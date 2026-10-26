import { relations } from "drizzle-orm"
import { pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { organization } from "./auth"

/**
 * Org-level fill export / fee policy (SB-7088).
 * unexpected_fee_mode: soft_warn (default) | hard_block
 */
export const fillOrgSettings = pgTable("fill_org_settings", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  /** soft_warn | hard_block — how unexpected sell fees gate export. */
  unexpectedFeeMode: text("unexpected_fee_mode").notNull().default("soft_warn"),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const fillOrgSettingsRelations = relations(
  fillOrgSettings,
  ({ one }) => ({
    organization: one(organization, {
      fields: [fillOrgSettings.organizationId],
      references: [organization.id],
    }),
  })
)

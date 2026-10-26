import { relations } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { organization, user } from "./auth"

/**
 * Org / customer floor-margin guardrails (SB-6667).
 * Null customer = org-wide. Customer-specific floors outrank org-wide when
 * both match a fill. At least one of min_amount / min_pct must be set.
 */
export const marginFloorRules = pgTable(
  "margin_floor_rules",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Null = org-wide; otherwise free-text match on `rfps.customer`. */
    customer: text("customer"),
    /** Minimum absolute margin (e.g. 150 for +$150/FEU). */
    minAmount: numeric("min_amount", { precision: 14, scale: 2 }),
    /** Minimum gross margin percent (e.g. 5). */
    minPct: numeric("min_pct", { precision: 8, scale: 4 }),
    currency: text("currency").notNull().default("USD"),
    enabled: boolean("enabled").notNull().default(true),
    /** Higher wins when customer specificity is tied. */
    priority: integer("priority").notNull().default(0),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("margin_floor_rules_organization_id_idx").on(table.organizationId),
    index("margin_floor_rules_org_enabled_idx").on(
      table.organizationId,
      table.enabled
    ),
    index("margin_floor_rules_org_customer_idx").on(
      table.organizationId,
      table.customer
    ),
  ]
)

export const marginFloorRulesRelations = relations(
  marginFloorRules,
  ({ one }) => ({
    organization: one(organization, {
      fields: [marginFloorRules.organizationId],
      references: [organization.id],
    }),
    createdBy: one(user, {
      fields: [marginFloorRules.createdByUserId],
      references: [user.id],
    }),
  })
)

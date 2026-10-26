import { relations } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { organization, user } from "./auth"

/**
 * Org / customer projected overlay + markup rules (SB-6666).
 * Null lane/customer fields act as wildcards. Customer-specific rules
 * outrank org-wide rules when both match a fill.
 */
export const overlayRuleModeEnum = pgEnum("overlay_rule_mode", [
  "projected",
  "markup",
])

export const overlayRules = pgTable(
  "overlay_rules",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Null = org-wide; otherwise free-text match on `rfps.customer`. */
    customer: text("customer"),
    originLocode: text("origin_locode"),
    destLocode: text("dest_locode"),
    equipmentType: text("equipment_type"),
    mode: overlayRuleModeEnum("mode").notNull(),
    /** Absolute projected sell when mode = projected (no Starboard buy). */
    projectedAmount: numeric("projected_amount", { precision: 14, scale: 2 }),
    /** Percent markup when mode = markup (e.g. 5 → +5%). */
    markupPct: numeric("markup_pct", { precision: 8, scale: 4 }),
    /** Absolute markup when mode = markup. */
    markupAmount: numeric("markup_amount", { precision: 14, scale: 2 }),
    currency: text("currency").notNull().default("USD"),
    enabled: boolean("enabled").notNull().default(true),
    /** Higher wins when specificity is tied. */
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
    index("overlay_rules_organization_id_idx").on(table.organizationId),
    index("overlay_rules_org_enabled_idx").on(
      table.organizationId,
      table.enabled
    ),
    index("overlay_rules_org_customer_idx").on(
      table.organizationId,
      table.customer
    ),
  ]
)

export const overlayRulesRelations = relations(overlayRules, ({ one }) => ({
  organization: one(organization, {
    fields: [overlayRules.organizationId],
    references: [organization.id],
  }),
  createdBy: one(user, {
    fields: [overlayRules.createdByUserId],
    references: [user.id],
  }),
}))

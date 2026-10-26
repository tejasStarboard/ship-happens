import { relations } from "drizzle-orm"
import {
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { organization, user } from "./auth"
import { rfps } from "./rfp"

export const emailProviderEnum = pgEnum("email_provider", ["gmail", "outlook"])

export const emailIntegrationStatusEnum = pgEnum("email_integration_status", [
  "active",
  "error",
  "disconnected",
])

export const emailIntakeMessageStatusEnum = pgEnum(
  "email_intake_message_status",
  ["pending", "skipped", "created", "failed", "unsupported"]
)

export const emailIntakeClassificationEnum = pgEnum(
  "email_intake_classification",
  ["relevant", "not_relevant"]
)

/** Per-org mailbox connection (one row per provider). */
export const emailIntegrations = pgTable(
  "email_integrations",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    provider: emailProviderEnum("provider").notNull(),
    accountEmail: text("account_email").notNull(),
    /** AES-GCM ciphertext (base64) — never expose to client. */
    accessTokenEnc: text("access_token_enc").notNull(),
    refreshTokenEnc: text("refresh_token_enc"),
    tokenExpiresAt: timestamp("token_expires_at"),
    scopes: text("scopes").notNull().default(""),
    watchExpiresAt: timestamp("watch_expires_at"),
    /** Gmail history id or Graph subscription id. */
    externalSubscriptionId: text("external_subscription_id"),
    /** Gmail users.watch historyId cursor. */
    historyId: text("history_id"),
    status: emailIntegrationStatusEnum("status").notNull().default("active"),
    connectedByUserId: text("connected_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    lastError: text("last_error"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("email_integrations_org_provider_uidx").on(
      table.organizationId,
      table.provider
    ),
    index("email_integrations_organization_id_idx").on(table.organizationId),
    index("email_integrations_account_email_idx").on(table.accountEmail),
    index("email_integrations_external_subscription_idx").on(
      table.externalSubscriptionId
    ),
  ]
)

/** Idempotent audit of inbound messages considered for intake. */
export const emailIntakeMessages = pgTable(
  "email_intake_messages",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    integrationId: text("integration_id")
      .notNull()
      .references(() => emailIntegrations.id, { onDelete: "cascade" }),
    providerMessageId: text("provider_message_id").notNull(),
    threadId: text("thread_id"),
    subject: text("subject"),
    fromAddress: text("from_address"),
    receivedAt: timestamp("received_at"),
    classification: emailIntakeClassificationEnum("classification"),
    classificationConfidence: numeric("classification_confidence", {
      precision: 6,
      scale: 4,
    }),
    jevRaw: jsonb("jev_raw").$type<Record<string, unknown>>(),
    status: emailIntakeMessageStatusEnum("status").notNull().default("pending"),
    fillId: text("fill_id").references(() => rfps.id, { onDelete: "set null" }),
    errorMessage: text("error_message"),
    attachmentSummary: jsonb("attachment_summary")
      .$type<
        Array<{ fileName: string; mimeType: string; sizeBytes?: number }>
      >()
      .default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("email_intake_messages_integration_msg_uidx").on(
      table.integrationId,
      table.providerMessageId
    ),
    index("email_intake_messages_organization_id_idx").on(table.organizationId),
    index("email_intake_messages_fill_id_idx").on(table.fillId),
    index("email_intake_messages_status_idx").on(table.status),
  ]
)

export const emailIntegrationsRelations = relations(
  emailIntegrations,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [emailIntegrations.organizationId],
      references: [organization.id],
    }),
    connectedBy: one(user, {
      fields: [emailIntegrations.connectedByUserId],
      references: [user.id],
    }),
    messages: many(emailIntakeMessages),
  })
)

export const emailIntakeMessagesRelations = relations(
  emailIntakeMessages,
  ({ one }) => ({
    organization: one(organization, {
      fields: [emailIntakeMessages.organizationId],
      references: [organization.id],
    }),
    integration: one(emailIntegrations, {
      fields: [emailIntakeMessages.integrationId],
      references: [emailIntegrations.id],
    }),
    fill: one(rfps, {
      fields: [emailIntakeMessages.fillId],
      references: [rfps.id],
    }),
  })
)

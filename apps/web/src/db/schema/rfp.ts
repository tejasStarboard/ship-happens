import { relations } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import type { UIMessage } from "ai"
import { organization, user } from "./auth"

/**
 * RFP fill domain + AI SDK v7 chat persistence.
 *
 * Messages follow AI SDK UIMessage shape (`id`, `role`, `parts`, optional
 * `metadata`) so they round-trip with `useChat` / `validateUIMessages`.
 *
 * Stream resume uses Redis via `resumable-stream` + `activeStreamId` on the
 * chat row — not per-chunk DB events.
 * @see https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-resume-streams
 */

export const rfpStatusEnum = pgEnum("rfp_status", [
  "queued",
  "running",
  "needs_review",
  "done",
  "failed",
  "cancelled",
])

export const rfpProgressStatusEnum = pgEnum("rfp_progress_status", [
  "pending",
  "running",
  "done",
  "failed",
  "skipped",
])

export const rfpLogLevelEnum = pgEnum("rfp_log_level", [
  "debug",
  "info",
  "warn",
  "error",
])

export const fillCellOutcomeEnum = pgEnum("fill_cell_outcome", [
  "filled",
  "skipped",
  "needs_human",
  "error",
])

export const agentMessageRoleEnum = pgEnum("agent_message_role", [
  "system",
  "user",
  "assistant",
])

/** Uploaded bid-sheet templates (Blob-backed). */
export const templates = pgTable(
  "templates",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    /** Public or signed Blob URL for Office viewer / download. */
    fileUrl: text("file_url").notNull(),
    /** Vercel Blob pathname / store key when applicable. */
    blobPathname: text("blob_pathname"),
    customer: text("customer"),
    uploadedByUserId: text("uploaded_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("templates_organization_id_idx").on(table.organizationId),
    index("templates_organization_updated_idx").on(
      table.organizationId,
      table.updatedAt
    ),
  ]
)

/** One fill job / RFP run. */
export const rfps = pgTable(
  "rfps",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    templateId: text("template_id").references(() => templates.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    customer: text("customer"),
    status: rfpStatusEnum("status").notNull().default("queued"),
    /** Filled workbook Blob URL when available. */
    filledFileUrl: text("filled_file_url"),
    filledBlobPathname: text("filled_blob_pathname"),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    /** Inngest run / event ids for ops correlation. */
    inngestRunId: text("inngest_run_id"),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("rfps_organization_id_idx").on(table.organizationId),
    index("rfps_organization_status_idx").on(
      table.organizationId,
      table.status
    ),
    index("rfps_organization_updated_idx").on(
      table.organizationId,
      table.updatedAt
    ),
    index("rfps_template_id_idx").on(table.templateId),
  ]
)

/** Ordered high-level pipeline stages for the Progress tab. */
export const rfpProgressSteps = pgTable(
  "rfp_progress_steps",
  {
    id: text("id").primaryKey(),
    rfpId: text("rfp_id")
      .notNull()
      .references(() => rfps.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    status: rfpProgressStatusEnum("status").notNull().default("pending"),
    sortOrder: integer("sort_order").notNull().default(0),
    detail: text("detail"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("rfp_progress_steps_rfp_id_idx").on(table.rfpId),
    uniqueIndex("rfp_progress_steps_rfp_key_uidx").on(table.rfpId, table.key),
  ]
)

/** Append-only run logs (Logs tab / Inngest / sandbox). */
export const rfpLogs = pgTable(
  "rfp_logs",
  {
    id: text("id").primaryKey(),
    rfpId: text("rfp_id")
      .notNull()
      .references(() => rfps.id, { onDelete: "cascade" }),
    level: rfpLogLevelEnum("level").notNull().default("info"),
    message: text("message").notNull(),
    stepKey: text("step_key"),
    source: text("source"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("rfp_logs_rfp_id_idx").on(table.rfpId),
    index("rfp_logs_rfp_created_idx").on(table.rfpId, table.createdAt),
  ]
)

/** Aggregate fill report for an RFP (1:1). */
export const rfpFillReports = pgTable(
  "rfp_fill_reports",
  {
    id: text("id").primaryKey(),
    rfpId: text("rfp_id")
      .notNull()
      .references(() => rfps.id, { onDelete: "cascade" })
      .unique(),
    filledCount: integer("filled_count").notNull().default(0),
    skippedCount: integer("skipped_count").notNull().default(0),
    needsHumanCount: integer("needs_human_count").notNull().default(0),
    errorCount: integer("error_count").notNull().default(0),
    summary: text("summary"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("rfp_fill_reports_rfp_id_idx").on(table.rfpId)]
)

/** Cell-level fill outcomes. */
export const rfpFillReportCells = pgTable(
  "rfp_fill_report_cells",
  {
    id: text("id").primaryKey(),
    reportId: text("report_id")
      .notNull()
      .references(() => rfpFillReports.id, { onDelete: "cascade" }),
    sheetName: text("sheet_name"),
    cellRef: text("cell_ref"),
    rowIndex: integer("row_index"),
    columnKey: text("column_key"),
    outcome: fillCellOutcomeEnum("outcome").notNull(),
    value: text("value"),
    reason: text("reason"),
    confidence: numeric("confidence", { precision: 5, scale: 4 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("rfp_fill_report_cells_report_id_idx").on(table.reportId),
    index("rfp_fill_report_cells_outcome_idx").on(
      table.reportId,
      table.outcome
    ),
  ]
)

/**
 * Agent chat thread for an RFP (1:1).
 * Active SSE stream bytes live in Redis (`resumable-stream`); Postgres only
 * stores the pointer (`activeStreamId`) plus completed UIMessages.
 */
export const rfpChats = pgTable(
  "rfp_chats",
  {
    id: text("id").primaryKey(),
    rfpId: text("rfp_id")
      .notNull()
      .references(() => rfps.id, { onDelete: "cascade" })
      .unique(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Fill agent"),
    /**
     * Redis stream id while a generation is in flight (AI SDK resume).
     * Cleared to null when the stream ends or is explicitly stopped.
     */
    activeStreamId: text("active_stream_id"),
    /** Opaque agent/runtime state (Inngest run cursor, tool context, etc.). */
    agentSession: jsonb("agent_session").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("rfp_chats_organization_id_idx").on(table.organizationId),
    index("rfp_chats_rfp_id_idx").on(table.rfpId),
  ]
)

/**
 * Persisted AI SDK UIMessages.
 * Store `parts` (not flattened text) so tool calls / data parts survive reload.
 */
export const rfpMessages = pgTable(
  "rfp_messages",
  {
    id: text("id").primaryKey(),
    chatId: text("chat_id")
      .notNull()
      .references(() => rfpChats.id, { onDelete: "cascade" }),
    role: agentMessageRoleEnum("role").notNull(),
    /** AI SDK UIMessage.parts — text, tool-*, reasoning, file, data-*, etc. */
    parts: jsonb("parts").$type<UIMessage["parts"]>().notNull(),
    /** Optional UIMessage.metadata (custom). */
    metadata: jsonb("metadata").$type<UIMessage["metadata"]>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("rfp_messages_chat_id_idx").on(table.chatId),
    index("rfp_messages_chat_created_idx").on(table.chatId, table.createdAt),
  ]
)

/** Optional message feedback (ai-chatbot Vote pattern). */
export const rfpMessageVotes = pgTable(
  "rfp_message_votes",
  {
    chatId: text("chat_id")
      .notNull()
      .references(() => rfpChats.id, { onDelete: "cascade" }),
    messageId: text("message_id")
      .notNull()
      .references(() => rfpMessages.id, { onDelete: "cascade" }),
    isUpvoted: boolean("is_upvoted").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("rfp_message_votes_pk").on(
      table.chatId,
      table.messageId,
      table.userId
    ),
  ]
)

// --- Relations ----------------------------------------------------------------

export const templatesRelations = relations(templates, ({ one, many }) => ({
  organization: one(organization, {
    fields: [templates.organizationId],
    references: [organization.id],
  }),
  uploadedBy: one(user, {
    fields: [templates.uploadedByUserId],
    references: [user.id],
  }),
  rfps: many(rfps),
}))

export const rfpsRelations = relations(rfps, ({ one, many }) => ({
  organization: one(organization, {
    fields: [rfps.organizationId],
    references: [organization.id],
  }),
  template: one(templates, {
    fields: [rfps.templateId],
    references: [templates.id],
  }),
  owner: one(user, {
    fields: [rfps.ownerUserId],
    references: [user.id],
  }),
  progressSteps: many(rfpProgressSteps),
  logs: many(rfpLogs),
  fillReport: one(rfpFillReports),
  chat: one(rfpChats),
}))

export const rfpProgressStepsRelations = relations(
  rfpProgressSteps,
  ({ one }) => ({
    rfp: one(rfps, {
      fields: [rfpProgressSteps.rfpId],
      references: [rfps.id],
    }),
  })
)

export const rfpLogsRelations = relations(rfpLogs, ({ one }) => ({
  rfp: one(rfps, {
    fields: [rfpLogs.rfpId],
    references: [rfps.id],
  }),
}))

export const rfpFillReportsRelations = relations(
  rfpFillReports,
  ({ one, many }) => ({
    rfp: one(rfps, {
      fields: [rfpFillReports.rfpId],
      references: [rfps.id],
    }),
    cells: many(rfpFillReportCells),
  })
)

export const rfpFillReportCellsRelations = relations(
  rfpFillReportCells,
  ({ one }) => ({
    report: one(rfpFillReports, {
      fields: [rfpFillReportCells.reportId],
      references: [rfpFillReports.id],
    }),
  })
)

export const rfpChatsRelations = relations(rfpChats, ({ one, many }) => ({
  rfp: one(rfps, {
    fields: [rfpChats.rfpId],
    references: [rfps.id],
  }),
  organization: one(organization, {
    fields: [rfpChats.organizationId],
    references: [organization.id],
  }),
  messages: many(rfpMessages),
  votes: many(rfpMessageVotes),
}))

export const rfpMessagesRelations = relations(rfpMessages, ({ one, many }) => ({
  chat: one(rfpChats, {
    fields: [rfpMessages.chatId],
    references: [rfpChats.id],
  }),
  votes: many(rfpMessageVotes),
}))

export const rfpMessageVotesRelations = relations(
  rfpMessageVotes,
  ({ one }) => ({
    chat: one(rfpChats, {
      fields: [rfpMessageVotes.chatId],
      references: [rfpChats.id],
    }),
    message: one(rfpMessages, {
      fields: [rfpMessageVotes.messageId],
      references: [rfpMessages.id],
    }),
    user: one(user, {
      fields: [rfpMessageVotes.userId],
      references: [user.id],
    }),
  })
)

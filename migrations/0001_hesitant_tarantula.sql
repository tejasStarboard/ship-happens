CREATE TYPE "public"."agent_message_role" AS ENUM('system', 'user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."fill_cell_outcome" AS ENUM('filled', 'skipped', 'needs_human', 'error');--> statement-breakpoint
CREATE TYPE "public"."rfp_log_level" AS ENUM('debug', 'info', 'warn', 'error');--> statement-breakpoint
CREATE TYPE "public"."rfp_progress_status" AS ENUM('pending', 'running', 'done', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."rfp_status" AS ENUM('queued', 'running', 'needs_review', 'done', 'failed', 'cancelled');--> statement-breakpoint
CREATE TABLE "rfp_chats" (
	"id" text PRIMARY KEY NOT NULL,
	"rfp_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"title" text DEFAULT 'Fill agent' NOT NULL,
	"active_stream_id" text,
	"agent_session" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rfp_chats_rfp_id_unique" UNIQUE("rfp_id")
);
--> statement-breakpoint
CREATE TABLE "rfp_fill_report_cells" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"sheet_name" text,
	"cell_ref" text,
	"row_index" integer,
	"column_key" text,
	"outcome" "fill_cell_outcome" NOT NULL,
	"value" text,
	"reason" text,
	"confidence" numeric(5, 4),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfp_fill_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"rfp_id" text NOT NULL,
	"filled_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"needs_human_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"summary" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rfp_fill_reports_rfp_id_unique" UNIQUE("rfp_id")
);
--> statement-breakpoint
CREATE TABLE "rfp_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"rfp_id" text NOT NULL,
	"level" "rfp_log_level" DEFAULT 'info' NOT NULL,
	"message" text NOT NULL,
	"step_key" text,
	"source" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfp_message_votes" (
	"chat_id" text NOT NULL,
	"message_id" text NOT NULL,
	"is_upvoted" boolean NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfp_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"role" "agent_message_role" NOT NULL,
	"parts" jsonb NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfp_progress_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"rfp_id" text NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"status" "rfp_progress_status" DEFAULT 'pending' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"detail" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfps" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"template_id" text,
	"name" text NOT NULL,
	"customer" text,
	"status" "rfp_status" DEFAULT 'queued' NOT NULL,
	"filled_file_url" text,
	"filled_blob_pathname" text,
	"owner_user_id" text NOT NULL,
	"inngest_run_id" text,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"file_url" text NOT NULL,
	"blob_pathname" text,
	"customer" text,
	"uploaded_by_user_id" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rfp_chats" ADD CONSTRAINT "rfp_chats_rfp_id_rfps_id_fk" FOREIGN KEY ("rfp_id") REFERENCES "public"."rfps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfp_chats" ADD CONSTRAINT "rfp_chats_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfp_fill_report_cells" ADD CONSTRAINT "rfp_fill_report_cells_report_id_rfp_fill_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."rfp_fill_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfp_fill_reports" ADD CONSTRAINT "rfp_fill_reports_rfp_id_rfps_id_fk" FOREIGN KEY ("rfp_id") REFERENCES "public"."rfps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfp_logs" ADD CONSTRAINT "rfp_logs_rfp_id_rfps_id_fk" FOREIGN KEY ("rfp_id") REFERENCES "public"."rfps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfp_message_votes" ADD CONSTRAINT "rfp_message_votes_chat_id_rfp_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."rfp_chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfp_message_votes" ADD CONSTRAINT "rfp_message_votes_message_id_rfp_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."rfp_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfp_message_votes" ADD CONSTRAINT "rfp_message_votes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfp_messages" ADD CONSTRAINT "rfp_messages_chat_id_rfp_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."rfp_chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfp_progress_steps" ADD CONSTRAINT "rfp_progress_steps_rfp_id_rfps_id_fk" FOREIGN KEY ("rfp_id") REFERENCES "public"."rfps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfps" ADD CONSTRAINT "rfps_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfps" ADD CONSTRAINT "rfps_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfps" ADD CONSTRAINT "rfps_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rfp_chats_organization_id_idx" ON "rfp_chats" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "rfp_chats_rfp_id_idx" ON "rfp_chats" USING btree ("rfp_id");--> statement-breakpoint
CREATE INDEX "rfp_fill_report_cells_report_id_idx" ON "rfp_fill_report_cells" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "rfp_fill_report_cells_outcome_idx" ON "rfp_fill_report_cells" USING btree ("report_id","outcome");--> statement-breakpoint
CREATE INDEX "rfp_fill_reports_rfp_id_idx" ON "rfp_fill_reports" USING btree ("rfp_id");--> statement-breakpoint
CREATE INDEX "rfp_logs_rfp_id_idx" ON "rfp_logs" USING btree ("rfp_id");--> statement-breakpoint
CREATE INDEX "rfp_logs_rfp_created_idx" ON "rfp_logs" USING btree ("rfp_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rfp_message_votes_pk" ON "rfp_message_votes" USING btree ("chat_id","message_id","user_id");--> statement-breakpoint
CREATE INDEX "rfp_messages_chat_id_idx" ON "rfp_messages" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "rfp_messages_chat_created_idx" ON "rfp_messages" USING btree ("chat_id","created_at");--> statement-breakpoint
CREATE INDEX "rfp_progress_steps_rfp_id_idx" ON "rfp_progress_steps" USING btree ("rfp_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rfp_progress_steps_rfp_key_uidx" ON "rfp_progress_steps" USING btree ("rfp_id","key");--> statement-breakpoint
CREATE INDEX "rfps_organization_id_idx" ON "rfps" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "rfps_organization_status_idx" ON "rfps" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "rfps_organization_updated_idx" ON "rfps" USING btree ("organization_id","updated_at");--> statement-breakpoint
CREATE INDEX "rfps_template_id_idx" ON "rfps" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "templates_organization_id_idx" ON "templates" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "templates_organization_updated_idx" ON "templates" USING btree ("organization_id","updated_at");
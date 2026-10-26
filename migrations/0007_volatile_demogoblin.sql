CREATE TYPE "public"."email_intake_classification" AS ENUM('relevant', 'not_relevant');--> statement-breakpoint
CREATE TYPE "public"."email_intake_message_status" AS ENUM('pending', 'skipped', 'created', 'failed', 'unsupported');--> statement-breakpoint
CREATE TYPE "public"."email_integration_status" AS ENUM('active', 'error', 'disconnected');--> statement-breakpoint
CREATE TYPE "public"."email_provider" AS ENUM('gmail', 'outlook');--> statement-breakpoint
CREATE TABLE "email_intake_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"integration_id" text NOT NULL,
	"provider_message_id" text NOT NULL,
	"thread_id" text,
	"subject" text,
	"from_address" text,
	"received_at" timestamp,
	"classification" "email_intake_classification",
	"classification_confidence" numeric(6, 4),
	"jev_raw" jsonb,
	"status" "email_intake_message_status" DEFAULT 'pending' NOT NULL,
	"fill_id" text,
	"error_message" text,
	"attachment_summary" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_integrations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"provider" "email_provider" NOT NULL,
	"account_email" text NOT NULL,
	"access_token_enc" text NOT NULL,
	"refresh_token_enc" text,
	"token_expires_at" timestamp,
	"scopes" text DEFAULT '' NOT NULL,
	"watch_expires_at" timestamp,
	"external_subscription_id" text,
	"history_id" text,
	"status" "email_integration_status" DEFAULT 'active' NOT NULL,
	"connected_by_user_id" text NOT NULL,
	"last_error" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_intake_messages" ADD CONSTRAINT "email_intake_messages_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_intake_messages" ADD CONSTRAINT "email_intake_messages_integration_id_email_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."email_integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_intake_messages" ADD CONSTRAINT "email_intake_messages_fill_id_rfps_id_fk" FOREIGN KEY ("fill_id") REFERENCES "public"."rfps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_integrations" ADD CONSTRAINT "email_integrations_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_integrations" ADD CONSTRAINT "email_integrations_connected_by_user_id_user_id_fk" FOREIGN KEY ("connected_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_intake_messages_integration_msg_uidx" ON "email_intake_messages" USING btree ("integration_id","provider_message_id");--> statement-breakpoint
CREATE INDEX "email_intake_messages_organization_id_idx" ON "email_intake_messages" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "email_intake_messages_fill_id_idx" ON "email_intake_messages" USING btree ("fill_id");--> statement-breakpoint
CREATE INDEX "email_intake_messages_status_idx" ON "email_intake_messages" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "email_integrations_org_provider_uidx" ON "email_integrations" USING btree ("organization_id","provider");--> statement-breakpoint
CREATE INDEX "email_integrations_organization_id_idx" ON "email_integrations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "email_integrations_account_email_idx" ON "email_integrations" USING btree ("account_email");--> statement-breakpoint
CREATE INDEX "email_integrations_external_subscription_idx" ON "email_integrations" USING btree ("external_subscription_id");
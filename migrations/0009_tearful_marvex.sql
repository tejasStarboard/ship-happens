CREATE TYPE "public"."rfp_bid_outcome" AS ENUM('won', 'lost', 'closed', 'expired');--> statement-breakpoint
CREATE TABLE "fill_org_settings" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"unexpected_fee_mode" text DEFAULT 'soft_warn' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rfps" ADD COLUMN "due_at" timestamp;--> statement-breakpoint
ALTER TABLE "rfps" ADD COLUMN "bid_outcome" "rfp_bid_outcome";--> statement-breakpoint
ALTER TABLE "rfps" ADD COLUMN "decided_at" timestamp;--> statement-breakpoint
ALTER TABLE "rfps" ADD COLUMN "decided_by_user_id" text;--> statement-breakpoint
ALTER TABLE "fill_org_settings" ADD CONSTRAINT "fill_org_settings_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfps" ADD CONSTRAINT "rfps_decided_by_user_id_user_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rfps_organization_due_at_idx" ON "rfps" USING btree ("organization_id","due_at");--> statement-breakpoint
CREATE INDEX "rfps_organization_bid_outcome_idx" ON "rfps" USING btree ("organization_id","bid_outcome");
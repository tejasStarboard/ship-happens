CREATE TYPE "public"."rfp_review_item_status" AS ENUM('pending', 'approved', 'edited', 'rejected', 'resolved');--> statement-breakpoint
CREATE TABLE "rfp_review_items" (
	"id" text PRIMARY KEY NOT NULL,
	"rfp_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"step_key" text,
	"title" text NOT NULL,
	"status" "rfp_review_item_status" DEFAULT 'pending' NOT NULL,
	"proposal" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"confidence" numeric(5, 4),
	"source" text,
	"source_metadata" jsonb DEFAULT '{}'::jsonb,
	"decided_by_user_id" text,
	"decided_at" timestamp,
	"decision_note" text,
	"resolution" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rfp_chats" DROP CONSTRAINT "rfp_chats_rfp_id_unique";--> statement-breakpoint
ALTER TABLE "rfp_review_items" ADD CONSTRAINT "rfp_review_items_rfp_id_rfps_id_fk" FOREIGN KEY ("rfp_id") REFERENCES "public"."rfps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfp_review_items" ADD CONSTRAINT "rfp_review_items_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfp_review_items" ADD CONSTRAINT "rfp_review_items_decided_by_user_id_user_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rfp_review_items_rfp_id_idx" ON "rfp_review_items" USING btree ("rfp_id");--> statement-breakpoint
CREATE INDEX "rfp_review_items_organization_status_idx" ON "rfp_review_items" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "rfp_review_items_rfp_status_idx" ON "rfp_review_items" USING btree ("rfp_id","status");--> statement-breakpoint
CREATE INDEX "rfp_review_items_rfp_step_key_idx" ON "rfp_review_items" USING btree ("rfp_id","step_key");
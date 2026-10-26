CREATE TYPE "public"."overlay_rule_mode" AS ENUM('projected', 'markup');--> statement-breakpoint
CREATE TABLE "overlay_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"customer" text,
	"origin_locode" text,
	"dest_locode" text,
	"equipment_type" text,
	"mode" "overlay_rule_mode" NOT NULL,
	"projected_amount" numeric(14, 2),
	"markup_pct" numeric(8, 4),
	"markup_amount" numeric(14, 2),
	"currency" text DEFAULT 'USD' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "overlay_rules" ADD CONSTRAINT "overlay_rules_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overlay_rules" ADD CONSTRAINT "overlay_rules_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "overlay_rules_organization_id_idx" ON "overlay_rules" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "overlay_rules_org_enabled_idx" ON "overlay_rules" USING btree ("organization_id","enabled");--> statement-breakpoint
CREATE INDEX "overlay_rules_org_customer_idx" ON "overlay_rules" USING btree ("organization_id","customer");
CREATE TABLE "rfp_mapped_lanes" (
	"id" text PRIMARY KEY NOT NULL,
	"rfp_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"lane_id" text NOT NULL,
	"origin_locode" text NOT NULL,
	"dest_locode" text NOT NULL,
	"equipment_type" text NOT NULL,
	"valid_from" text,
	"valid_to" text,
	"service_type" text,
	"sheet_name" text,
	"row_index" integer,
	"column_key" text,
	"cell_ref" text,
	"surcharge_slots" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "margin_floor_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"customer" text,
	"min_amount" numeric(14, 2),
	"min_pct" numeric(8, 4),
	"currency" text DEFAULT 'USD' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rfp_mapped_lanes" ADD CONSTRAINT "rfp_mapped_lanes_rfp_id_rfps_id_fk" FOREIGN KEY ("rfp_id") REFERENCES "public"."rfps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfp_mapped_lanes" ADD CONSTRAINT "rfp_mapped_lanes_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "margin_floor_rules" ADD CONSTRAINT "margin_floor_rules_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "margin_floor_rules" ADD CONSTRAINT "margin_floor_rules_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rfp_mapped_lanes_rfp_id_idx" ON "rfp_mapped_lanes" USING btree ("rfp_id");--> statement-breakpoint
CREATE INDEX "rfp_mapped_lanes_organization_id_idx" ON "rfp_mapped_lanes" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rfp_mapped_lanes_rfp_lane_uidx" ON "rfp_mapped_lanes" USING btree ("rfp_id","lane_id");--> statement-breakpoint
CREATE INDEX "margin_floor_rules_organization_id_idx" ON "margin_floor_rules" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "margin_floor_rules_org_enabled_idx" ON "margin_floor_rules" USING btree ("organization_id","enabled");--> statement-breakpoint
CREATE INDEX "margin_floor_rules_org_customer_idx" ON "margin_floor_rules" USING btree ("organization_id","customer");
CREATE TABLE "fill_pipeline_events" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"rfp_id" text NOT NULL,
	"type" text NOT NULL,
	"step_key" text,
	"review_item_id" text,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fill_pipeline_events" ADD CONSTRAINT "fill_pipeline_events_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fill_pipeline_events" ADD CONSTRAINT "fill_pipeline_events_rfp_id_rfps_id_fk" FOREIGN KEY ("rfp_id") REFERENCES "public"."rfps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fill_pipeline_events_org_occurred_idx" ON "fill_pipeline_events" USING btree ("organization_id","occurred_at");--> statement-breakpoint
CREATE INDEX "fill_pipeline_events_org_type_idx" ON "fill_pipeline_events" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "fill_pipeline_events_rfp_id_idx" ON "fill_pipeline_events" USING btree ("rfp_id");
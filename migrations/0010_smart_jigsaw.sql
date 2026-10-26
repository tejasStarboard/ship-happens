ALTER TABLE "rfps" ADD COLUMN "parent_rfp_id" text;--> statement-breakpoint
ALTER TABLE "rfps" ADD COLUMN "round_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "rfps" ADD CONSTRAINT "rfps_parent_rfp_id_rfps_id_fk" FOREIGN KEY ("parent_rfp_id") REFERENCES "public"."rfps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rfps_organization_parent_rfp_idx" ON "rfps" USING btree ("organization_id","parent_rfp_id");
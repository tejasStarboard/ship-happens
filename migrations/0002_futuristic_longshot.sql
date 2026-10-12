CREATE TABLE "rfp_source_files" (
	"id" text PRIMARY KEY NOT NULL,
	"rfp_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"file_url" text NOT NULL,
	"blob_pathname" text,
	"checksum_sha256" text,
	"sheet_names" jsonb DEFAULT '[]'::jsonb,
	"parse_metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rfp_source_files" ADD CONSTRAINT "rfp_source_files_rfp_id_rfps_id_fk" FOREIGN KEY ("rfp_id") REFERENCES "public"."rfps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfp_source_files" ADD CONSTRAINT "rfp_source_files_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rfp_source_files_rfp_id_idx" ON "rfp_source_files" USING btree ("rfp_id");--> statement-breakpoint
CREATE INDEX "rfp_source_files_organization_id_idx" ON "rfp_source_files" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "rfps" DROP COLUMN "inngest_run_id";
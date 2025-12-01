CREATE TABLE "model_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sync_id" uuid NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" text DEFAULT 'models.dev' NOT NULL,
	"model_data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_syncs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"status" text DEFAULT 'running' NOT NULL,
	"total_fetched" integer,
	"total_stored" integer,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_model_snapshots_sync_id" ON "model_snapshots" USING btree ("sync_id");--> statement-breakpoint
CREATE INDEX "idx_model_snapshots_synced_at" ON "model_snapshots" USING btree ("synced_at");--> statement-breakpoint
CREATE INDEX "idx_model_snapshots_source" ON "model_snapshots" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_model_snapshots_sync_source" ON "model_snapshots" USING btree ("sync_id","source");--> statement-breakpoint
CREATE INDEX "idx_model_snapshots_created_at" ON "model_snapshots" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_model_syncs_status" ON "model_syncs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_model_syncs_started_at" ON "model_syncs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "idx_model_syncs_completed_at" ON "model_syncs" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "idx_model_syncs_status_completed" ON "model_syncs" USING btree ("status","completed_at");--> statement-breakpoint
CREATE INDEX "idx_model_syncs_started_created" ON "model_syncs" USING btree ("started_at","created_at");
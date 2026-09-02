DROP INDEX IF EXISTS "candidates_drive_cv_id_idx";--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "external_ref" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "candidates_external_ref_idx" ON "candidates" USING btree ("external_ref");--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "external_ref" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "exam_registration" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "applications_external_ref_idx" ON "applications" USING btree ("external_ref");--> statement-breakpoint
ALTER TABLE "teaching_practice_scores" ADD COLUMN IF NOT EXISTS "raw_response" numeric(8, 4);--> statement-breakpoint
ALTER TABLE "teaching_practice_scores" ADD COLUMN IF NOT EXISTS "weight" numeric(8, 4);--> statement-breakpoint
ALTER TABLE "teaching_practice_scores" ADD COLUMN IF NOT EXISTS "direction" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "teaching_practice_scores_app_practice_idx" ON "teaching_practice_scores" USING btree ("application_id","practice_code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "imported_dimension_scores_app_dim_idx" ON "imported_dimension_scores" USING btree ("application_id","dimension_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "lesson_test_evaluations_app_evaluator_idx" ON "lesson_test_evaluations" USING btree ("application_id","evaluator_staff_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "second_phase_confirmations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"external_ref" text NOT NULL,
	"exam_choice" text NOT NULL,
	"confirmed_at" timestamp with time zone,
	"email_diverged" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "second_phase_confirmations" ADD CONSTRAINT "second_phase_confirmations_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "second_phase_confirmations" ADD CONSTRAINT "second_phase_confirmations_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "second_phase_confirmations_campaign_id_idx" ON "second_phase_confirmations" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "second_phase_confirmations_candidate_id_idx" ON "second_phase_confirmations" USING btree ("candidate_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "second_phase_confirmations_external_ref_idx" ON "second_phase_confirmations" USING btree ("external_ref");

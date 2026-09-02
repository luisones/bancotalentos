CREATE INDEX "application_interests_application_id_idx" ON "application_interests" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "application_potentials_application_id_idx" ON "application_potentials" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "application_tags_application_id_idx" ON "application_tags" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "applications_candidate_id_idx" ON "applications" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "applications_campaign_id_idx" ON "applications" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "applications_discipline_id_idx" ON "applications" USING btree ("discipline_id");--> statement-breakpoint
CREATE INDEX "applications_operational_status_idx" ON "applications" USING btree ("operational_status");--> statement-breakpoint
CREATE INDEX "audit_events_entity_id_idx" ON "audit_events" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "contacts_candidate_id_idx" ON "contacts" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "documents_application_id_idx" ON "documents" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "imported_dimension_scores_application_id_idx" ON "imported_dimension_scores" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "lesson_test_evaluations_application_id_idx" ON "lesson_test_evaluations" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "lesson_test_scores_eval_id_idx" ON "lesson_test_scores" USING btree ("lesson_test_evaluation_id");--> statement-breakpoint
CREATE INDEX "notes_candidate_id_idx" ON "notes" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "schedules_application_id_idx" ON "schedules" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "subjective_answers_application_id_idx" ON "subjective_answers" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "teaching_practice_scores_application_id_idx" ON "teaching_practice_scores" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "weight_config_items_config_id_idx" ON "weight_config_items" USING btree ("weight_config_id");
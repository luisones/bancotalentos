-- Índices de performance: join de ensemble LLM e distinct de overrides.
CREATE INDEX IF NOT EXISTS "llm_evaluations_answer_id_idx" ON "llm_evaluations" USING btree ("answer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subjective_answers_has_override_idx" ON "subjective_answers" USING btree ("application_id") WHERE "override_score" is not null;

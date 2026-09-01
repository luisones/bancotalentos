CREATE TYPE "public"."application_source" AS ENUM('import', 'manual');--> statement-breakpoint
CREATE TYPE "public"."contact_channel" AS ENUM('telefone', 'whatsapp', 'email', 'outro');--> statement-breakpoint
CREATE TYPE "public"."contact_result" AS ENUM('nao_respondeu', 'contato_realizado', 'retornar_depois', 'agendado', 'sem_interesse', 'indisponivel', 'outro');--> statement-breakpoint
CREATE TYPE "public"."dimension_code" AS ENUM('prova_conteudo', 'didatica_objetiva', 'didatica_humana', 'curriculo', 'video', 'entrevista', 'aula_teste', 'socioemocional');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('curriculo', 'video', 'gravacao_entrevista', 'outro');--> statement-breakpoint
CREATE TYPE "public"."operational_status" AS ENUM('novo', 'aguardando_contato', 'contato_realizado', 'aguardando_retorno', 'entrevista_a_agendar', 'entrevista_agendada', 'aula_teste_a_agendar', 'aula_teste_agendada', 'avaliacao_pendente', 'processo_concluido');--> statement-breakpoint
CREATE TYPE "public"."schedule_status" AS ENUM('a_agendar', 'agendado', 'realizado', 'faltou', 'reagendar', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."schedule_type" AS ENUM('entrevista', 'aula_teste');--> statement-breakpoint
CREATE TYPE "public"."selective_status" AS ENUM('em_avaliacao', 'avancar', 'em_duvida', 'nao_avancar', 'selecionado', 'nao_selecionado', 'manter_no_banco');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('admin', 'avaliador', 'consulta');--> statement-breakpoint
CREATE TYPE "public"."talent_classification" AS ENUM('nao_classificado', 'acompanhar', 'interessante', 'prioritario', 'forte_candidato');--> statement-breakpoint
CREATE TABLE "application_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"flag_code" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"discipline_id" uuid,
	"segment_id" uuid
);
--> statement-breakpoint
CREATE TABLE "application_potentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"discipline_id" uuid,
	"segment_id" uuid
);
--> statement-breakpoint
CREATE TABLE "application_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"campaign_id" uuid,
	"discipline_id" uuid,
	"operational_status" "operational_status" DEFAULT 'novo' NOT NULL,
	"selective_status" "selective_status" DEFAULT 'em_avaliacao' NOT NULL,
	"applied_at" timestamp with time zone,
	"source" "application_source" DEFAULT 'manual' NOT NULL,
	"candidate_observation" text,
	"differential_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"status" text DEFAULT 'ativa' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaigns_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "candidate_merge_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_a_id" uuid NOT NULL,
	"candidate_b_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"confidence" text DEFAULT 'low' NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"email" text,
	"phone" text,
	"city" text,
	"english_level" text,
	"origin" text,
	"highlighted_note" text,
	"talent_classification" "talent_classification" DEFAULT 'nao_classificado' NOT NULL,
	"drive_cv_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid,
	"application_id" uuid,
	"staff_id" uuid NOT NULL,
	"contacted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"channel" "contact_channel" NOT NULL,
	"result" "contact_result" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dimensions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" "dimension_code" NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "dimensions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "disciplines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "disciplines_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"type" "document_type" NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"document_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluation_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evaluation_id" uuid NOT NULL,
	"previous_score" numeric(8, 4) NOT NULL,
	"new_score" numeric(8, 4) NOT NULL,
	"changed_by_staff_id" uuid,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"dimension_id" uuid NOT NULL,
	"instrument_id" uuid,
	"evaluator_staff_id" uuid NOT NULL,
	"score_raw" numeric(8, 4) NOT NULL,
	"scale_max" numeric(6, 2) DEFAULT '10' NOT NULL,
	"comment" text,
	"blind_peeked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_file" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"row_count" integer,
	"error_count" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "import_row_errors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_batch_id" uuid NOT NULL,
	"row_number" integer,
	"message" text NOT NULL,
	"payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "imported_dimension_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"dimension_id" uuid NOT NULL,
	"score" numeric(8, 4) NOT NULL,
	"source" text DEFAULT 'planilha_2025' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instruments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"prompt_text" text,
	"scale_max" numeric(6, 2) DEFAULT '10' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"needs_source_text" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_test_criteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "lesson_test_criteria_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "lesson_test_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"evaluator_staff_id" uuid NOT NULL,
	"vacancy_label" text,
	"comment" text,
	"evaluated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_test_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_test_evaluation_id" uuid NOT NULL,
	"criterion_id" uuid NOT NULL,
	"score" numeric(8, 4) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"answer_id" uuid NOT NULL,
	"provider_code" text NOT NULL,
	"model_name" text,
	"score_raw" numeric(8, 4) NOT NULL,
	"scale_max" numeric(6, 2) DEFAULT '30' NOT NULL,
	"prompt_snapshot" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid,
	"application_id" uuid,
	"staff_id" uuid NOT NULL,
	"body" text NOT NULL,
	"is_highlighted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"type" "schedule_type" NOT NULL,
	"scheduled_at" timestamp with time zone,
	"location" text,
	"responsible_staff_id" uuid,
	"status" "schedule_status" DEFAULT 'a_agendar' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "segments_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "staff_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" "staff_role" DEFAULT 'avaliador' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"neon_auth_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjective_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"answer_text" text
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name"),
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "teaching_practice_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"practice_code" text NOT NULL,
	"score_raw" numeric(8, 4) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "units_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "unmatched_lesson_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_name_raw" text,
	"evaluator_email" text,
	"vacancy_label" text,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vacancies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid,
	"unit_id" uuid,
	"segment_id" uuid,
	"discipline_id" uuid,
	"title" text NOT NULL,
	"slug" text
);
--> statement-breakpoint
CREATE TABLE "weight_config_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"weight_config_id" uuid NOT NULL,
	"dimension_id" uuid NOT NULL,
	"weight" numeric(6, 4) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weight_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_staff_id" uuid
);
--> statement-breakpoint
ALTER TABLE "application_flags" ADD CONSTRAINT "application_flags_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_interests" ADD CONSTRAINT "application_interests_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_interests" ADD CONSTRAINT "application_interests_discipline_id_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_interests" ADD CONSTRAINT "application_interests_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_potentials" ADD CONSTRAINT "application_potentials_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_potentials" ADD CONSTRAINT "application_potentials_discipline_id_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_potentials" ADD CONSTRAINT "application_potentials_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_tags" ADD CONSTRAINT "application_tags_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_tags" ADD CONSTRAINT "application_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_discipline_id_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_staff_id_staff_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_merge_suggestions" ADD CONSTRAINT "candidate_merge_suggestions_candidate_a_id_candidates_id_fk" FOREIGN KEY ("candidate_a_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_merge_suggestions" ADD CONSTRAINT "candidate_merge_suggestions_candidate_b_id_candidates_id_fk" FOREIGN KEY ("candidate_b_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_staff_id_staff_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_revisions" ADD CONSTRAINT "evaluation_revisions_evaluation_id_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_revisions" ADD CONSTRAINT "evaluation_revisions_changed_by_staff_id_staff_users_id_fk" FOREIGN KEY ("changed_by_staff_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_dimension_id_dimensions_id_fk" FOREIGN KEY ("dimension_id") REFERENCES "public"."dimensions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_evaluator_staff_id_staff_users_id_fk" FOREIGN KEY ("evaluator_staff_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_row_errors" ADD CONSTRAINT "import_row_errors_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imported_dimension_scores" ADD CONSTRAINT "imported_dimension_scores_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imported_dimension_scores" ADD CONSTRAINT "imported_dimension_scores_dimension_id_dimensions_id_fk" FOREIGN KEY ("dimension_id") REFERENCES "public"."dimensions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instruments" ADD CONSTRAINT "instruments_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_test_evaluations" ADD CONSTRAINT "lesson_test_evaluations_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_test_evaluations" ADD CONSTRAINT "lesson_test_evaluations_evaluator_staff_id_staff_users_id_fk" FOREIGN KEY ("evaluator_staff_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_test_scores" ADD CONSTRAINT "lesson_test_scores_lesson_test_evaluation_id_lesson_test_evaluations_id_fk" FOREIGN KEY ("lesson_test_evaluation_id") REFERENCES "public"."lesson_test_evaluations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_test_scores" ADD CONSTRAINT "lesson_test_scores_criterion_id_lesson_test_criteria_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."lesson_test_criteria"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_evaluations" ADD CONSTRAINT "llm_evaluations_answer_id_subjective_answers_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."subjective_answers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_staff_id_staff_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_responsible_staff_id_staff_users_id_fk" FOREIGN KEY ("responsible_staff_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjective_answers" ADD CONSTRAINT "subjective_answers_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjective_answers" ADD CONSTRAINT "subjective_answers_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teaching_practice_scores" ADD CONSTRAINT "teaching_practice_scores_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_discipline_id_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weight_config_items" ADD CONSTRAINT "weight_config_items_weight_config_id_weight_configs_id_fk" FOREIGN KEY ("weight_config_id") REFERENCES "public"."weight_configs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weight_config_items" ADD CONSTRAINT "weight_config_items_dimension_id_dimensions_id_fk" FOREIGN KEY ("dimension_id") REFERENCES "public"."dimensions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weight_configs" ADD CONSTRAINT "weight_configs_created_by_staff_id_staff_users_id_fk" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "candidates_drive_cv_id_idx" ON "candidates" USING btree ("drive_cv_id");--> statement-breakpoint
CREATE UNIQUE INDEX "evaluations_unique_idx" ON "evaluations" USING btree ("application_id","dimension_id","instrument_id","evaluator_staff_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_users_email_idx" ON "staff_users" USING btree ("email");
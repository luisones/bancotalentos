-- Pesos em dois níveis e override de nota por pergunta.
--
-- PESOS
-- Com didática e conteúdo divididos, o Resultado deixa de ponderar 7 dimensões
-- soltas e passa a ponderar 4 itens: Didática, Conteúdo, Aula-teste e Vídeo.
-- Dentro de Didática e de Conteúdo há um segundo nível de peso, entre as
-- partes. É o que preserva a fórmula da planilha de 2025 sem hardcodá-la:
--
--     FINAL CONT = (OBJ + 2*DISC) / 3
--
-- vira conteudo_objetiva com peso 1 e conteudo_dissertativa com peso 2,
-- editáveis em /admin/pesos. Uma linha de weight_config_items com `group_code`
-- é peso de grupo; uma com `dimension_id` é peso de parte dentro do grupo.
-- Exatamente um dos dois, garantido por CHECK.
--
-- OVERRIDE
-- A nota de cada uma das 4 perguntas dissertativas vem de um ensemble de LLM.
-- O avaliador precisa poder discordar de uma pergunta específica sem descartar
-- as outras três. Guardamos o override ao lado, nunca por cima: a nota do
-- ensemble continua em llm_evaluations e a divergência fica auditável.

ALTER TABLE "weight_config_items" ALTER COLUMN "dimension_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "weight_config_items" ADD COLUMN IF NOT EXISTS "group_code" text;--> statement-breakpoint
ALTER TABLE "weight_config_items" DROP CONSTRAINT IF EXISTS "weight_config_items_target_ck";--> statement-breakpoint
ALTER TABLE "weight_config_items" ADD CONSTRAINT "weight_config_items_target_ck"
	CHECK (("dimension_id" IS NULL) <> ("group_code" IS NULL));--> statement-breakpoint

ALTER TABLE "subjective_answers" ADD COLUMN IF NOT EXISTS "override_score" numeric(6, 3);--> statement-breakpoint
ALTER TABLE "subjective_answers" ADD COLUMN IF NOT EXISTS "override_by_staff_id" uuid REFERENCES "staff_users"("id");--> statement-breakpoint
ALTER TABLE "subjective_answers" ADD COLUMN IF NOT EXISTS "override_at" timestamp with time zone;

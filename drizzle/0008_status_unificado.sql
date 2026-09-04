-- Status único, no lugar de três eixos concorrentes.
--
-- A página do professor mostrava Situação Seletiva, Etapa Operacional e Selo de
-- Talento lado a lado, com gramáticas visuais diferentes justamente para tentar
-- ensinar que não eram a mesma coisa. Na prática quem lê precisa de uma
-- resposta só: em que ponto este candidato está.
--
-- Regra da fusão: o DESFECHO SELETIVO SEMPRE VENCE a etapa operacional. A etapa
-- só aparece enquanto não há desfecho — que é exatamente quando ela informa
-- alguma coisa.
--
-- O selo de talento vira um booleano (`starred`), modificador da mesma tag, e
-- não um terceiro eixo. As cinco gradações antigas nunca foram usadas: as 692
-- pessoas estão todas em 'nao_classificado'.
--
-- As colunas antigas ficam. Saem de todo caminho de leitura e escrita nesta
-- entrega, mas só somem fisicamente depois de a nova coluna rodar em produção.

CREATE TYPE "candidate_status" AS ENUM (
	'novo',
	'em_avaliacao',
	'a_contatar',
	'aula_teste_agendada',
	'em_duvida',
	'avancar',
	'selecionado',
	'nao_avancar',
	'manter_no_banco'
);--> statement-breakpoint

ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "status" "candidate_status" DEFAULT 'novo' NOT NULL;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "starred" boolean DEFAULT false NOT NULL;--> statement-breakpoint

UPDATE "applications" SET "status" = CASE
	WHEN "selective_status" = 'selecionado'      THEN 'selecionado'
	WHEN "selective_status" = 'nao_selecionado'  THEN 'nao_avancar'
	WHEN "selective_status" = 'avancar'          THEN 'avancar'
	WHEN "selective_status" = 'nao_avancar'      THEN 'nao_avancar'
	WHEN "selective_status" = 'em_duvida'        THEN 'em_duvida'
	WHEN "selective_status" = 'manter_no_banco'  THEN 'manter_no_banco'
	-- Sem desfecho: a etapa operacional é o que há de informativo.
	WHEN "operational_status" IN ('aula_teste_a_agendar', 'aula_teste_agendada')
		THEN 'aula_teste_agendada'
	WHEN "operational_status" IN ('aguardando_contato', 'contato_realizado', 'aguardando_retorno')
		THEN 'a_contatar'
	-- Nem desfecho nem etapa: 'em_avaliacao' só se houver alguma nota; caso
	-- contrário ninguém olhou para esta candidatura ainda.
	WHEN EXISTS (
		SELECT 1 FROM "imported_dimension_scores" i
			WHERE i."application_id" = "applications"."id"
	) OR EXISTS (
		SELECT 1 FROM "evaluations" e
			WHERE e."application_id" = "applications"."id"
	) THEN 'em_avaliacao'
	ELSE 'novo'
END::"candidate_status";--> statement-breakpoint

UPDATE "candidates"
	SET "starred" = true
	WHERE "talent_classification" IN ('prioritario', 'forte_candidato');--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "applications_status_idx" ON "applications" USING btree ("status");

-- Divide didática e conteúdo em objetiva/dissertativa e reagrupa o catálogo.
--
-- Três colunas novas em `dimensions`:
--   group_code  — 'didatica' | 'conteudo' | NULL. Quem tem grupo entra no
--                 consolidado pela média ponderada do grupo, não sozinho.
--   short_code  — 'AT' 'DO' 'DD' 'CD' 'CO' 'VD'. É a fileira de pastilhas da
--                 página do professor: acesa = instrumento aplicado.
--   active      — dimensão fora de uso continua existindo para não quebrar
--                 audit_events e weight_config_items que apontam para ela.
--
-- `prova_conteudo` NÃO é apagada: vira inativa e sem linhas. As 68 candidaturas
-- de 2025 cujo valor era a mistura (OBJ + 2*DISC)/3 são desfeitas pelo script
-- scripts/backfill/split-conteudo-2025.ts, que lê os números crus da planilha
-- original — o banco não tem como recuperá-los sozinho.

ALTER TABLE "dimensions" ADD COLUMN IF NOT EXISTS "group_code" text;--> statement-breakpoint
ALTER TABLE "dimensions" ADD COLUMN IF NOT EXISTS "short_code" text;--> statement-breakpoint
ALTER TABLE "dimensions" ADD COLUMN IF NOT EXISTS "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint

-- didatica_humana era o nome errado da nota das respostas dissertativas.
UPDATE "dimensions"
	SET "code" = 'didatica_dissertativa', "name" = 'Didática dissertativa'
	WHERE "code" = 'didatica_humana';--> statement-breakpoint

INSERT INTO "dimensions" ("code", "name", "sort_order")
	VALUES ('conteudo_objetiva', 'Conteúdo objetiva', 5)
	ON CONFLICT ("code") DO NOTHING;--> statement-breakpoint

INSERT INTO "dimensions" ("code", "name", "sort_order")
	VALUES ('conteudo_dissertativa', 'Conteúdo dissertativa', 4)
	ON CONFLICT ("code") DO NOTHING;--> statement-breakpoint

-- Ordem de leitura da página: AT · DO · DD · CD · CO · VD.
UPDATE "dimensions" SET "short_code" = 'AT', "sort_order" = 1 WHERE "code" = 'aula_teste';--> statement-breakpoint
UPDATE "dimensions" SET "short_code" = 'DO', "sort_order" = 2, "group_code" = 'didatica' WHERE "code" = 'didatica_objetiva';--> statement-breakpoint
UPDATE "dimensions" SET "short_code" = 'DD', "sort_order" = 3, "group_code" = 'didatica' WHERE "code" = 'didatica_dissertativa';--> statement-breakpoint
UPDATE "dimensions" SET "short_code" = 'CD', "sort_order" = 4, "group_code" = 'conteudo' WHERE "code" = 'conteudo_dissertativa';--> statement-breakpoint
UPDATE "dimensions" SET "short_code" = 'CO', "sort_order" = 5, "group_code" = 'conteudo' WHERE "code" = 'conteudo_objetiva';--> statement-breakpoint
UPDATE "dimensions" SET "short_code" = 'VD', "sort_order" = 6 WHERE "code" = 'video';--> statement-breakpoint

-- Fora de uso: nunca tiveram nota em nenhuma das duas campanhas e não entram
-- no Resultado. Ficam inativas em vez de apagadas.
UPDATE "dimensions"
	SET "active" = false, "sort_order" = 90
	WHERE "code" IN ('curriculo', 'entrevista', 'socioemocional');--> statement-breakpoint

-- Remapeamento das notas importadas. O discriminador é `source`, verificado no
-- banco: 247 planilha_2026_prova_objetiva + 121 planilha_2025_obj_cont são
-- prova objetiva pura; as 68 planilha_2025_final_cont são a mistura e ficam
-- onde estão até o script de backfill separá-las.
UPDATE "imported_dimension_scores"
	SET "dimension_id" = (SELECT "id" FROM "dimensions" WHERE "code" = 'conteudo_objetiva')
	WHERE "dimension_id" = (SELECT "id" FROM "dimensions" WHERE "code" = 'prova_conteudo')
	  AND "source" IN ('planilha_2026_prova_objetiva', 'planilha_2025_obj_cont');--> statement-breakpoint

-- Avaliações humanas lançadas na dimensão antiga (1 linha hoje) seguem a
-- objetiva: é a prova que a escola de fato aplicou nas duas campanhas.
UPDATE "evaluations"
	SET "dimension_id" = (SELECT "id" FROM "dimensions" WHERE "code" = 'conteudo_objetiva')
	WHERE "dimension_id" = (SELECT "id" FROM "dimensions" WHERE "code" = 'prova_conteudo');--> statement-breakpoint

UPDATE "blind_peeks"
	SET "dimension_id" = (SELECT "id" FROM "dimensions" WHERE "code" = 'conteudo_objetiva')
	WHERE "dimension_id" = (SELECT "id" FROM "dimensions" WHERE "code" = 'prova_conteudo');--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "dimensions_active_idx" ON "dimensions" USING btree ("active");

-- Registro de revelação de avaliação cega, por dimensão.
--
-- Antes disto o peek era um UPDATE em evaluations.blind_peeked_at filtrado por
-- evaluator_staff_id = <quem pediu>, o que afetava ZERO linhas exatamente para
-- quem ainda não avaliou — isto é, para quem precisa revelar. A coluna antiga
-- permanece para compatibilidade da ingestão.
--
-- Escrita à mão e idempotente, como 0002 e 0003: o diff automático do
-- drizzle-kit partia do snapshot 0001 e tentava recriar objetos já existentes.
-- FKs inline em vez de blocos DO $$: o driver HTTP do Neon não os executa.

CREATE TABLE IF NOT EXISTS "blind_peeks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" uuid NOT NULL REFERENCES "staff_users"("id") ON DELETE CASCADE,
	"application_id" uuid NOT NULL REFERENCES "applications"("id") ON DELETE CASCADE,
	"dimension_id" uuid NOT NULL REFERENCES "dimensions"("id") ON DELETE CASCADE,
	"peeked_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "blind_peeks_unique_idx"
	ON "blind_peeks" USING btree ("staff_id","application_id","dimension_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "blind_peeks_application_idx"
	ON "blind_peeks" USING btree ("application_id");

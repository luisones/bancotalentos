-- CEP do candidato e o cache de geolocalização/distância.
--
-- O CEP sempre existiu nos workbooks de origem (CANDIDATOS.cep) e o ingest o
-- descartava. Guardado em 8 dígitos, sem hífen — é o formato da fonte, e o
-- formulário do Google gravava número, então CEP iniciado em zero chega
-- truncado (4296000) e é normalizado na entrada.
--
-- `postal_code_source` diz de qual fonte o valor veio, porque duas alimentam a
-- coluna: os workbooks (669 pessoas) e o CSV do formulário de 2025 (mais 4).
-- Quando uma distância parecer estranha, é por aqui que se rastreia.
--
-- As duas tabelas de cache são por CEP, não por candidato: CEPs se repetem
-- entre candidatos e as APIs externas (BrasilAPI, OSRM) são públicas e sem SLA.
-- Nenhuma leitura da aplicação pode sair para a rede — ela só faz JOIN aqui.

ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "postal_code" text;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "postal_code_source" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "candidates_postal_code_idx" ON "candidates" USING btree ("postal_code");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "cep_locations" (
	"cep" text PRIMARY KEY NOT NULL,
	"lat" numeric(10, 7),
	"lng" numeric(10, 7),
	"city" text,
	"uf" text,
	-- 'rua' | 'bairro' | 'cidade'. A UI mostra o grau de aproximação em vez de
	-- fingir que um centroide de cidade é um endereço.
	"precision" text,
	"source" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "cep_distances" (
	"cep" text PRIMARY KEY NOT NULL REFERENCES "cep_locations"("cep") ON DELETE CASCADE,
	"km_santo_andre" numeric(8, 2),
	"km_sao_caetano" numeric(8, 2),
	-- 'rodoviaria' (OSRM) | 'linha_reta' (haversine, quando o roteador falha)
	"mode" text,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);

#!/usr/bin/env tsx
/**
 * Desfaz a mistura de conteúdo em 68 candidaturas de 2025.
 *
 * O workbook normalizado guardou uma dimensão só, `prova_conteudo`, com o valor
 * já combinado pela fórmula da planilha:
 *
 *     FINAL CONT = (OBJ CONT + 2 * DISC CONT) / 3
 *
 * Em 121 candidaturas isso era inofensivo — só havia a objetiva, e a migration
 * 0006 já as reapontou. Nas outras 68 o número guardado é a mistura, e ela é
 * irrecuperável a partir do banco: uma equação, duas incógnitas. Os valores
 * crus só existem na planilha original.
 *
 * Caminho da chave, porque nenhuma das pontas fala com a outra diretamente:
 *
 *     PROFESSORES."N. Inscr"  ->  CANDIDATURAS.n_inscr
 *     CANDIDATURAS.candidatura_id  ->  applications.external_ref
 *
 * Idempotente: reexecutar não duplica nada nem muda um valor já correto.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../../src/lib/db/schema";
import { dimensions, importedDimensionScores } from "../../src/lib/db/schema";
import { cellNumber, cellText, readSheet } from "../ingest/read-workbook";
import { computeFinalCont } from "../../src/lib/scoring";

const PLANILHA_2025 =
  "tmp/originais/2025/BANCO TALENTOS DOCENTE EFAF-EM 2025.xlsx";
const WORKBOOK_2025 = "tmp/2025-EFAF-EM_IDENTIFICADO.xlsx";
const SOURCE = "planilha_2025_split";
/** Tolerância da conferência: a planilha arredonda a 1 casa em alguns pontos. */
const EPSILON = 0.001;

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  // 1. Planilha original: as duas notas cruas, por número de inscrição.
  const professores = readSheet(PLANILHA_2025, "PROFESSORES");
  const rawByInscr = new Map<string, { obj: number; disc: number }>();
  for (const row of professores) {
    const inscr = cellText(row, "N. Inscr");
    const obj = cellNumber(row, "OBJ CONT");
    const disc = cellNumber(row, "DISC CONT");
    // Só interessam as linhas com AS DUAS. Quem tem só a objetiva já foi
    // reapontado pela migration 0006, sem passar por aqui.
    if (!inscr || obj === null || disc === null) continue;
    rawByInscr.set(inscr, { obj, disc });
  }
  console.log(`Planilha: ${rawByInscr.size} linhas com OBJ CONT e DISC CONT.`);

  // 2. Workbook normalizado: a ponte candidatura_id -> n_inscr.
  //
  // Nesta direção e não na inversa: `n_inscr` NÃO é único. A inscrição 70211
  // virou duas candidaturas (`CAND-2025-090a` e `090b`, o reenvio do
  // formulário), e um Map de n_inscr para candidatura perderia uma delas em
  // silêncio. Candidatura para inscrição é 1:1 e sempre será.
  const candidaturas = readSheet(WORKBOOK_2025, "CANDIDATURAS");
  const inscrByExternalRef = new Map<string, string>();
  for (const row of candidaturas) {
    const inscr = cellText(row, "n_inscr");
    const candidaturaId = cellText(row, "candidatura_id");
    if (inscr && candidaturaId) inscrByExternalRef.set(candidaturaId, inscr);
  }

  // 3. Banco: as candidaturas que ainda estão na dimensão antiga.
  const [antiga, objetiva, dissertativa] = await Promise.all([
    dimensionByCode("prova_conteudo"),
    dimensionByCode("conteudo_objetiva"),
    dimensionByCode("conteudo_dissertativa"),
  ]);

  const pendentes = await db
    .select({
      id: importedDimensionScores.id,
      applicationId: importedDimensionScores.applicationId,
      score: importedDimensionScores.score,
      externalRef: schema.applications.externalRef,
    })
    .from(importedDimensionScores)
    .innerJoin(
      schema.applications,
      eq(schema.applications.id, importedDimensionScores.applicationId),
    )
    .where(eq(importedDimensionScores.dimensionId, antiga));

  console.log(`Banco: ${pendentes.length} linhas em prova_conteudo.`);

  let divergentes = 0;
  let semPar = 0;
  const writes: Array<{
    row: (typeof pendentes)[number];
    obj: number;
    disc: number;
  }> = [];

  // Varre o BANCO, não a planilha: é o banco que define o que ainda precisa ser
  // dividido, e assim as duas candidaturas de um reenvio são tratadas.
  for (const row of pendentes) {
    const inscr = row.externalRef
      ? inscrByExternalRef.get(row.externalRef)
      : undefined;
    const raw = inscr ? rawByInscr.get(inscr) : undefined;
    if (!raw) {
      console.warn(`  sem par na planilha: ${row.externalRef}`);
      semPar += 1;
      continue;
    }

    // Conferência: a mistura recalculada tem que bater com o que está gravado.
    // Se não bater, a linha não é o que pensamos que é e não vai ser tocada.
    const esperado = computeFinalCont(raw.obj, raw.disc);
    if (Math.abs(esperado - Number(row.score)) > EPSILON) {
      console.warn(
        `  divergente: ${row.externalRef} gravado ${Number(row.score).toFixed(4)}, ` +
          `(${raw.obj} + 2*${raw.disc})/3 = ${esperado.toFixed(4)}`,
      );
      divergentes += 1;
      continue;
    }

    writes.push({ row, obj: raw.obj, disc: raw.disc });
  }

  console.log(
    `Pareadas e conferidas: ${writes.length} · divergentes: ${divergentes} · sem par na planilha: ${semPar}`,
  );

  if (divergentes > 0) {
    throw new Error(
      "Há linhas divergentes. Nada foi gravado — investigue antes de rodar de novo.",
    );
  }
  if (dryRun) {
    console.log("--dry-run: nada gravado.");
    return;
  }

  for (const { row, obj, disc } of writes) {
    // A linha da mistura VIRA a objetiva (mesmo id, dimensão e valor novos), e
    // a dissertativa entra como linha nova. Assim o unique (app, dimension)
    // nunca é violado e reexecutar é inofensivo.
    await db
      .update(importedDimensionScores)
      .set({
        dimensionId: objetiva,
        score: obj.toFixed(4),
        source: SOURCE,
      })
      .where(eq(importedDimensionScores.id, row.id));

    await db
      .insert(importedDimensionScores)
      .values({
        applicationId: row.applicationId,
        dimensionId: dissertativa,
        score: disc.toFixed(4),
        source: SOURCE,
      })
      .onConflictDoUpdate({
        target: [
          importedDimensionScores.applicationId,
          importedDimensionScores.dimensionId,
        ],
        set: { score: disc.toFixed(4), source: SOURCE },
      });
  }

  // Sem linhas restantes, a dimensão antiga sai do catálogo ativo.
  const restantes = await db
    .select({ id: importedDimensionScores.id })
    .from(importedDimensionScores)
    .where(eq(importedDimensionScores.dimensionId, antiga));

  if (restantes.length === 0) {
    await db
      .update(dimensions)
      .set({ active: false, sortOrder: 90 })
      .where(eq(dimensions.code, "prova_conteudo"));
    console.log("prova_conteudo: sem linhas, marcada inativa.");
  } else {
    console.warn(
      `prova_conteudo ainda tem ${restantes.length} linhas — mantida ativa.`,
    );
  }

  console.log(`Gravadas ${writes.length} divisões.`);
}

async function dimensionByCode(code: string): Promise<string> {
  const [row] = await db
    .select({ id: dimensions.id })
    .from(dimensions)
    .where(eq(dimensions.code, code as typeof dimensions.$inferSelect.code));
  if (!row) throw new Error(`Dimensão ${code} não existe.`);
  return row.id;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

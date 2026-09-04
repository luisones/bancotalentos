#!/usr/bin/env tsx
/**
 * OBS das abas de disciplina da planilha de resultados 2026 → nota rápida.
 *
 * Fonte: só a aba `FLAGS_TAGS` dos workbooks normalizados (já é o OBS casado
 * com `pessoa_id`). Não abre a planilha original nem as outras abas do
 * workbook — nomes, e-mails e respostas não entram na memória deste processo.
 *
 * Privacidade:
 *   - IDENTIFICADO exige `--allow-pii` (o mesmo gate da ingestão).
 *   - stdout/handoff só têm contagens e `PES-…`. O texto não é logado.
 *   - `audit_events` registra o lote sem o corpo da nota.
 *   - não sobrescreve nota rápida já escrita pela equipe, salvo `--force`.
 *
 *   npx tsx scripts/backfill/obs-quick-notes-2026.ts [--dry-run] [--allow-pii] [--force]
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { existsSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, inArray, isNull } from "drizzle-orm";
import * as schema from "../../src/lib/db/schema";
import {
  applyObsQuickNotes,
  collectObsQuickNotes,
  printObsApplyResult,
} from "../ingest/obs-quick-notes";
import { readSheet } from "../ingest/read-workbook";
import { CAMPAIGN_CONFIGS } from "../ingest/types";

const INGEST_STAFF_EMAIL = "ingest@internal";
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

function parseArgs(argv: string[]) {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  return {
    dryRun: flags.has("--dry-run"),
    allowPii: flags.has("--allow-pii"),
    force: flags.has("--force"),
  };
}

function resolveFile(allowPii: boolean): string {
  const config = CAMPAIGN_CONFIGS["2026-scs"];
  const chosen = allowPii ? config.identFile : config.anonFile;
  if (!allowPii && chosen.includes("IDENTIFICADO")) {
    throw new Error(
      "Refusing IDENTIFICADO file without --allow-pii. Use ANONIMIZADO for development.",
    );
  }
  if (!existsSync(chosen)) {
    throw new Error(
      allowPii
        ? `Missing identified workbook: ${chosen}`
        : `Missing anonymized workbook: ${chosen}. Para produção local, rode com --allow-pii.`,
    );
  }
  return chosen;
}

async function getIngestStaffId(): Promise<string> {
  const [existing] = await db
    .select({ id: schema.staffUsers.id })
    .from(schema.staffUsers)
    .where(eq(schema.staffUsers.email, INGEST_STAFF_EMAIL))
    .limit(1);
  if (existing) return existing.id;
  const [created] = await db
    .insert(schema.staffUsers)
    .values({
      email: INGEST_STAFF_EMAIL,
      name: "Importação",
      role: "consulta",
      active: true,
    })
    .returning({ id: schema.staffUsers.id });
  return created.id;
}

async function attachOrphanNotes() {
  const orphans = await db
    .select({
      id: schema.notes.id,
      applicationId: schema.notes.applicationId,
    })
    .from(schema.notes)
    .where(isNull(schema.notes.candidateId));

  let attached = 0;
  for (const note of orphans) {
    if (!note.applicationId) continue;
    const [app] = await db
      .select({ candidateId: schema.applications.candidateId })
      .from(schema.applications)
      .where(eq(schema.applications.id, note.applicationId))
      .limit(1);
    if (!app) continue;
    await db
      .update(schema.notes)
      .set({ candidateId: app.candidateId })
      .where(eq(schema.notes.id, note.id));
    attached += 1;
  }
  return attached;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const filePath = resolveFile(options.allowPii);
  console.log(`Lendo FLAGS_TAGS de ${path.basename(filePath)}`);

  const rows = readSheet(filePath, "FLAGS_TAGS");
  const collected = collectObsQuickNotes(rows);
  console.log(
    `OBS em FLAGS_TAGS: ${collected.byPessoa.size} pessoas` +
      (collected.skippedLong ? ` · ${collected.skippedLong} acima de 120 caracteres` : "") +
      (collected.skippedEmpty ? ` · ${collected.skippedEmpty} vazias` : ""),
  );

  const refs = [...collected.byPessoa.keys()];
  const people = refs.length
    ? await db
        .select({
          id: schema.candidates.id,
          externalRef: schema.candidates.externalRef,
        })
        .from(schema.candidates)
        .where(inArray(schema.candidates.externalRef, refs))
    : [];
  const candidateByRef = new Map<string, string>();
  for (const row of people) {
    if (row.externalRef) candidateByRef.set(row.externalRef, row.id);
  }

  const staffId = options.dryRun ? null : await getIngestStaffId();
  const result = await applyObsQuickNotes(db, collected.byPessoa, candidateByRef, {
    dryRun: options.dryRun,
    skipExisting: !options.force,
    staffId,
  });
  printObsApplyResult(result, options.dryRun);

  if (options.dryRun) {
    console.log("--dry-run: nada gravado. Observações órfãs também não foram ligadas.");
    return;
  }

  const attached = await attachOrphanNotes();
  console.log(`Observações longas ligadas à pessoa: ${attached}`);
  console.log(
    "Lista do Painel: a chave de cache subiu para application-base-v5; recarregue a página.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

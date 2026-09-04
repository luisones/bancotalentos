import { eq } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { QUICK_NOTE_MAX } from "../../src/lib/candidate/quick-note";
import * as schema from "../../src/lib/db/schema";
import { cellText } from "./read-workbook";
import type { SheetRow } from "./types";

type Db = NeonHttpDatabase<typeof schema>;

/**
 * OBS da planilha de resultados 2026 → nota rápida.
 *
 * O texto é PII (juízo da equipe sobre a pessoa; um caso cita terceiro).
 * Esta camada só normaliza e agrupa por `pessoa_id`. Quem grava decide o
 * arquivo-fonte (`ANONIMIZADO` vs `IDENTIFICADO`) e **não pode logar o corpo**.
 */
export function normalizeObsText(raw: string): string | null {
  const next = raw.trim().replace(/\s+/g, " ");
  if (next.length === 0) return null;
  if (next.length > QUICK_NOTE_MAX) return null;
  return next;
}

export type CollectedObs = {
  byPessoa: Map<string, string>;
  skippedEmpty: number;
  skippedLong: number;
  skippedJoinOverflow: number;
};

/**
 * Lê `FLAGS_TAGS` (já é o OBS das abas de disciplina, com `pessoa_id`).
 *
 * Não exige `candidatura_id`: a nota rápida é da pessoa. Uma linha de
 * `falta_prova` ficou sem candidatura na ingestão e mesmo assim precisa
 * aparecer no Painel.
 */
export function collectObsQuickNotes(rows: SheetRow[]): CollectedObs {
  const buckets = new Map<string, string[]>();
  let skippedEmpty = 0;
  let skippedLong = 0;

  for (const row of rows) {
    const pessoaId = cellText(row, "pessoa_id");
    if (!pessoaId) continue;

    const texto = cellText(row, "texto_original");
    if (!texto || texto.trim().length === 0) {
      skippedEmpty += 1;
      continue;
    }

    const normalized = normalizeObsText(texto);
    if (!normalized) {
      skippedLong += 1;
      continue;
    }

    const list = buckets.get(pessoaId) ?? [];
    if (!list.includes(normalized)) list.push(normalized);
    buckets.set(pessoaId, list);
  }

  const byPessoa = new Map<string, string>();
  let skippedJoinOverflow = 0;
  for (const [pessoaId, texts] of buckets) {
    if (texts.length === 1) {
      byPessoa.set(pessoaId, texts[0]);
      continue;
    }
    const joined = texts.join(" · ");
    if (joined.length <= QUICK_NOTE_MAX) {
      byPessoa.set(pessoaId, joined);
    } else {
      byPessoa.set(pessoaId, texts[0]);
      skippedJoinOverflow += 1;
    }
  }

  return { byPessoa, skippedEmpty, skippedLong, skippedJoinOverflow };
}

export type ApplyObsResult = {
  imported: number;
  skippedExisting: number;
  unchanged: number;
  unmatched: number;
};

/**
 * Grava `candidates.highlighted_note`.
 *
 * `skipExisting` é o padrão: uma nota rápida já escrita pela equipe não
 * volta a ser a da planilha. `--force` no backfill desliga isso.
 *
 * Auditoria: um evento de lote **sem o texto**. O corpo já fica na coluna
 * da pessoa; copiá-lo para `audit_events.metadata` seria um segundo depósito
 * de PII, mais fácil de vazar em export de log.
 */
export async function applyObsQuickNotes(
  db: Db,
  notesByPessoa: Map<string, string>,
  candidateByRef: Map<string, string>,
  options: {
    dryRun: boolean;
    skipExisting: boolean;
    staffId: string | null;
  },
): Promise<ApplyObsResult> {
  const result: ApplyObsResult = {
    imported: 0,
    skippedExisting: 0,
    unchanged: 0,
    unmatched: 0,
  };

  const unmatchedRefs: string[] = [];

  for (const [pessoaId, note] of notesByPessoa) {
    const candidateId = candidateByRef.get(pessoaId);
    if (!candidateId || candidateId.startsWith("dry-")) {
      if (!candidateId) {
        result.unmatched += 1;
        unmatchedRefs.push(pessoaId);
      } else {
        result.imported += 1;
      }
      continue;
    }

    const [current] = await db
      .select({ highlightedNote: schema.candidates.highlightedNote })
      .from(schema.candidates)
      .where(eq(schema.candidates.id, candidateId))
      .limit(1);

    if (!current) {
      result.unmatched += 1;
      unmatchedRefs.push(pessoaId);
      continue;
    }

    if (current.highlightedNote === note) {
      result.unchanged += 1;
      continue;
    }

    if (options.skipExisting && current.highlightedNote) {
      result.skippedExisting += 1;
      continue;
    }

    result.imported += 1;
    if (options.dryRun) continue;

    await db
      .update(schema.candidates)
      .set({ highlightedNote: note, updatedAt: new Date() })
      .where(eq(schema.candidates.id, candidateId));
  }

  if (unmatchedRefs.length > 0) {
    console.log(
      `  OBS sem candidato (só pessoa_id): ${unmatchedRefs.join(", ")}`,
    );
  }

  if (!options.dryRun && options.staffId && result.imported > 0) {
    await db.insert(schema.auditEvents).values({
      staffId: options.staffId,
      action: "quick_notes_imported",
      entityType: "campaign",
      entityId: "2026-scs",
      metadata: {
        source: "FLAGS_TAGS",
        imported: result.imported,
        skippedExisting: result.skippedExisting,
        unchanged: result.unchanged,
        unmatched: result.unmatched,
      },
    });
  }

  return result;
}

export function printObsApplyResult(result: ApplyObsResult, dryRun: boolean) {
  const prefix = dryRun ? "--dry-run: " : "";
  console.log(
    `${prefix}notas rápidas gravadas ${result.imported} · ` +
      `já iguais ${result.unchanged} · ` +
      `preservadas (equipe) ${result.skippedExisting} · ` +
      `sem candidato ${result.unmatched}`,
  );
}

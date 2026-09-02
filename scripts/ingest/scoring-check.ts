import { computeAprObj } from "../../src/lib/scoring";
import type { SheetRow } from "./types";
import { cellNumber, cellText } from "./read-workbook";

export const LLM_WEIGHTS: Record<string, number> = {
  L: 0.5,
  G: 0.15,
  A: 0.175,
  O: 0.175,
};

export function computeQnF(
  scores: Partial<Record<"L" | "G" | "A" | "O", number | null>>,
): number | null {
  let weightSum = 0;
  let weightedSum = 0;

  for (const provider of ["L", "G", "A", "O"] as const) {
    const score = scores[provider];
    if (score === null || score === undefined) continue;
    const w = LLM_WEIGHTS[provider];
    weightSum += w;
    weightedSum += w * score;
  }

  if (weightSum === 0) return null;
  return weightedSum / weightSum;
}

export function meanAbsoluteError(
  expected: number[],
  actual: number[],
): number | null {
  if (expected.length === 0) return null;
  const sum = expected.reduce((acc, exp, i) => acc + Math.abs(exp - actual[i]), 0);
  return sum / expected.length;
}

export function validateQnFRows(rows: SheetRow[]): {
  mae: number | null;
  count: number;
} {
  const expected: number[] = [];
  const actual: number[] = [];

  for (const row of rows) {
    const sheetF = cellNumber(row, "score_F_planilha");
    const recalc = cellNumber(row, "score_F_recalculado");
    const l = cellNumber(row, "score_L");
    const g = cellNumber(row, "score_G");
    const a = cellNumber(row, "score_A");
    const o = cellNumber(row, "score_O");

    const computed = computeQnF({ L: l, G: g, A: a, O: o });
    const reference = recalc ?? sheetF;
    if (reference === null || computed === null) continue;

    expected.push(computed);
    actual.push(reference);
  }

  return { mae: meanAbsoluteError(expected, actual), count: expected.length };
}

export function validateAprObjRows(
  practiceRows: SheetRow[],
  scoreRows: SheetRow[],
): { mae: number | null; count: number } {
  const sumByCandidatura = new Map<string, number>();

  for (const row of practiceRows) {
    const candidaturaId = cellText(row, "candidatura_id");
    const valor = cellNumber(row, "valor");
    if (!candidaturaId || valor === null) continue;
    sumByCandidatura.set(
      candidaturaId,
      (sumByCandidatura.get(candidaturaId) ?? 0) + valor,
    );
  }

  const expected: number[] = [];
  const actual: number[] = [];

  for (const row of scoreRows) {
    if (cellText(row, "dimension_code") !== "didatica_objetiva") continue;
    const candidaturaId = cellText(row, "candidatura_id");
    const sheetScore = cellNumber(row, "score");
    if (!candidaturaId || sheetScore === null) continue;
    const practiceSum = sumByCandidatura.get(candidaturaId);
    if (practiceSum === undefined) continue;
    expected.push(computeAprObj(practiceSum));
    actual.push(sheetScore);
  }

  return { mae: meanAbsoluteError(expected, actual), count: expected.length };
}

export function hasLlmScore(
  row: SheetRow,
  provider: "L" | "G" | "A" | "O",
): boolean {
  const value = row[`score_${provider}`];
  return value !== null && value !== undefined && value !== "";
}

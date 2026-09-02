export function normalizeScore(score: number, scaleMax: number): number {
  if (scaleMax <= 0) return 0;
  return (score / scaleMax) * 10;
}

export function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export type DimensionScore = {
  code: string;
  score: number | null;
  evaluatorCount?: number;
};

export type ConsolidatedResult = {
  consolidated: number | null;
  coverage: number;
  totalDimensions: number;
  dimensionScores: DimensionScore[];
};

export function computeConsolidated(
  dimensionScores: DimensionScore[],
  weights: Record<string, number>,
): ConsolidatedResult {
  const totalDimensions = Object.keys(weights).length;
  const available = dimensionScores.filter((d) => d.score !== null);

  if (available.length === 0) {
    return {
      consolidated: null,
      coverage: 0,
      totalDimensions,
      dimensionScores,
    };
  }

  let weightSum = 0;
  let weightedSum = 0;

  for (const dim of available) {
    const w = weights[dim.code] ?? 0;
    if (w <= 0) continue;
    weightSum += w;
    weightedSum += (dim.score as number) * w;
  }

  const consolidated = weightSum > 0 ? weightedSum / weightSum : null;

  return {
    consolidated,
    coverage: available.length,
    totalDimensions,
    dimensionScores,
  };
}

/** Planilha formulas for validation during ingest */
export function computeAprDisF(q1f: number, q2f: number, q3f: number, q4f: number) {
  return (10 * (q1f + q2f + q3f + q4f)) / 120;
}

export function computeAprObj(practiceSum: number) {
  return (10 * practiceSum) / 170;
}

export function computeFinalCont(obj: number, disc: number) {
  return (obj + 2 * disc) / 3;
}

const LLM_WEIGHTS: Record<string, number> = {
  L: 0.5,
  G: 0.15,
  A: 0.175,
  O: 0.175,
};

/** Ensemble QnF: renormalized over present LLM providers (scale 0–30). */
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

export function formatScore(value: number | null, digits = 1): string {
  if (value === null || Number.isNaN(value)) return "—";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatCoverage(coverage: number, total: number): string {
  return `${coverage}/${total}`;
}

export function formatCoveragePercent(coverage: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((coverage / total) * 100)}%`;
}

export type ScoreEvalInput = {
  dimensionCode: string;
  scoreRaw: string | number;
  scaleMax: string | number;
  evaluatorStaffId: string;
  blindPeekedAt: Date | null;
};

export type ScoreImportedInput = {
  dimensionCode: string;
  score: string | number;
};

export type AssembleScoresInput = {
  dimensionCodes: string[];
  weights: Record<string, number>;
  evals: ScoreEvalInput[];
  imported: ScoreImportedInput[];
  lessonTestScore: number | null;
  staffUserId?: string;
  forceReveal?: boolean;
  /** Códigos de dimensão que o usuário revelou nesta candidatura. */
  peekedDimensionCodes?: ReadonlySet<string>;
};

/**
 * O avaliador vê as notas dos colegas se já registrou a própria, ou se
 * revelou explicitamente (peek auditado).
 *
 * O `hasPeeked` anterior lia `blindPeekedAt` nas linhas do PRÓPRIO avaliador,
 * o que exigia ele já ter uma avaliação — e nesse caso `hasOwn` já era
 * verdadeiro. Era código morto: quem não avaliou nunca conseguia revelar.
 * Agora o peek vem de `blind_peeks`, registro próprio e independente.
 */
export function canSeePeerEvaluations(
  evals: Pick<ScoreEvalInput, "evaluatorStaffId">[],
  staffUserId: string,
  /** Dimensões que este usuário revelou nesta candidatura. */
  peekedDimensionCodes?: ReadonlySet<string>,
  dimensionCode?: string,
): boolean {
  const hasOwn = evals.some((e) => e.evaluatorStaffId === staffUserId);
  if (hasOwn) return true;
  if (!peekedDimensionCodes) return false;
  // Sem dimensão informada, basta ter revelado qualquer uma.
  return dimensionCode
    ? peekedDimensionCodes.has(dimensionCode)
    : peekedDimensionCodes.size > 0;
}

/** Pure consolidado: avaliações individuais > importado; dimensão ausente não vira zero. */
export function assembleDimensionScores(
  input: AssembleScoresInput,
): ConsolidatedResult {
  const staffUserId = input.staffUserId;
  const alwaysReveal = input.forceReveal || !staffUserId;

  const dimensionScores: DimensionScore[] = input.dimensionCodes.map((code) => {
    const dimEvals = input.evals.filter((e) => e.dimensionCode === code);
    // A cegueira é POR DIMENSÃO: avaliar uma não revela as outras.
    const revealPeers =
      alwaysReveal ||
      canSeePeerEvaluations(dimEvals, staffUserId!, input.peekedDimensionCodes, code);
    const visibleEvals = revealPeers
      ? dimEvals
      : dimEvals.filter((e) => e.evaluatorStaffId === staffUserId);
    const evalScores = visibleEvals.map((e) =>
      normalizeScore(Number(e.scoreRaw), Number(e.scaleMax)),
    );

    const imp = input.imported.find((i) => i.dimensionCode === code);

    let score: number | null = null;
    if (code === "aula_teste" && input.lessonTestScore !== null) {
      score = input.lessonTestScore;
    } else if (evalScores.length > 0) {
      score = average(evalScores);
    } else if (imp) {
      score = Number(imp.score);
    }

    return { code, score, evaluatorCount: dimEvals.length };
  });

  return computeConsolidated(dimensionScores, input.weights);
}

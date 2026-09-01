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

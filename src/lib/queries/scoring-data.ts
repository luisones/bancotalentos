import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  dimensions,
  evaluations,
  importedDimensionScores,
  lessonTestEvaluations,
  lessonTestScores,
  staffUsers,
  weightConfigItems,
  weightConfigs,
} from "@/lib/db/schema";
import {
  average,
  computeConsolidated,
  normalizeScore,
  type ConsolidatedResult,
  type DimensionScore,
} from "@/lib/scoring";

export async function getActiveWeights(): Promise<Record<string, number>> {
  const [latestConfig] = await db
    .select()
    .from(weightConfigs)
    .orderBy(desc(weightConfigs.validFrom))
    .limit(1);

  const allDims = await db
    .select()
    .from(dimensions)
    .orderBy(dimensions.sortOrder);

  if (!latestConfig) {
    const w = allDims.length > 0 ? 1 / allDims.length : 0;
    return Object.fromEntries(allDims.map((d) => [d.code, w]));
  }

  const items = await db
    .select({
      code: dimensions.code,
      weight: weightConfigItems.weight,
    })
    .from(weightConfigItems)
    .innerJoin(dimensions, eq(dimensions.id, weightConfigItems.dimensionId))
    .where(eq(weightConfigItems.weightConfigId, latestConfig.id));

  const weights: Record<string, number> = {};
  for (const dim of allDims) {
    weights[dim.code] = 0;
  }
  for (const item of items) {
    weights[item.code] = Number(item.weight);
  }
  return weights;
}

export type EvaluationRow = {
  id: string;
  dimensionId: string;
  dimensionCode: string;
  dimensionName: string;
  instrumentId: string | null;
  evaluatorStaffId: string;
  evaluatorName: string;
  scoreRaw: string;
  scaleMax: string;
  comment: string | null;
  blindPeekedAt: Date | null;
  createdAt: Date;
};

export type BlindContext = {
  staffUserId: string;
  canSeePeers: boolean;
};

export function canSeePeerEvaluations(
  evals: Pick<EvaluationRow, "evaluatorStaffId" | "blindPeekedAt">[],
  staffUserId: string,
): boolean {
  const hasOwn = evals.some((e) => e.evaluatorStaffId === staffUserId);
  const hasPeeked = evals.some(
    (e) => e.evaluatorStaffId === staffUserId && e.blindPeekedAt,
  );
  return hasOwn || hasPeeked;
}

export async function getApplicationEvaluations(
  applicationId: string,
): Promise<EvaluationRow[]> {
  return db
    .select({
      id: evaluations.id,
      dimensionId: evaluations.dimensionId,
      dimensionCode: dimensions.code,
      dimensionName: dimensions.name,
      instrumentId: evaluations.instrumentId,
      evaluatorStaffId: evaluations.evaluatorStaffId,
      evaluatorName: staffUsers.name,
      scoreRaw: evaluations.scoreRaw,
      scaleMax: evaluations.scaleMax,
      comment: evaluations.comment,
      blindPeekedAt: evaluations.blindPeekedAt,
      createdAt: evaluations.createdAt,
    })
    .from(evaluations)
    .innerJoin(dimensions, eq(dimensions.id, evaluations.dimensionId))
    .innerJoin(staffUsers, eq(staffUsers.id, evaluations.evaluatorStaffId))
    .where(eq(evaluations.applicationId, applicationId));
}

export async function buildDimensionScoresForApplication(
  applicationId: string,
  options?: { staffUserId?: string; forceReveal?: boolean },
): Promise<ConsolidatedResult> {
  const allDims = await db
    .select()
    .from(dimensions)
    .orderBy(dimensions.sortOrder);
  const weights = await getActiveWeights();

  const evals = await db
    .select({
      dimensionCode: dimensions.code,
      scoreRaw: evaluations.scoreRaw,
      scaleMax: evaluations.scaleMax,
      evaluatorStaffId: evaluations.evaluatorStaffId,
      blindPeekedAt: evaluations.blindPeekedAt,
    })
    .from(evaluations)
    .innerJoin(dimensions, eq(dimensions.id, evaluations.dimensionId))
    .where(eq(evaluations.applicationId, applicationId));

  const imported = await db
    .select({
      dimensionCode: dimensions.code,
      score: importedDimensionScores.score,
    })
    .from(importedDimensionScores)
    .innerJoin(dimensions, eq(dimensions.id, importedDimensionScores.dimensionId))
    .where(eq(importedDimensionScores.applicationId, applicationId));

  const lessonEvals = await db
    .select()
    .from(lessonTestEvaluations)
    .where(eq(lessonTestEvaluations.applicationId, applicationId));

  let lessonTestScore: number | null = null;
  if (lessonEvals.length > 0) {
    const evalIds = lessonEvals.map((e) => e.id);
    const scores = await db
      .select()
      .from(lessonTestScores)
      .where(inArray(lessonTestScores.lessonTestEvaluationId, evalIds));
    lessonTestScore = average(scores.map((s) => Number(s.score)));
  }

  const revealPeers =
    options?.forceReveal ||
    !options?.staffUserId ||
    canSeePeerEvaluations(evals, options.staffUserId);

  const dimensionScores: DimensionScore[] = allDims.map((dim) => {
    const code = dim.code;
    const dimEvals = evals.filter((e) => e.dimensionCode === code);

    let evalScores: number[];
    if (revealPeers) {
      evalScores = dimEvals.map((e) =>
        normalizeScore(Number(e.scoreRaw), Number(e.scaleMax)),
      );
    } else {
      evalScores = dimEvals
        .filter((e) => e.evaluatorStaffId === options!.staffUserId)
        .map((e) =>
          normalizeScore(Number(e.scoreRaw), Number(e.scaleMax)),
        );
    }

    const imp = imported.find((i) => i.dimensionCode === code);

    let score: number | null = null;
    if (code === "aula_teste" && lessonTestScore !== null) {
      score = lessonTestScore;
    } else if (evalScores.length > 0) {
      score = average(evalScores);
    } else if (imp) {
      score = Number(imp.score);
    }

    return { code, score, evaluatorCount: dimEvals.length };
  });

  return computeConsolidated(dimensionScores, weights);
}

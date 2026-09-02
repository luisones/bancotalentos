import { and, desc, eq, inArray, sql } from "drizzle-orm";
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
  assembleDimensionScores,
  average,
  canSeePeerEvaluations,
  type ConsolidatedResult,
} from "@/lib/scoring";

export { canSeePeerEvaluations };

export type ScoringCatalog = {
  dimensions: Array<{
    id: string;
    code: (typeof dimensions.$inferSelect)["code"];
    name: string;
    sortOrder: number;
  }>;
  weights: Record<string, number>;
};

type LoadedEval = {
  applicationId: string;
  dimensionCode: string;
  scoreRaw: string;
  scaleMax: string;
  evaluatorStaffId: string;
  blindPeekedAt: Date | null;
};

type LoadedImported = {
  applicationId: string;
  dimensionCode: string;
  score: string;
};

export type ScoreInputs = {
  evalsByApp: Map<string, LoadedEval[]>;
  importedByApp: Map<string, LoadedImported[]>;
  lessonScoreByApp: Map<string, number | null>;
};

function scoringCatalogQuery() {
  const latestConfig = db
    .select({ id: weightConfigs.id })
    .from(weightConfigs)
    .orderBy(desc(weightConfigs.validFrom))
    .limit(1)
    .as("latest_weight_config");

  return db
    .select({
      id: dimensions.id,
      code: dimensions.code,
      name: dimensions.name,
      sortOrder: dimensions.sortOrder,
      weight: weightConfigItems.weight,
    })
    .from(dimensions)
    .leftJoin(latestConfig, sql`true`)
    .leftJoin(
      weightConfigItems,
      and(
        eq(weightConfigItems.dimensionId, dimensions.id),
        eq(weightConfigItems.weightConfigId, latestConfig.id),
      ),
    )
    .orderBy(dimensions.sortOrder);
}

function catalogFromRows(
  rows: Awaited<ReturnType<typeof scoringCatalogQuery>>,
): ScoringCatalog {
  const hasWeights = rows.some((d) => d.weight !== null);
  const equal = rows.length > 0 ? 1 / rows.length : 0;
  const weights: Record<string, number> = {};
  for (const dim of rows) {
    weights[dim.code] = hasWeights ? Number(dim.weight ?? 0) : equal;
  }
  return {
    dimensions: rows.map(({ id, code, name, sortOrder }) => ({
      id,
      code,
      name,
      sortOrder,
    })),
    weights,
  };
}

export async function getScoringCatalog(): Promise<ScoringCatalog> {
  const rows = await scoringCatalogQuery();
  return catalogFromRows(rows);
}

export async function getActiveWeights(): Promise<Record<string, number>> {
  const catalog = await getScoringCatalog();
  return catalog.weights;
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

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}

async function foldScoreInputs(
  evals: LoadedEval[],
  imported: LoadedImported[],
  lessonEvals: Array<{ id: string; applicationId: string }>,
): Promise<ScoreInputs> {
  const evalsByApp = new Map<string, LoadedEval[]>();
  const importedByApp = new Map<string, LoadedImported[]>();
  const lessonScoreByApp = new Map<string, number | null>();

  for (const row of evals) {
    const list = evalsByApp.get(row.applicationId);
    if (list) list.push(row);
    else evalsByApp.set(row.applicationId, [row]);
  }

  for (const row of imported) {
    const list = importedByApp.get(row.applicationId);
    if (list) list.push(row);
    else importedByApp.set(row.applicationId, [row]);
  }

  if (lessonEvals.length > 0) {
    const evalIds = lessonEvals.map((e) => e.id);
    const scores = await db
      .select({
        evalId: lessonTestScores.lessonTestEvaluationId,
        score: lessonTestScores.score,
      })
      .from(lessonTestScores)
      .where(inArray(lessonTestScores.lessonTestEvaluationId, evalIds));

    const appByEval = new Map(lessonEvals.map((e) => [e.id, e.applicationId]));
    const numsByApp = new Map<string, number[]>();
    for (const s of scores) {
      const appId = appByEval.get(s.evalId);
      if (!appId) continue;
      const list = numsByApp.get(appId);
      const n = Number(s.score);
      if (list) list.push(n);
      else numsByApp.set(appId, [n]);
    }
    for (const [appId, nums] of numsByApp) {
      lessonScoreByApp.set(appId, average(nums));
    }
  }

  return { evalsByApp, importedByApp, lessonScoreByApp };
}

export async function getApplicationEvaluationsForApplications(
  applicationIds: string[],
): Promise<Map<string, EvaluationRow[]>> {
  if (applicationIds.length === 0) return new Map();

  const rows = await db
    .select({
      id: evaluations.id,
      applicationId: evaluations.applicationId,
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
    .where(inArray(evaluations.applicationId, applicationIds));

  const grouped = groupBy(rows, (r) => r.applicationId);
  const result = new Map<string, EvaluationRow[]>();
  for (const [appId, list] of grouped) {
    result.set(
      appId,
      list.map(({ applicationId: _applicationId, ...row }) => row),
    );
  }
  return result;
}

export async function getApplicationEvaluations(
  applicationId: string,
): Promise<EvaluationRow[]> {
  const map = await getApplicationEvaluationsForApplications([applicationId]);
  return map.get(applicationId) ?? [];
}

export async function prefetchScoringData(applicationIds?: string[]) {
  if (applicationIds && applicationIds.length === 0) {
    const catalog = await getScoringCatalog();
    return [
      catalog,
      {
        evalsByApp: new Map(),
        importedByApp: new Map(),
        lessonScoreByApp: new Map(),
      },
    ] as const;
  }

  const idFilter = applicationIds
    ? inArray(evaluations.applicationId, applicationIds)
    : undefined;
  const importedFilter = applicationIds
    ? inArray(importedDimensionScores.applicationId, applicationIds)
    : undefined;
  const lessonFilter = applicationIds
    ? inArray(lessonTestEvaluations.applicationId, applicationIds)
    : undefined;

  const [catalogRows, evals, imported, lessonEvals] = await db.batch([
    scoringCatalogQuery(),
    db
      .select({
        applicationId: evaluations.applicationId,
        dimensionCode: dimensions.code,
        scoreRaw: evaluations.scoreRaw,
        scaleMax: evaluations.scaleMax,
        evaluatorStaffId: evaluations.evaluatorStaffId,
        blindPeekedAt: evaluations.blindPeekedAt,
      })
      .from(evaluations)
      .innerJoin(dimensions, eq(dimensions.id, evaluations.dimensionId))
      .where(idFilter),
    db
      .select({
        applicationId: importedDimensionScores.applicationId,
        dimensionCode: dimensions.code,
        score: importedDimensionScores.score,
      })
      .from(importedDimensionScores)
      .innerJoin(
        dimensions,
        eq(dimensions.id, importedDimensionScores.dimensionId),
      )
      .where(importedFilter),
    db
      .select({
        id: lessonTestEvaluations.id,
        applicationId: lessonTestEvaluations.applicationId,
      })
      .from(lessonTestEvaluations)
      .where(lessonFilter),
  ]);

  const inputs = await foldScoreInputs(evals, imported, lessonEvals);
  return [catalogFromRows(catalogRows), inputs] as const;
}

export function assembleScoresForApplications(
  applicationIds: string[],
  catalog: ScoringCatalog,
  inputs: ScoreInputs,
  options?: { staffUserId?: string; forceReveal?: boolean },
): Map<string, ConsolidatedResult> {
  const result = new Map<string, ConsolidatedResult>();
  const dimensionCodes = catalog.dimensions.map((d) => d.code);
  for (const id of applicationIds) {
    result.set(
      id,
      assembleDimensionScores({
        dimensionCodes,
        weights: catalog.weights,
        evals: inputs.evalsByApp.get(id) ?? [],
        imported: inputs.importedByApp.get(id) ?? [],
        lessonTestScore: inputs.lessonScoreByApp.get(id) ?? null,
        staffUserId: options?.staffUserId,
        forceReveal: options?.forceReveal,
      }),
    );
  }
  return result;
}

export async function buildDimensionScoresForApplications(
  applicationIds: string[],
  options?: { staffUserId?: string; forceReveal?: boolean },
): Promise<Map<string, ConsolidatedResult>> {
  const uniqueIds = [...new Set(applicationIds)];
  if (uniqueIds.length === 0) return new Map();
  const [catalog, inputs] = await prefetchScoringData(uniqueIds);
  return assembleScoresForApplications(uniqueIds, catalog, inputs, options);
}

export async function buildDimensionScoresForApplication(
  applicationId: string,
  options?: { staffUserId?: string; forceReveal?: boolean },
): Promise<ConsolidatedResult> {
  const map = await buildDimensionScoresForApplications(
    [applicationId],
    options,
  );
  return (
    map.get(applicationId) ??
    assembleDimensionScores({
      dimensionCodes: [],
      weights: {},
      evals: [],
      imported: [],
      lessonTestScore: null,
    })
  );
}

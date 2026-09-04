import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
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
import { getOverriddenDissertativeScores } from "./answer-overrides";
import {
  assembleDimensionScores,
  average,
  canSeePeerEvaluations,
  type ConsolidatedResult,
  type DimensionGroup,
} from "@/lib/scoring";

export { canSeePeerEvaluations };

export type CatalogDimension = {
  id: string;
  code: (typeof dimensions.$inferSelect)["code"];
  name: string;
  sortOrder: number;
  /** `didatica` | `conteudo` | null — a que grupo esta parte pertence. */
  groupCode: string | null;
  /** `AT` `DO` `DD` `CD` `CO` `VD` — a pastilha do perfil. */
  shortCode: string | null;
};

export type ScoringCatalog = {
  /** Só as dimensões ativas, na ordem de leitura. */
  dimensions: CatalogDimension[];
  /** Os grupos, derivados de `groupCode`, na ordem em que aparecem. */
  groups: DimensionGroup[];
  /** Pesos do que o Resultado pondera: grupos + dimensões sem grupo. */
  weights: Record<string, number>;
  /** Pesos das partes DENTRO de cada grupo. */
  memberWeights: Record<string, number>;
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
  /** Didática dissertativa recalculada, só para quem tem override. */
  overriddenDissertativeByApp: Map<string, number>;
};

function latestWeightConfig() {
  return db
    .select({ id: weightConfigs.id })
    .from(weightConfigs)
    .orderBy(desc(weightConfigs.validFrom))
    .limit(1)
    .as("latest_weight_config");
}

/** Dimensões ativas + o peso da parte dentro do grupo, quando configurado. */
function scoringCatalogQuery() {
  const latestConfig = latestWeightConfig();

  return db
    .select({
      id: dimensions.id,
      code: dimensions.code,
      name: dimensions.name,
      sortOrder: dimensions.sortOrder,
      groupCode: dimensions.groupCode,
      shortCode: dimensions.shortCode,
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
    .where(eq(dimensions.active, true))
    .orderBy(dimensions.sortOrder);
}

/**
 * Pesos dos ITENS do Resultado — as linhas com `group_code`.
 *
 * `group_code` guarda o código do item ponderado, que é o grupo ("didatica",
 * "conteudo") ou a própria dimensão quando ela não pertence a grupo nenhum
 * ("aula_teste", "video"). As linhas com `dimension_id` são o outro nível: o
 * peso da parte DENTRO de um grupo.
 */
function itemWeightsQuery() {
  const latestConfig = latestWeightConfig();

  return db
    .select({
      groupCode: weightConfigItems.groupCode,
      weight: weightConfigItems.weight,
    })
    .from(weightConfigItems)
    .innerJoin(latestConfig, eq(weightConfigItems.weightConfigId, latestConfig.id))
    .where(isNotNull(weightConfigItems.groupCode));
}

type CatalogRows = Awaited<ReturnType<typeof scoringCatalogQuery>>;
type ItemRows = Awaited<ReturnType<typeof itemWeightsQuery>>;

function catalogFromRows(
  rows: CatalogRows,
  itemRows: ItemRows,
): ScoringCatalog {
  const dimensionList: CatalogDimension[] = rows.map(
    ({ id, code, name, sortOrder, groupCode, shortCode }) => ({
      id,
      code,
      name,
      sortOrder,
      groupCode,
      shortCode,
    }),
  );

  // Grupos derivados das próprias dimensões, na ordem de `sort_order`. Não há
  // catálogo de grupos separado para sair de sincronia com este.
  const groups: DimensionGroup[] = [];
  for (const dim of dimensionList) {
    if (!dim.groupCode) continue;
    const existing = groups.find((g) => g.code === dim.groupCode);
    if (existing) existing.members.push(dim.code);
    else groups.push({ code: dim.groupCode, members: [dim.code] });
  }

  // O peso da parte dentro do grupo. Sem configuração, 1 para todas — média
  // simples, em vez de um grupo zerado.
  const memberWeights: Record<string, number> = {};
  for (const dim of rows) {
    if (!dim.groupCode) continue;
    memberWeights[dim.code] = dim.weight === null ? 1 : Number(dim.weight);
  }

  // O que o Resultado pondera: um item por grupo, mais as dimensões soltas.
  const items = [
    ...groups.map((g) => g.code),
    ...dimensionList.filter((d) => !d.groupCode).map((d) => d.code),
  ];
  const configured = new Map(
    itemRows
      .filter((r) => r.groupCode !== null)
      .map((r) => [r.groupCode as string, Number(r.weight)]),
  );

  const hasWeights = configured.size > 0;
  const equal = items.length > 0 ? 1 / items.length : 0;
  const weights: Record<string, number> = {};
  for (const item of items) {
    weights[item] = hasWeights ? (configured.get(item) ?? 0) : equal;
  }

  return { dimensions: dimensionList, groups, weights, memberWeights };
}

export async function getScoringCatalog(): Promise<ScoringCatalog> {
  const [rows, itemRows] = await Promise.all([
    scoringCatalogQuery(),
    itemWeightsQuery(),
  ]);
  return catalogFromRows(rows, itemRows);
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
  overriddenDissertativeByApp: Map<string, number>,
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
    const scoresByEval = new Map<string, number[]>();
    for (const s of scores) {
      const list = scoresByEval.get(s.evalId) ?? [];
      list.push(Number(s.score));
      scoresByEval.set(s.evalId, list);
    }

    const evalAveragesByApp = new Map<string, number[]>();
    for (const [evalId, criterionScores] of scoresByEval) {
      const appId = appByEval.get(evalId);
      if (!appId) continue;
      const evalAvg = average(criterionScores);
      if (evalAvg === null) continue;
      const list = evalAveragesByApp.get(appId) ?? [];
      list.push(evalAvg);
      evalAveragesByApp.set(appId, list);
    }

    for (const [appId, evaluatorAverages] of evalAveragesByApp) {
      lessonScoreByApp.set(appId, average(evaluatorAverages));
    }
  }

  return {
    evalsByApp,
    importedByApp,
    lessonScoreByApp,
    overriddenDissertativeByApp,
  };
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
        overriddenDissertativeByApp: new Map(),
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

  // O lote e os overrides não dependem um do outro. Em série somavam dois
  // round-trips ao banco por render do Painel.
  const [[catalogRows, itemRows, evals, imported, lessonEvals], overridden] =
    await Promise.all([
      db.batch([
        scoringCatalogQuery(),
        itemWeightsQuery(),
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
      ]),
      // Só quem tem override entra nesta consulta; para o resto ela devolve
      // vazio e o valor importado segue valendo.
      getOverriddenDissertativeScores(applicationIds),
    ]);

  const inputs = await foldScoreInputs(evals, imported, lessonEvals, overridden);
  return [catalogFromRows(catalogRows, itemRows), inputs] as const;
}

/**
 * Hoje só a didática dissertativa tem override por pergunta; o formato de mapa
 * por código já deixa o caminho pronto para a próxima dimensão que tiver.
 */
function overriddenFor(
  inputs: ScoreInputs,
  applicationId: string,
): Record<string, number> | undefined {
  const value = inputs.overriddenDissertativeByApp.get(applicationId);
  return value === undefined ? undefined : { didatica_dissertativa: value };
}

export function assembleScoresForApplications(
  applicationIds: string[],
  catalog: ScoringCatalog,
  inputs: ScoreInputs,
  options?: {
    staffUserId?: string;
    forceReveal?: boolean;
    /** Por candidatura: códigos de dimensão que o usuário revelou. */
    peeksByApp?: Map<string, ReadonlySet<string>>;
  },
): Map<string, ConsolidatedResult> {
  const result = new Map<string, ConsolidatedResult>();
  const dimensionCodes = catalog.dimensions.map((d) => d.code);
  for (const id of applicationIds) {
    result.set(
      id,
      assembleDimensionScores({
        dimensionCodes,
        groups: catalog.groups,
        memberWeights: catalog.memberWeights,
        weights: catalog.weights,
        evals: inputs.evalsByApp.get(id) ?? [],
        imported: inputs.importedByApp.get(id) ?? [],
        overridden: overriddenFor(inputs, id),
        lessonTestScore: inputs.lessonScoreByApp.get(id) ?? null,
        staffUserId: options?.staffUserId,
        forceReveal: options?.forceReveal,
        peekedDimensionCodes: options?.peeksByApp?.get(id),
      }),
    );
  }
  return result;
}

export async function buildDimensionScoresForApplications(
  applicationIds: string[],
  options?: {
    staffUserId?: string;
    forceReveal?: boolean;
    peeksByApp?: Map<string, ReadonlySet<string>>;
  },
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

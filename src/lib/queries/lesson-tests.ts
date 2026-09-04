import { unstable_cache } from "next/cache";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  lessonTestCriteria,
  lessonTestEvaluations,
  lessonTestScores,
  staffUsers,
} from "@/lib/db/schema";
import { lessonTestCriterionHints } from "@/lib/labels";

export type LessonTestCriterion = {
  id: string;
  code: string;
  name: string;
  /** O que o critério afere. Vazio quando ninguém escreveu a pergunta ainda. */
  hint: string | null;
  sortOrder: number;
};

/**
 * Os 14 critérios da aula-teste.
 *
 * Catálogo puro: 14 linhas que mudam quando alguém decide mudar a ficha de
 * avaliação, ou seja, quase nunca. Cacheado sem tag porque nenhuma escrita da
 * aplicação o altera — o seed e uma migração são os únicos caminhos.
 */
const cachedCriteria = unstable_cache(
  async (): Promise<LessonTestCriterion[]> => {
    const rows = await db
      .select({
        id: lessonTestCriteria.id,
        code: lessonTestCriteria.code,
        name: lessonTestCriteria.name,
        sortOrder: lessonTestCriteria.sortOrder,
      })
      .from(lessonTestCriteria)
      .orderBy(asc(lessonTestCriteria.sortOrder));

    return rows.map((row) => ({
      ...row,
      hint: lessonTestCriterionHints[row.code] ?? null,
    }));
  },
  ["lesson-test-criteria-v1"],
  { revalidate: 3600 },
);

export async function getLessonTestCriteria(): Promise<LessonTestCriterion[]> {
  try {
    return await cachedCriteria();
  } catch (err) {
    // Fora do runtime Next (scripts/bench) não há Incremental Cache.
    if (
      err instanceof Error &&
      err.message.includes("incrementalCache missing")
    ) {
      const rows = await db
        .select({
          id: lessonTestCriteria.id,
          code: lessonTestCriteria.code,
          name: lessonTestCriteria.name,
          sortOrder: lessonTestCriteria.sortOrder,
        })
        .from(lessonTestCriteria)
        .orderBy(asc(lessonTestCriteria.sortOrder));
      return rows.map((row) => ({
        ...row,
        hint: lessonTestCriterionHints[row.code] ?? null,
      }));
    }
    throw err;
  }
}

export type LessonTestRecord = {
  id: string;
  evaluatorStaffId: string;
  evaluatorName: string;
  evaluatedAt: Date | null;
  comment: string | null;
  /** Só os critérios pontuados. Critério em branco não é zero — ele não está. */
  scores: Array<{ criterionId: string; name: string; score: number }>;
};

/**
 * As avaliações de aula-teste de uma candidatura, com o id de cada critério.
 *
 * O id é o que permite reabrir o formulário já preenchido; a página do
 * professor mostrava só o nome, o que bastava para ler e não para editar. Uma
 * candidatura pode ter várias aulas-teste (avaliadores diferentes, ou a mesma
 * pessoa em vagas diferentes) e a nota da dimensão é a média das médias.
 */
export async function getLessonTestsForApplications(
  applicationIds: string[],
): Promise<Map<string, LessonTestRecord[]>> {
  if (applicationIds.length === 0) return new Map();

  const evaluationRows = await db
    .select({
      id: lessonTestEvaluations.id,
      applicationId: lessonTestEvaluations.applicationId,
      evaluatorStaffId: lessonTestEvaluations.evaluatorStaffId,
      evaluatorName: staffUsers.name,
      evaluatedAt: lessonTestEvaluations.evaluatedAt,
      comment: lessonTestEvaluations.comment,
    })
    .from(lessonTestEvaluations)
    .leftJoin(
      staffUsers,
      eq(staffUsers.id, lessonTestEvaluations.evaluatorStaffId),
    )
    .where(inArray(lessonTestEvaluations.applicationId, applicationIds));

  if (evaluationRows.length === 0) return new Map();

  const scoreRows = await db
    .select({
      evaluationId: lessonTestScores.lessonTestEvaluationId,
      criterionId: lessonTestScores.criterionId,
      name: lessonTestCriteria.name,
      sortOrder: lessonTestCriteria.sortOrder,
      score: lessonTestScores.score,
    })
    .from(lessonTestScores)
    .innerJoin(
      lessonTestCriteria,
      eq(lessonTestCriteria.id, lessonTestScores.criterionId),
    )
    .where(
      inArray(
        lessonTestScores.lessonTestEvaluationId,
        evaluationRows.map((e) => e.id),
      ),
    );

  const byEvaluation = new Map<string, typeof scoreRows>();
  for (const row of scoreRows) {
    const list = byEvaluation.get(row.evaluationId) ?? [];
    list.push(row);
    byEvaluation.set(row.evaluationId, list);
  }

  const byApplication = new Map<string, LessonTestRecord[]>();
  for (const evaluation of evaluationRows) {
    const list = byApplication.get(evaluation.applicationId) ?? [];
    list.push({
      id: evaluation.id,
      evaluatorStaffId: evaluation.evaluatorStaffId,
      evaluatorName: evaluation.evaluatorName ?? "Avaliador não identificado",
      evaluatedAt: evaluation.evaluatedAt,
      comment: evaluation.comment,
      scores: (byEvaluation.get(evaluation.id) ?? [])
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((s) => ({
          criterionId: s.criterionId,
          name: s.name,
          score: Number(s.score),
        })),
    });
    byApplication.set(evaluation.applicationId, list);
  }

  return byApplication;
}

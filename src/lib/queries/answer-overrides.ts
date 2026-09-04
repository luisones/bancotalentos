import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { llmEvaluations, subjectiveAnswers } from "@/lib/db/schema";
import { computeAprDisF, computeQnF } from "@/lib/scoring";

/** As 4 perguntas dissertativas. A fórmula da nota depende de serem 4. */
export const DISSERTATIVE_QUESTION_COUNT = 4;

export type AnswerScore = {
  answerId: string;
  applicationId: string;
  /** Nota do ensemble de LLM, escala 0–30. `null` quando não foi avaliada. */
  ensemble: number | null;
  /** Nota humana que substitui a do ensemble nesta pergunta, escala 0–30. */
  override: number | null;
  /** A que vale: override quando existe, ensemble caso contrário. */
  effective: number | null;
};

/** Notas por resposta, com o ensemble já calculado. */
export async function getAnswerScores(
  applicationIds: string[],
): Promise<Map<string, AnswerScore[]>> {
  if (applicationIds.length === 0) return new Map();

  const rows = await db
    .select({
      answerId: subjectiveAnswers.id,
      applicationId: subjectiveAnswers.applicationId,
      override: subjectiveAnswers.overrideScore,
      providerCode: llmEvaluations.providerCode,
      providerScore: llmEvaluations.scoreRaw,
    })
    .from(subjectiveAnswers)
    .leftJoin(llmEvaluations, eq(llmEvaluations.answerId, subjectiveAnswers.id))
    .where(inArray(subjectiveAnswers.applicationId, applicationIds));

  const providersByAnswer = new Map<
    string,
    { applicationId: string; override: string | null; providers: Record<string, number> }
  >();

  for (const row of rows) {
    let entry = providersByAnswer.get(row.answerId);
    if (!entry) {
      entry = {
        applicationId: row.applicationId,
        override: row.override,
        providers: {},
      };
      providersByAnswer.set(row.answerId, entry);
    }
    if (row.providerCode && row.providerScore !== null) {
      entry.providers[row.providerCode] = Number(row.providerScore);
    }
  }

  const byApp = new Map<string, AnswerScore[]>();
  for (const [answerId, entry] of providersByAnswer) {
    const ensemble = computeQnF(entry.providers);
    const override = entry.override === null ? null : Number(entry.override);
    const score: AnswerScore = {
      answerId,
      applicationId: entry.applicationId,
      ensemble,
      override,
      effective: override ?? ensemble,
    };
    const list = byApp.get(entry.applicationId) ?? [];
    list.push(score);
    byApp.set(entry.applicationId, list);
  }

  return byApp;
}

/**
 * Nota de didática dissertativa recalculada a partir dos overrides.
 *
 * Só as candidaturas que TÊM algum override entram aqui — para as demais o
 * valor importado continua valendo e o custo é zero. É por isso que a consulta
 * começa filtrando por `override_score is not null` em vez de varrer as 2.748
 * respostas do banco.
 *
 * O recálculo exige as QUATRO perguntas com nota. `Apr Dis (F)` é
 * `10 * (Q1F+Q2F+Q3F+Q4F) / 120`: com três notas o denominador continua 120 e o
 * resultado seria artificialmente baixo. Em 2026 há 171 candidaturas que nunca
 * passaram pela avaliação de LLM — um override solto numa delas produziria
 * exatamente esse número enganoso. Nesse caso devolvemos nada e o sistema segue
 * com o que já tinha.
 */
export async function getOverriddenDissertativeScores(
  applicationIds?: string[],
): Promise<Map<string, number>> {
  const withOverride = await db
    .selectDistinct({ applicationId: subjectiveAnswers.applicationId })
    .from(subjectiveAnswers)
    .where(
      applicationIds
        ? and(
            isNotNull(subjectiveAnswers.overrideScore),
            inArray(subjectiveAnswers.applicationId, applicationIds),
          )
        : isNotNull(subjectiveAnswers.overrideScore),
    );

  const ids = withOverride.map((r) => r.applicationId);
  if (ids.length === 0) return new Map();

  const byApp = await getAnswerScores(ids);
  const result = new Map<string, number>();

  for (const [applicationId, answers] of byApp) {
    const effective = answers
      .map((a) => a.effective)
      .filter((v): v is number => v !== null);
    if (effective.length !== DISSERTATIVE_QUESTION_COUNT) continue;
    const [q1, q2, q3, q4] = effective;
    result.set(applicationId, computeAprDisF(q1, q2, q3, q4));
  }

  return result;
}

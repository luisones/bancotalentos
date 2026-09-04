import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  dimensions,
  evaluations,
  instruments,
  subjectiveAnswers,
} from "@/lib/db/schema";
import { labelFor, dimensionLabels } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { normalizeScore } from "@/lib/scoring";
import { getAnswerScores } from "./answer-overrides";
import {
  getLessonTestCriteria,
  getLessonTestsForApplications,
  type LessonTestCriterion,
} from "./lesson-tests";

/**
 * O que os popovers do Painel abrem.
 *
 * Não vai no payload da lista: são 14 critérios, 4 respostas dissertativas e a
 * nota própria de vídeo POR candidatura — multiplicado por 707 linhas seria um
 * megabyte de RSC para servir o punhado de células que alguém realmente clica.
 * Vem sob demanda, num round-trip, e o island guarda por candidatura.
 *
 * O que NÃO está aqui de propósito: as notas efetivas (Resultado, aula-teste,
 * didática, vídeo). A linha do Painel já as tem — pedi-las de novo seria
 * pontuar o banco inteiro para confirmar um número que está na tela.
 */
export type PainelDetail = {
  applicationId: string;
  canWrite: boolean;

  /** Catálogo do formulário de aula-teste. */
  criteria: LessonTestCriterion[];
  lessonTests: Array<{
    id: string;
    evaluatorName: string;
    date: string | null;
    comment: string | null;
    /** Média dos critérios desta avaliação. */
    average: number | null;
    scores: Array<{ criterionId: string; name: string; score: number }>;
  }>;
  /**
   * A avaliação de aula-teste DESTE avaliador, para reabrir o formulário
   * preenchido. Nunca a de outro — garantido aqui, não na interface.
   */
  ownLessonTest: {
    id: string;
    comment: string | null;
    scores: Record<string, number>;
  } | null;

  /** As dissertativas de didática, com a nota que vale em porcentagem. */
  answers: Array<{
    answerId: string;
    order: string;
    prompt: string;
    text: string;
    ensemblePercent: number | null;
    overridePercent: number | null;
    effectivePercent: number | null;
  }>;

  aulaTesteDimensionId: string | null;
  videoDimensionId: string | null;
  /** A própria nota de vídeo, se houver. */
  videoOwn: { score: number; comment: string | null; updatedAt: string } | null;
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export async function getPainelDetail(
  applicationId: string,
  staffUserId: string,
  canWrite: boolean,
): Promise<PainelDetail> {
  const [criteria, lessonTestsByApp, dimensionRows, answerRows, ownEvalRows] =
    await Promise.all([
      getLessonTestCriteria(),
      getLessonTestsForApplications([applicationId]),
      db
        .select({ id: dimensions.id, code: dimensions.code })
        .from(dimensions)
        .where(inArray(dimensions.code, ["aula_teste", "video"])),
      db
        .select({
          answerId: subjectiveAnswers.id,
          answerText: subjectiveAnswers.answerText,
          code: instruments.code,
          promptText: instruments.promptText,
          scaleMax: instruments.scaleMax,
        })
        .from(subjectiveAnswers)
        .innerJoin(
          instruments,
          eq(instruments.id, subjectiveAnswers.instrumentId),
        )
        .where(eq(subjectiveAnswers.applicationId, applicationId)),
      db
        .select({
          dimensionCode: dimensions.code,
          scoreRaw: evaluations.scoreRaw,
          scaleMax: evaluations.scaleMax,
          comment: evaluations.comment,
          updatedAt: evaluations.updatedAt,
        })
        .from(evaluations)
        .innerJoin(dimensions, eq(dimensions.id, evaluations.dimensionId))
        .where(
          and(
            eq(evaluations.applicationId, applicationId),
            eq(evaluations.evaluatorStaffId, staffUserId),
          ),
        ),
    ]);

  const scoreByAnswerId = new Map(
    [...(await getAnswerScores([applicationId])).values()]
      .flat()
      .map((s) => [s.answerId, s]),
  );

  const toPercent = (value: number | null, scaleMax: number) =>
    value === null || scaleMax <= 0 ? null : (value / scaleMax) * 100;

  const answers = answerRows
    .map((row) => {
      const score = scoreByAnswerId.get(row.answerId);
      const scaleMax = Number(row.scaleMax);
      return {
        answerId: row.answerId,
        order: row.code,
        prompt: row.promptText ?? row.code,
        text: row.answerText ?? "",
        ensemblePercent: toPercent(score?.ensemble ?? null, scaleMax),
        overridePercent: toPercent(score?.override ?? null, scaleMax),
        effectivePercent: toPercent(score?.effective ?? null, scaleMax),
      };
    })
    .sort((a, b) => a.order.localeCompare(b.order));

  const records = lessonTestsByApp.get(applicationId) ?? [];
  const own = records.find((r) => r.evaluatorStaffId === staffUserId) ?? null;

  const dimensionId = (code: string) =>
    dimensionRows.find((d) => d.code === code)?.id ?? null;

  const videoOwnRow = ownEvalRows.find((r) => r.dimensionCode === "video");

  return {
    applicationId,
    canWrite,
    criteria,
    lessonTests: records.map((record) => ({
      id: record.id,
      evaluatorName: record.evaluatorName,
      date: record.evaluatedAt ? formatDate(record.evaluatedAt) : null,
      comment: record.comment,
      average: average(record.scores.map((s) => s.score)),
      scores: record.scores,
    })),
    ownLessonTest: own
      ? {
          id: own.id,
          comment: own.comment,
          scores: Object.fromEntries(
            own.scores.map((s) => [s.criterionId, s.score]),
          ),
        }
      : null,
    answers,
    aulaTesteDimensionId: dimensionId("aula_teste"),
    videoDimensionId: dimensionId("video"),
    videoOwn: videoOwnRow
      ? {
          score: normalizeScore(
            Number(videoOwnRow.scoreRaw),
            Number(videoOwnRow.scaleMax),
          ),
          comment: videoOwnRow.comment,
          updatedAt: formatDate(videoOwnRow.updatedAt),
        }
      : null,
  };
}

/** Rótulo da dimensão, para o cabeçalho dos popovers. */
export function dimensionTitle(code: string): string {
  return labelFor(dimensionLabels, code);
}

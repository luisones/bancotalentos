"use server";

import { and, eq, isNull } from "drizzle-orm";
import { canWrite, requireStaff } from "@/lib/auth/staff";
import { db } from "@/lib/db";
import {
  auditEvents,
  blindPeeks,
  evaluationRevisions,
  evaluations,
  lessonTestEvaluations,
  lessonTestScores,
  subjectiveAnswers,
} from "@/lib/db/schema";
import { getLessonTestCriteria } from "@/lib/queries/lesson-tests";
import { err, ok, type ActionResult } from "./result";
import { revalidateCandidateScoreViews } from "./revalidate";

export type SaveEvaluationInput = {
  applicationId: string;
  dimensionId: string;
  instrumentId?: string | null;
  score: number;
  comment?: string | null;
};

export type SaveEvaluationResult = {
  evaluationId: string;
  score: number;
  /** Houve mudança de nota numa avaliação existente, gerando revisão. */
  revisionCreated: boolean;
};

export async function saveEvaluation(
  input: SaveEvaluationInput,
): Promise<ActionResult<SaveEvaluationResult>> {
  const staff = await requireStaff(["admin", "avaliador"]);
  if (!canWrite(staff)) return err("sem_permissao");

  // A faixa só era validada no cliente, então a action aceitava -5 e 999
  // de qualquer chamador.
  if (!Number.isFinite(input.score)) return err("nota_invalida", "score");
  if (input.score < 0 || input.score > 10) {
    return err("nota_fora_da_faixa", "score");
  }

  const scaleMax = "10";
  const conditions = [
    eq(evaluations.applicationId, input.applicationId),
    eq(evaluations.dimensionId, input.dimensionId),
    eq(evaluations.evaluatorStaffId, staff.id),
  ];

  const existing = await db
    .select()
    .from(evaluations)
    .where(and(...conditions))
    .limit(1);

  const match = existing.find((e) =>
    input.instrumentId
      ? e.instrumentId === input.instrumentId
      : e.instrumentId === null,
  );

  let evaluationId: string;
  let revisionCreated = false;

  if (match) {
    const prev = match;
    evaluationId = prev.id;
    await db
      .update(evaluations)
      .set({
        scoreRaw: String(input.score),
        comment: input.comment ?? null,
        updatedAt: new Date(),
      })
      .where(eq(evaluations.id, prev.id));

    if (Number(prev.scoreRaw) !== input.score) {
      await db.insert(evaluationRevisions).values({
        evaluationId: prev.id,
        previousScore: prev.scoreRaw,
        newScore: String(input.score),
        changedByStaffId: staff.id,
      });
      revisionCreated = true;
    }
  } else {
    const [created] = await db
      .insert(evaluations)
      .values({
        applicationId: input.applicationId,
        dimensionId: input.dimensionId,
        instrumentId: input.instrumentId ?? null,
        evaluatorStaffId: staff.id,
        scoreRaw: String(input.score),
        scaleMax,
        comment: input.comment ?? null,
      })
      .returning({ id: evaluations.id });
    evaluationId = created.id;
  }

  await db.insert(auditEvents).values({
    staffId: staff.id,
    action: "evaluation_saved",
    entityType: "application",
    entityId: input.applicationId,
    metadata: { dimensionId: input.dimensionId, score: input.score },
  });

  revalidateCandidateScoreViews();
  return ok({ evaluationId, score: input.score, revisionCreated });
}

export type SaveLessonTestInput = {
  applicationId: string;
  /** Nota por critério, 0–10. Critério ausente do objeto NÃO é zero: é ausência. */
  scores: Record<string, number>;
  comment?: string | null;
};

export type SaveLessonTestResult = {
  lessonTestEvaluationId: string;
  /** Média dos critérios pontuados — é ela que alimenta a dimensão Aula-teste. */
  average: number;
  criteriaCount: number;
};

/**
 * Avaliação de aula-teste por critérios.
 *
 * É a ÚNICA forma de lançar aula-teste, e não um detalhe da nota 0–10 que
 * existia antes. A razão está em `assembleDimensionScores`: quando há critérios
 * lançados, a média deles vence qualquer linha de `evaluations` para
 * `aula_teste`. As duas formas conviveram por um tempo, e o resultado é que o
 * campo 0–10 aceitava uma nota que o cálculo ignorava em silêncio — o banco
 * tinha 18 aulas com critérios e zero linhas de `evaluations` para a dimensão.
 *
 * Por isso não se grava nada em `evaluations` aqui. A nota da dimensão é
 * derivada, e derivá-la duas vezes é o que criava a divergência.
 *
 * Critério em branco fica FORA: a média é sobre o que foi observado. Entrar
 * como zero faria "não deu tempo de ver a lousa" pesar igual a "a lousa estava
 * ilegível".
 */
export async function saveLessonTest(
  input: SaveLessonTestInput,
): Promise<ActionResult<SaveLessonTestResult>> {
  const staff = await requireStaff(["admin", "avaliador"]);
  if (!canWrite(staff)) return err("sem_permissao");

  const entries = Object.entries(input.scores);
  if (entries.length === 0) return err("nota_invalida", "scores");

  for (const [, score] of entries) {
    if (!Number.isFinite(score)) return err("nota_invalida", "scores");
    if (score < 0 || score > 10) return err("nota_fora_da_faixa", "scores");
  }

  // Os ids de critério vêm do cliente e vão direto para uma FK. Sem esta
  // checagem, um id inexistente só falharia no INSERT — depois do DELETE, com
  // a avaliação anterior já apagada.
  const criteria = await getLessonTestCriteria();
  const known = new Set(criteria.map((c) => c.id));
  if (entries.some(([criterionId]) => !known.has(criterionId))) {
    return err("dimensao_invalida", "scores");
  }

  const comment = input.comment?.trim() || null;

  // A avaliação DESTE avaliador nesta candidatura, entre as lançadas pela
  // interface. As importadas têm `external_ref` e não se reescrevem.
  const [existing] = await db
    .select({ id: lessonTestEvaluations.id })
    .from(lessonTestEvaluations)
    .where(
      and(
        eq(lessonTestEvaluations.applicationId, input.applicationId),
        eq(lessonTestEvaluations.evaluatorStaffId, staff.id),
        isNull(lessonTestEvaluations.externalRef),
      ),
    )
    .limit(1);

  let evaluationId: string;

  const rows = entries.map(([criterionId, score]) => ({
    criterionId,
    score: String(score),
  }));

  if (existing) {
    evaluationId = existing.id;
    // Reescrita completa, e não upsert por critério: um critério que o
    // avaliador APAGOU tem de sair da média, e um upsert o deixaria lá.
    //
    // Num `batch`, e não em awaits separados: o driver `neon-http` não tem
    // transação, mas o batch vai num request só e o Neon o executa dentro de
    // uma. Solto, um INSERT que falhasse deixaria a avaliação APAGADA — o
    // avaliador veria "não foi enviada" e teria perdido a nota que já existia.
    await db.batch([
      db
        .update(lessonTestEvaluations)
        .set({ comment, evaluatedAt: new Date() })
        .where(eq(lessonTestEvaluations.id, evaluationId)),
      db
        .delete(lessonTestScores)
        .where(eq(lessonTestScores.lessonTestEvaluationId, evaluationId)),
      db.insert(lessonTestScores).values(
        rows.map((row) => ({ ...row, lessonTestEvaluationId: evaluationId })),
      ),
    ]);
  } else {
    const [created] = await db
      .insert(lessonTestEvaluations)
      .values({
        applicationId: input.applicationId,
        evaluatorStaffId: staff.id,
        comment,
        evaluatedAt: new Date(),
      })
      .returning({ id: lessonTestEvaluations.id });
    evaluationId = created.id;

    await db.insert(lessonTestScores).values(
      rows.map((row) => ({ ...row, lessonTestEvaluationId: evaluationId })),
    );
  }

  const average =
    entries.reduce((sum, [, score]) => sum + score, 0) / entries.length;

  await db.insert(auditEvents).values({
    staffId: staff.id,
    action: "lesson_test_saved",
    entityType: "application",
    entityId: input.applicationId,
    metadata: {
      criterios: entries.length,
      media: Number(average.toFixed(3)),
      edicao: Boolean(existing),
    },
  });

  revalidateCandidateScoreViews();
  return ok({
    lessonTestEvaluationId: evaluationId,
    average,
    criteriaCount: entries.length,
  });
}

/**
 * Substitui a nota do ensemble de LLM numa pergunta dissertativa.
 *
 * A UI trabalha em porcentagem (0–100), que é como o avaliador lê "quão boa foi
 * esta resposta". O banco guarda na escala dos provedores (0–30), a mesma de
 * `llm_evaluations` — assim o override e o que ele substitui são diretamente
 * comparáveis, e `computeAprDisF` continua recebendo a entrada que espera.
 *
 * `percent = null` remove o override e devolve a pergunta ao ensemble.
 */
export async function overrideAnswerScore(input: {
  answerId: string;
  candidateId: string;
  /** 0 a 100, ou `null` para voltar à nota do ensemble. */
  percent: number | null;
}): Promise<ActionResult<{ percent: number | null }>> {
  const staff = await requireStaff(["admin", "avaliador"]);
  if (!canWrite(staff)) return err("sem_permissao");

  if (input.percent !== null) {
    if (!Number.isFinite(input.percent)) return err("nota_invalida", "percent");
    if (input.percent < 0 || input.percent > 100) {
      return err("nota_fora_da_faixa", "percent");
    }
  }

  const [current] = await db
    .select({
      id: subjectiveAnswers.id,
      overrideScore: subjectiveAnswers.overrideScore,
    })
    .from(subjectiveAnswers)
    .where(eq(subjectiveAnswers.id, input.answerId))
    .limit(1);

  if (!current) return err("candidatura_invalida");

  const raw =
    input.percent === null ? null : ((input.percent / 100) * 30).toFixed(3);

  await db
    .update(subjectiveAnswers)
    .set({
      overrideScore: raw,
      overrideByStaffId: input.percent === null ? null : staff.id,
      overrideAt: input.percent === null ? null : new Date(),
    })
    .where(eq(subjectiveAnswers.id, input.answerId));

  const toPercent = (value: string | null) =>
    value === null ? null : (Number(value) / 30) * 100;

  await db.insert(auditEvents).values({
    staffId: staff.id,
    action: "answer_override",
    entityType: "subjective_answer",
    entityId: input.answerId,
    metadata: {
      de: toPercent(current.overrideScore),
      para: input.percent,
    },
  });

  revalidateCandidateScoreViews();
  return ok({ percent: input.percent });
}

export async function peekBlindEvaluation(
  evaluationId: string,
): Promise<ActionResult> {
  const staff = await requireStaff(["admin", "avaliador"]);
  if (!canWrite(staff)) return err("sem_permissao");

  await db
    .update(evaluations)
    .set({ blindPeekedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(evaluations.id, evaluationId),
        eq(evaluations.evaluatorStaffId, staff.id),
      ),
    );

  await db.insert(auditEvents).values({
    staffId: staff.id,
    action: "blind_peek",
    entityType: "evaluation",
    entityId: evaluationId,
  });

  revalidateCandidateScoreViews();
  return ok();
}

export async function peekBlindForDimension(
  applicationId: string,
  dimensionId: string,
): Promise<ActionResult> {
  const staff = await requireStaff(["admin", "avaliador"]);
  if (!canWrite(staff)) return err("sem_permissao");

  // Registro próprio, e não UPDATE nas linhas do próprio avaliador — que
  // afetava zero linhas justamente para quem ainda não avaliou.
  await db
    .insert(blindPeeks)
    .values({ staffId: staff.id, applicationId, dimensionId })
    .onConflictDoNothing();

  await db.insert(auditEvents).values({
    staffId: staff.id,
    action: "blind_peek_dimension",
    entityType: "application",
    entityId: applicationId,
    metadata: { dimensionId },
  });

  revalidateCandidateScoreViews();
  return ok();
}

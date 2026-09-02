"use server";

import { and, eq } from "drizzle-orm";
import { canWrite, requireStaff } from "@/lib/auth/staff";
import { db } from "@/lib/db";
import {
  auditEvents,
  blindPeeks,
  evaluationRevisions,
  evaluations,
} from "@/lib/db/schema";
import { err, ok, type ActionResult } from "./result";
import { revalidateCandidateViews } from "./revalidate";

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

  revalidateCandidateViews();
  return ok({ evaluationId, score: input.score, revisionCreated });
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

  revalidateCandidateViews();
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

  revalidateCandidateViews();
  return ok();
}

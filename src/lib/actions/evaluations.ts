"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { canWrite, requireStaff } from "@/lib/auth/staff";
import { db } from "@/lib/db";
import {
  auditEvents,
  evaluationRevisions,
  evaluations,
} from "@/lib/db/schema";

export type SaveEvaluationInput = {
  applicationId: string;
  dimensionId: string;
  instrumentId?: string | null;
  score: number;
  comment?: string | null;
};

export async function saveEvaluation(input: SaveEvaluationInput) {
  const staff = await requireStaff(["admin", "avaliador"]);
  if (!canWrite(staff)) throw new Error("Sem permissão de escrita");

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

  if (match) {
    const prev = match;
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
    }
  } else {
    await db.insert(evaluations).values({
      applicationId: input.applicationId,
      dimensionId: input.dimensionId,
      instrumentId: input.instrumentId ?? null,
      evaluatorStaffId: staff.id,
      scoreRaw: String(input.score),
      scaleMax,
      comment: input.comment ?? null,
    });
  }

  await db.insert(auditEvents).values({
    staffId: staff.id,
    action: "evaluation_saved",
    entityType: "application",
    entityId: input.applicationId,
    metadata: { dimensionId: input.dimensionId, score: input.score },
  });

  revalidatePath("/ranking");
  revalidatePath(`/candidatos`);
  return { success: true };
}

export async function peekBlindEvaluation(evaluationId: string) {
  const staff = await requireStaff(["admin", "avaliador"]);
  if (!canWrite(staff)) throw new Error("Sem permissão de escrita");

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

  revalidatePath("/ranking");
  revalidatePath(`/candidatos`);
  return { success: true };
}

export async function peekBlindForDimension(
  applicationId: string,
  dimensionId: string,
) {
  const staff = await requireStaff(["admin", "avaliador"]);

  await db
    .update(evaluations)
    .set({ blindPeekedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(evaluations.applicationId, applicationId),
        eq(evaluations.dimensionId, dimensionId),
        eq(evaluations.evaluatorStaffId, staff.id),
      ),
    );

  await db.insert(auditEvents).values({
    staffId: staff.id,
    action: "blind_peek_dimension",
    entityType: "application",
    entityId: applicationId,
    metadata: { dimensionId },
  });

  revalidatePath("/ranking");
  revalidatePath(`/candidatos`);
  return { success: true };
}

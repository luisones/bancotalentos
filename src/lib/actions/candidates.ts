"use server";

import { revalidatePath } from "next/cache";
import { canWrite, requireStaff } from "@/lib/auth/staff";
import { db } from "@/lib/db";
import { applications, auditEvents, candidates } from "@/lib/db/schema";

export type CreateCandidateInput = {
  fullName: string;
  email?: string;
  phone?: string;
  city?: string;
  englishLevel?: string;
  disciplineId?: string;
  campaignId?: string;
  candidateObservation?: string;
  differentialText?: string;
};

export async function createCandidate(input: CreateCandidateInput) {
  const staff = await requireStaff(["admin", "avaliador"]);
  if (!canWrite(staff)) throw new Error("Sem permissão de escrita");

  const [candidate] = await db
    .insert(candidates)
    .values({
      fullName: input.fullName,
      email: input.email ?? null,
      phone: input.phone ?? null,
      city: input.city ?? null,
      englishLevel: input.englishLevel ?? null,
      origin: "manual",
    })
    .returning();

  const [application] = await db
    .insert(applications)
    .values({
      candidateId: candidate.id,
      campaignId: input.campaignId ?? null,
      disciplineId: input.disciplineId ?? null,
      source: "manual",
      candidateObservation: input.candidateObservation ?? null,
      differentialText: input.differentialText ?? null,
      appliedAt: new Date(),
    })
    .returning();

  await db.insert(auditEvents).values({
    staffId: staff.id,
    action: "candidate_created",
    entityType: "candidate",
    entityId: candidate.id,
    metadata: { applicationId: application.id },
  });

  revalidatePath("/");
  revalidatePath("/ranking");
  return { success: true, candidateId: candidate.id };
}

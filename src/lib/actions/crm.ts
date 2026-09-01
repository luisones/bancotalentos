"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { canWrite, requireStaff } from "@/lib/auth/staff";
import { db } from "@/lib/db";
import {
  applicationTags,
  applications,
  auditEvents,
  candidates,
  contacts,
  notes,
  tags,
} from "@/lib/db/schema";

export async function addContact(input: {
  candidateId: string;
  applicationId?: string;
  channel: "telefone" | "whatsapp" | "email" | "outro";
  result:
    | "nao_respondeu"
    | "contato_realizado"
    | "retornar_depois"
    | "agendado"
    | "sem_interesse"
    | "indisponivel"
    | "outro";
  note?: string;
}) {
  const staff = await requireStaff();
  if (!canWrite(staff)) throw new Error("Sem permissão de escrita");

  await db.insert(contacts).values({
    candidateId: input.candidateId,
    applicationId: input.applicationId ?? null,
    staffId: staff.id,
    channel: input.channel,
    result: input.result,
    note: input.note ?? null,
  });

  revalidatePath(`/candidatos/${input.candidateId}`);
  return { success: true };
}

export async function addNote(input: {
  candidateId: string;
  applicationId?: string;
  body: string;
  isHighlighted?: boolean;
}) {
  const staff = await requireStaff();
  if (!canWrite(staff)) throw new Error("Sem permissão de escrita");

  await db.insert(notes).values({
    candidateId: input.candidateId,
    applicationId: input.applicationId ?? null,
    staffId: staff.id,
    body: input.body,
    isHighlighted: input.isHighlighted ?? false,
  });

  revalidatePath(`/candidatos/${input.candidateId}`);
  return { success: true };
}

export async function updateApplicationStatus(input: {
  applicationId: string;
  candidateId: string;
  operationalStatus?: string;
  selectiveStatus?: string;
}) {
  const staff = await requireStaff();
  if (!canWrite(staff)) throw new Error("Sem permissão de escrita");

  const updates: Record<string, string> = {};
  if (input.operationalStatus) updates.operationalStatus = input.operationalStatus;
  if (input.selectiveStatus) updates.selectiveStatus = input.selectiveStatus;

  if (Object.keys(updates).length === 0) return { success: true };

  await db
    .update(applications)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(applications.id, input.applicationId));

  await db.insert(auditEvents).values({
    staffId: staff.id,
    action: "status_updated",
    entityType: "application",
    entityId: input.applicationId,
    metadata: updates,
  });

  revalidatePath(`/candidatos/${input.candidateId}`);
  revalidatePath("/ranking");
  return { success: true };
}

export async function addApplicationTag(input: {
  applicationId: string;
  candidateId: string;
  tagName: string;
}) {
  const staff = await requireStaff();
  if (!canWrite(staff)) throw new Error("Sem permissão de escrita");

  const slug = input.tagName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  let [tag] = await db.select().from(tags).where(eq(tags.slug, slug)).limit(1);
  if (!tag) {
    [tag] = await db
      .insert(tags)
      .values({ name: input.tagName, slug })
      .returning();
  }

  await db.insert(applicationTags).values({
    applicationId: input.applicationId,
    tagId: tag.id,
  });

  revalidatePath(`/candidatos/${input.candidateId}`);
  return { success: true };
}

export async function updateTalentClassification(input: {
  candidateId: string;
  classification:
    | "nao_classificado"
    | "acompanhar"
    | "interessante"
    | "prioritario"
    | "forte_candidato";
}) {
  const staff = await requireStaff();
  if (!canWrite(staff)) throw new Error("Sem permissão de escrita");

  await db
    .update(candidates)
    .set({
      talentClassification: input.classification,
      updatedAt: new Date(),
    })
    .where(eq(candidates.id, input.candidateId));

  await db.insert(auditEvents).values({
    staffId: staff.id,
    action: "classification_updated",
    entityType: "candidate",
    entityId: input.candidateId,
    metadata: { classification: input.classification },
  });

  revalidatePath(`/candidatos/${input.candidateId}`);
  revalidatePath("/ranking");
  return { success: true };
}

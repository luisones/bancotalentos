"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { canWrite, requireStaff } from "@/lib/auth/staff";
import { db } from "@/lib/db";
import { QUICK_NOTE_MAX } from "@/lib/candidate/quick-note";
import { err, ok, type ActionResult } from "./result";
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
}): Promise<ActionResult> {
  const staff = await requireStaff();
  if (!canWrite(staff)) return err("sem_permissao");

  await db.insert(contacts).values({
    candidateId: input.candidateId,
    applicationId: input.applicationId ?? null,
    staffId: staff.id,
    channel: input.channel,
    result: input.result,
    note: input.note ?? null,
  });

  revalidatePath(`/candidatos/${input.candidateId}`);
  return ok();
}

export async function addNote(input: {
  candidateId: string;
  applicationId?: string;
  body: string;
  isHighlighted?: boolean;
}): Promise<ActionResult> {
  const staff = await requireStaff();
  if (!canWrite(staff)) return err("sem_permissao");

  await db.insert(notes).values({
    candidateId: input.candidateId,
    applicationId: input.applicationId ?? null,
    staffId: staff.id,
    body: input.body,
    isHighlighted: input.isHighlighted ?? false,
  });

  revalidatePath(`/candidatos/${input.candidateId}`);
  return ok();
}

export async function updateApplicationStatus(input: {
  applicationId: string;
  candidateId: string;
  operationalStatus?: string;
  selectiveStatus?: string;
}): Promise<ActionResult> {
  const staff = await requireStaff();
  if (!canWrite(staff)) return err("sem_permissao");

  const updates: Record<string, string> = {};
  if (input.operationalStatus) updates.operationalStatus = input.operationalStatus;
  if (input.selectiveStatus) updates.selectiveStatus = input.selectiveStatus;

  if (Object.keys(updates).length === 0) return ok();

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
  return ok();
}

export async function addApplicationTag(input: {
  applicationId: string;
  candidateId: string;
  tagName: string;
}): Promise<ActionResult> {
  const staff = await requireStaff();
  if (!canWrite(staff)) return err("sem_permissao");

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
  return ok();
}

export async function updateTalentClassification(input: {
  candidateId: string;
  classification:
    | "nao_classificado"
    | "acompanhar"
    | "interessante"
    | "prioritario"
    | "forte_candidato";
}): Promise<ActionResult> {
  const staff = await requireStaff();
  if (!canWrite(staff)) return err("sem_permissao");

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
  return ok();
}

/**
 * Nota rápida do candidato: uma linha, compartilhada, sempre visível.
 *
 * É o rótulo, não o registro — o histórico autorado fica em `notes`. A autoria
 * e a data saem da trilha de auditoria (`quick_note_updated`), então o campo
 * não precisa de colunas próprias para dizer quem mexeu nele e quando.
 */
export async function updateQuickNote(input: {
  candidateId: string;
  note: string;
  /** Valor carregado pelo cliente, para detectar escrita concorrente. */
  expected: string | null;
}): Promise<ActionResult<{ note: string | null }>> {
  const staff = await requireStaff();
  if (!canWrite(staff)) return err("sem_permissao");

  const next = input.note.trim().replace(/\s+/g, " ");
  if (next.length > QUICK_NOTE_MAX) {
    return err("nota_rapida_muito_longa", "note");
  }

  const [current] = await db
    .select({ highlightedNote: candidates.highlightedNote })
    .from(candidates)
    .where(eq(candidates.id, input.candidateId))
    .limit(1);

  if (!current) return err("candidatura_invalida");

  const before = current.highlightedNote;
  // Campo compartilhado e sobrescrevível: sem baseline, duas pessoas editando
  // ao mesmo tempo se atropelam em silêncio.
  if ((before ?? "") !== (input.expected ?? "")) {
    return err("conflito_de_versao", "note");
  }

  const value = next.length === 0 ? null : next;
  if (value === before) return ok({ note: before });

  await db
    .update(candidates)
    .set({ highlightedNote: value, updatedAt: new Date() })
    .where(eq(candidates.id, input.candidateId));

  await db.insert(auditEvents).values({
    staffId: staff.id,
    action: "quick_note_updated",
    entityType: "candidate",
    entityId: input.candidateId,
    metadata: { de: before, para: value },
  });

  revalidatePath(`/candidatos/${input.candidateId}`);
  revalidatePath("/ranking");
  revalidatePath("/(app)", "page");
  return ok({ note: value });
}

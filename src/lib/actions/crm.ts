"use server";

import { eq } from "drizzle-orm";
import { canWrite, requireStaff } from "@/lib/auth/staff";
import { db } from "@/lib/db";
import { QUICK_NOTE_MAX } from "@/lib/candidate/quick-note";
import { err, ok, type ActionResult } from "./result";
import { revalidateCandidateViews } from "./revalidate";
import {
  applicationTags,
  applications,
  auditEvents,
  candidateStatusEnum,
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

  revalidateCandidateViews();
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

  revalidateCandidateViews();
  return ok();
}

/**
 * Status único da candidatura.
 *
 * Substitui a dupla situação seletiva + etapa operacional. Eram dois campos que
 * a interface precisava explicar lado a lado para não serem confundidos; agora
 * são um só valor, e a regra de precedência entre eles virou a própria lista de
 * opções.
 */
export async function updateApplicationStatus(input: {
  applicationId: string;
  candidateId: string;
  status: (typeof candidateStatusEnum.enumValues)[number];
}): Promise<ActionResult> {
  const staff = await requireStaff();
  if (!canWrite(staff)) return err("sem_permissao");

  const [current] = await db
    .select({ status: applications.status })
    .from(applications)
    .where(eq(applications.id, input.applicationId))
    .limit(1);

  if (!current) return err("candidatura_invalida");
  if (current.status === input.status) return ok();

  await db
    .update(applications)
    .set({ status: input.status, updatedAt: new Date() })
    .where(eq(applications.id, input.applicationId));

  await db.insert(auditEvents).values({
    staffId: staff.id,
    action: "status_updated",
    entityType: "application",
    entityId: input.applicationId,
    metadata: { de: current.status, para: input.status },
  });

  revalidateCandidateViews();
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

  revalidateCandidateViews();
  return ok();
}

/**
 * Estrela do candidato — o que sobrou do selo de talento.
 *
 * As cinco gradações antigas (`acompanhar`, `interessante`, `prioritario`,
 * `forte_candidato`) nunca foram usadas: as 692 pessoas estavam todas em
 * `nao_classificado`. Uma escala de cinco pontos que ninguém preenche é pior
 * que um sinalizador binário que alguém usa.
 */
export async function toggleStarred(input: {
  candidateId: string;
  starred: boolean;
}): Promise<ActionResult<{ starred: boolean }>> {
  const staff = await requireStaff();
  if (!canWrite(staff)) return err("sem_permissao");

  await db
    .update(candidates)
    .set({ starred: input.starred, updatedAt: new Date() })
    .where(eq(candidates.id, input.candidateId));

  await db.insert(auditEvents).values({
    staffId: staff.id,
    action: "starred_updated",
    entityType: "candidate",
    entityId: input.candidateId,
    metadata: { para: input.starred },
  });

  revalidateCandidateViews();
  return ok({ starred: input.starred });
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

  revalidateCandidateViews();
  return ok({ note: value });
}

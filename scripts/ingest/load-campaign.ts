import { eq, inArray, or, sql } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "../../src/lib/db/schema";
import {
  isAllowedEmailDomain,
  isSyntheticStaffEmail,
  staffNameKey,
} from "../../src/lib/auth/domains";
import {
  cellNumber,
  cellText,
  normalizeEmail,
  parseAppliedAt,
  slugify,
} from "./read-workbook";
import { hasLlmScore, validateAprObjRows, validateQnFRows } from "./scoring-check";
import type { CampaignConfig, IngestStats, SheetRow, WorkbookData } from "./types";
import { DISCIPLINE_FALLBACKS, emptyStats, safePayload } from "./types";

type Db = NeonHttpDatabase<typeof schema>;

const BATCH_SIZE = 200;

const INGEST_STAFF_EMAIL = "ingest@internal";

type LoadContext = {
  db: Db;
  config: CampaignConfig;
  batchId: string;
  campaignId: string;
  stats: IngestStats;
  dryRun: boolean;
  candidateByRef: Map<string, string>;
  applicationByRef: Map<string, string>;
  disciplineByName: Map<string, string>;
  dimensionByCode: Map<string, string>;
  instrumentByCode: Map<string, string>;
  criterionByName: Map<string, string>;
  ingestStaffId: string;
  tagBySlug: Map<string, string>;
};

async function getIngestStaffId(db: Db): Promise<string> {
  const [existing] = await db
    .select({ id: schema.staffUsers.id })
    .from(schema.staffUsers)
    .where(eq(schema.staffUsers.email, INGEST_STAFF_EMAIL))
    .limit(1);
  if (existing) return existing.id;

  const [created] = await db
    .insert(schema.staffUsers)
    .values({
      email: INGEST_STAFF_EMAIL,
      name: "Importação",
      role: "consulta",
      active: true,
    })
    .returning({ id: schema.staffUsers.id });
  return created.id;
}

async function getOrCreateEvaluatorStaff(
  db: Db,
  email: string,
  name: string,
): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const [existing] = await db
    .select({ id: schema.staffUsers.id })
    .from(schema.staffUsers)
    .where(eq(schema.staffUsers.email, normalized))
    .limit(1);
  if (existing) return existing.id;

  const [created] = await db
    .insert(schema.staffUsers)
    .values({
      email: normalized,
      name: name || normalized,
      role: "avaliador",
      active: true,
    })
    .returning({ id: schema.staffUsers.id });
  return created.id;
}

/**
 * Aulas-teste da planilha não podem criar contas sintéticas
 * (`at-2025-18@lesson-test.ingest`). Liga ao staff real pelo e-mail da escola
 * ou pelo nome; senão fica na conta de importação.
 */
async function resolveLessonTestEvaluator(
  db: Db,
  evaluatorEmail: string,
  evaluatorName: string,
  ingestStaffId: string,
): Promise<string> {
  const normalized = evaluatorEmail.trim().toLowerCase();
  if (
    normalized &&
    !isSyntheticStaffEmail(normalized) &&
    isAllowedEmailDomain(normalized)
  ) {
    return getOrCreateEvaluatorStaff(db, normalized, evaluatorName);
  }

  const key = staffNameKey(evaluatorName);
  if (key) {
    const rows = await db
      .select({
        id: schema.staffUsers.id,
        email: schema.staffUsers.email,
        name: schema.staffUsers.name,
      })
      .from(schema.staffUsers);
    const match = rows.find(
      (r) => !isSyntheticStaffEmail(r.email) && staffNameKey(r.name) === key,
    );
    if (match) return match.id;
  }

  return ingestStaffId;
}

async function buildContext(
  db: Db,
  config: CampaignConfig,
  batchId: string,
  campaignId: string,
  dryRun: boolean,
): Promise<LoadContext> {
  const disciplineRows = await db.select().from(schema.disciplines);
  const dimensionRows = await db.select().from(schema.dimensions);
  const instrumentRows = await db
    .select()
    .from(schema.instruments)
    .where(eq(schema.instruments.campaignId, campaignId));
  const criterionRows = await db.select().from(schema.lessonTestCriteria);
  const tagRows = await db.select().from(schema.tags);

  return {
    db,
    config,
    batchId,
    campaignId,
    stats: emptyStats(),
    dryRun,
    candidateByRef: new Map(),
    applicationByRef: new Map(),
    disciplineByName: new Map(
      disciplineRows.map((d) => [d.name.trim(), d.id]),
    ),
    dimensionByCode: new Map(dimensionRows.map((d) => [d.code, d.id])),
    instrumentByCode: new Map(instrumentRows.map((i) => [i.code, i.id])),
    criterionByName: new Map(criterionRows.map((c) => [c.name, c.id])),
    ingestStaffId: dryRun ? "" : await getIngestStaffId(db),
    tagBySlug: new Map(tagRows.map((t) => [t.slug, t.id])),
  };
}

async function clearApplicationsChildrenBulk(db: Db, applicationIds: string[]) {
  if (applicationIds.length === 0) return;

  for (let i = 0; i < applicationIds.length; i += BATCH_SIZE) {
    const chunk = applicationIds.slice(i, i + BATCH_SIZE);

    const answers = await db
      .select({ id: schema.subjectiveAnswers.id })
      .from(schema.subjectiveAnswers)
      .where(inArray(schema.subjectiveAnswers.applicationId, chunk));
    const answerIds = answers.map((a) => a.id);

    for (let j = 0; j < answerIds.length; j += BATCH_SIZE) {
      const answerChunk = answerIds.slice(j, j + BATCH_SIZE);
      if (answerChunk.length === 0) continue;
      await db
        .delete(schema.llmEvaluations)
        .where(inArray(schema.llmEvaluations.answerId, answerChunk));
    }

    const lessonEvals = await db
      .select({ id: schema.lessonTestEvaluations.id })
      .from(schema.lessonTestEvaluations)
      .where(inArray(schema.lessonTestEvaluations.applicationId, chunk));
    const evalIds = lessonEvals.map((e) => e.id);
    if (evalIds.length > 0) {
      for (let j = 0; j < evalIds.length; j += BATCH_SIZE) {
        const evalChunk = evalIds.slice(j, j + BATCH_SIZE);
        await db
          .delete(schema.lessonTestScores)
          .where(inArray(schema.lessonTestScores.lessonTestEvaluationId, evalChunk));
      }
      await db
        .delete(schema.lessonTestEvaluations)
        .where(inArray(schema.lessonTestEvaluations.id, evalIds));
    }

    await db
      .delete(schema.subjectiveAnswers)
      .where(inArray(schema.subjectiveAnswers.applicationId, chunk));
    await db
      .delete(schema.teachingPracticeScores)
      .where(inArray(schema.teachingPracticeScores.applicationId, chunk));
    await db
      .delete(schema.importedDimensionScores)
      .where(inArray(schema.importedDimensionScores.applicationId, chunk));
    await db
      .delete(schema.documents)
      .where(inArray(schema.documents.applicationId, chunk));
    await db
      .delete(schema.applicationFlags)
      .where(inArray(schema.applicationFlags.applicationId, chunk));
    await db
      .delete(schema.applicationTags)
      .where(inArray(schema.applicationTags.applicationId, chunk));
    await db
      .delete(schema.notes)
      .where(inArray(schema.notes.applicationId, chunk));

    const evaluations = await db
      .select({ id: schema.evaluations.id })
      .from(schema.evaluations)
      .where(inArray(schema.evaluations.applicationId, chunk));
    const evaluationIds = evaluations.map((e) => e.id);
    if (evaluationIds.length > 0) {
      for (let j = 0; j < evaluationIds.length; j += BATCH_SIZE) {
        const evalChunk = evaluationIds.slice(j, j + BATCH_SIZE);
        await db
          .delete(schema.evaluationRevisions)
          .where(inArray(schema.evaluationRevisions.evaluationId, evalChunk));
      }
      await db
        .delete(schema.evaluations)
        .where(inArray(schema.evaluations.id, evaluationIds));
    }
  }
}

async function clearApplicationChildren(db: Db, applicationId: string) {
  await clearApplicationsChildrenBulk(db, [applicationId]);
}

export async function replaceCampaign(db: Db, campaignSlug: string) {
  const [campaign] = await db
    .select({ id: schema.campaigns.id })
    .from(schema.campaigns)
    .where(eq(schema.campaigns.slug, campaignSlug))
    .limit(1);
  if (!campaign) return;

  const apps = await db
    .select({ id: schema.applications.id, candidateId: schema.applications.candidateId })
    .from(schema.applications)
    .where(eq(schema.applications.campaignId, campaign.id));
  const appIds = apps.map((a) => a.id);
  const candidateIds = [...new Set(apps.map((a) => a.candidateId))];

  if (appIds.length > 0) {
    await clearApplicationsChildrenBulk(db, appIds);
    await db
      .delete(schema.schedules)
      .where(inArray(schema.schedules.applicationId, appIds));
    await db
      .delete(schema.contacts)
      .where(inArray(schema.contacts.applicationId, appIds));
    await db
      .delete(schema.applicationInterests)
      .where(inArray(schema.applicationInterests.applicationId, appIds));
    await db
      .delete(schema.applicationPotentials)
      .where(inArray(schema.applicationPotentials.applicationId, appIds));
    await db.delete(schema.applications).where(inArray(schema.applications.id, appIds));
  }

  await db
    .delete(schema.secondPhaseConfirmations)
    .where(eq(schema.secondPhaseConfirmations.campaignId, campaign.id));

  await db.delete(schema.unmatchedLessonTests);

  if (candidateIds.length > 0) {
    const stillLinked = await db
      .select({ candidateId: schema.applications.candidateId })
      .from(schema.applications)
      .where(inArray(schema.applications.candidateId, candidateIds));
    const linkedSet = new Set(stillLinked.map((r) => r.candidateId));
    const orphanIds = candidateIds.filter((id) => !linkedSet.has(id));
    if (orphanIds.length > 0) {
      await db
        .delete(schema.candidateMergeSuggestions)
        .where(
          or(
            inArray(schema.candidateMergeSuggestions.candidateAId, orphanIds),
            inArray(schema.candidateMergeSuggestions.candidateBId, orphanIds),
          ),
        );
      await db
        .delete(schema.notes)
        .where(inArray(schema.notes.candidateId, orphanIds));
      await db
        .delete(schema.contacts)
        .where(inArray(schema.contacts.candidateId, orphanIds));
      await db
        .delete(schema.candidates)
        .where(inArray(schema.candidates.id, orphanIds));
    }
  }
}

async function upsertCandidate(ctx: LoadContext, row: SheetRow): Promise<string | null> {
  const pessoaId = cellText(row, "pessoa_id");
  if (!pessoaId) return null;

  const values = {
    externalRef: pessoaId,
    fullName: cellText(row, "nome") ?? pessoaId,
    email: cellText(row, "email"),
    phone: cellText(row, "telefone") ?? cellText(row, "telefone_2"),
    city: cellText(row, "cidade"),
    englishLevel: cellText(row, "nivel_ingles"),
    origin: cellText(row, "origens"),
    updatedAt: new Date(),
  };

  if (ctx.dryRun) {
    ctx.candidateByRef.set(pessoaId, `dry-${pessoaId}`);
    return `dry-${pessoaId}`;
  }

  const [existing] = await ctx.db
    .select({ id: schema.candidates.id })
    .from(schema.candidates)
    .where(eq(schema.candidates.externalRef, pessoaId))
    .limit(1);

  if (existing) {
    await ctx.db
      .update(schema.candidates)
      .set(values)
      .where(eq(schema.candidates.id, existing.id));
    ctx.stats.candidatesUpdated += 1;
    ctx.candidateByRef.set(pessoaId, existing.id);
    return existing.id;
  }

  const [created] = await ctx.db
    .insert(schema.candidates)
    .values(values)
    .returning({ id: schema.candidates.id });
  ctx.stats.candidatesCreated += 1;
  ctx.candidateByRef.set(pessoaId, created.id);
  return created.id;
}

async function upsertApplication(
  ctx: LoadContext,
  row: SheetRow,
  candidateId: string,
): Promise<string | null> {
  const candidaturaId = cellText(row, "candidatura_id");
  if (!candidaturaId) return null;

  if (ctx.config.skipCandidaturaIds.has(candidaturaId)) {
    ctx.stats.skippedCandidaturas += 1;
    if (!ctx.dryRun) {
      await ctx.db.insert(schema.importRowErrors).values({
        importBatchId: ctx.batchId,
        message: "Skipped test submission",
        payload: safePayload(cellText(row, "pessoa_id"), candidaturaId, "skip_test"),
      });
    }
    return null;
  }

  const rawDiscipline = cellText(row, "disciplina_canonica")?.trim();
  const fallbackRaw = cellText(row, "disciplina_raw")?.trim();
  const inferredFromRaw =
    fallbackRaw && DISCIPLINE_FALLBACKS[fallbackRaw]
      ? DISCIPLINE_FALLBACKS[fallbackRaw]
      : fallbackRaw;
  const disciplineName = rawDiscipline || inferredFromRaw;
  const usedDisciplineFallback = !rawDiscipline && Boolean(disciplineName);

  if (!disciplineName) {
    ctx.stats.errors += 1;
    if (!ctx.dryRun) {
      await ctx.db.insert(schema.importRowErrors).values({
        importBatchId: ctx.batchId,
        message: "Missing disciplina_canonica",
        payload: safePayload(cellText(row, "pessoa_id"), candidaturaId),
      });
    }
    return null;
  }

  const disciplineId = ctx.disciplineByName.get(disciplineName);
  if (!disciplineId) {
    ctx.stats.errors += 1;
    if (!ctx.dryRun) {
      await ctx.db.insert(schema.importRowErrors).values({
        importBatchId: ctx.batchId,
        message: "Unknown discipline",
        payload: safePayload(cellText(row, "pessoa_id"), candidaturaId, "unknown_discipline"),
      });
    }
    return null;
  }

  const values = {
    candidateId,
    campaignId: ctx.campaignId,
    disciplineId,
    externalRef: candidaturaId,
    source: "import" as const,
    appliedAt: parseAppliedAt(cellText(row, "inscrito_em")),
    differentialText: cellText(row, "diferencial"),
    candidateObservation: cellText(row, "observacao_candidato"),
    updatedAt: new Date(),
  };

  if (ctx.dryRun) {
    ctx.applicationByRef.set(candidaturaId, `dry-${candidaturaId}`);
    return `dry-${candidaturaId}`;
  }

  const [existing] = await ctx.db
    .select({ id: schema.applications.id })
    .from(schema.applications)
    .where(eq(schema.applications.externalRef, candidaturaId))
    .limit(1);

  let applicationId: string;
  if (existing) {
    await ctx.db
      .update(schema.applications)
      .set(values)
      .where(eq(schema.applications.id, existing.id));
    applicationId = existing.id;
    ctx.stats.applicationsUpdated += 1;
    await clearApplicationChildren(ctx.db, applicationId);
  } else {
    const [created] = await ctx.db
      .insert(schema.applications)
      .values(values)
      .returning({ id: schema.applications.id });
    applicationId = created.id;
    ctx.stats.applicationsCreated += 1;
  }

  ctx.applicationByRef.set(candidaturaId, applicationId);

  if (usedDisciplineFallback) {
    await ctx.db.insert(schema.applicationFlags).values({
      applicationId,
      flagCode: "disciplina_canonica_inferida",
      active: true,
    });
  }

  return applicationId;
}

async function importDocuments(ctx: LoadContext, rows: SheetRow[]) {
  const docs: Array<{
    applicationId: string;
    type: "curriculo" | "video";
    url: string;
    description: string | null;
  }> = [];

  for (const row of rows) {
    const candidaturaId = cellText(row, "candidatura_id");
    const applicationId = candidaturaId
      ? ctx.applicationByRef.get(candidaturaId)
      : undefined;
    if (!applicationId) continue;

    const tipo = cellText(row, "tipo");
    if (tipo !== "curriculo" && tipo !== "video") continue;
    const url = cellText(row, "url");
    if (!url) continue;

    docs.push({
      applicationId,
      type: tipo,
      url,
      description: cellText(row, "observacao"),
    });
  }

  ctx.stats.documentsCreated += docs.length;
  if (ctx.dryRun || docs.length === 0) return;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    await ctx.db.insert(schema.documents).values(docs.slice(i, i + BATCH_SIZE));
  }
}

async function importRespostas(ctx: LoadContext, rows: SheetRow[]) {
  type PendingAnswer = {
    row: SheetRow;
    applicationId: string;
    instrumentId: string;
  };
  const pending: PendingAnswer[] = [];

  for (const row of rows) {
    const candidaturaId = cellText(row, "candidatura_id");
    const applicationId = candidaturaId
      ? ctx.applicationByRef.get(candidaturaId)
      : undefined;
    if (!applicationId) continue;

    const questionCode = cellText(row, "pergunta_code");
    if (!questionCode) continue;
    const instrumentId = ctx.instrumentByCode.get(questionCode);
    if (!instrumentId && !ctx.dryRun) continue;

    const answerText = cellText(row, "resposta_texto");
    const hasAnyLlm = (["L", "G", "A", "O"] as const).some((p) =>
      hasLlmScore(row, p),
    );
    if (!answerText && !hasAnyLlm) continue;

    ctx.stats.subjectiveAnswersCreated += 1;

    if (ctx.dryRun) {
      for (const provider of ["L", "G", "A", "O"] as const) {
        if (
          hasLlmScore(row, provider) &&
          cellNumber(row, `score_${provider}`) !== null
        ) {
          ctx.stats.llmEvaluationsCreated += 1;
        }
      }
      continue;
    }

    pending.push({ row, applicationId, instrumentId: instrumentId! });
  }

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const chunk = pending.slice(i, i + BATCH_SIZE);
    const inserted = await ctx.db
      .insert(schema.subjectiveAnswers)
      .values(
        chunk.map((item) => ({
          applicationId: item.applicationId,
          instrumentId: item.instrumentId,
          answerText: cellText(item.row, "resposta_texto"),
        })),
      )
      .returning({ id: schema.subjectiveAnswers.id });

    const llmRows: Array<{
      answerId: string;
      providerCode: string;
      scoreRaw: string;
      scaleMax: string;
    }> = [];

    inserted.forEach((answer, idx) => {
      const row = chunk[idx].row;
      for (const provider of ["L", "G", "A", "O"] as const) {
        if (!hasLlmScore(row, provider)) continue;
        const score = cellNumber(row, `score_${provider}`);
        if (score === null) continue;
        llmRows.push({
          answerId: answer.id,
          providerCode: provider,
          scoreRaw: String(score),
          scaleMax: "30",
        });
      }
    });

    if (llmRows.length > 0) {
      for (let j = 0; j < llmRows.length; j += BATCH_SIZE) {
        await ctx.db
          .insert(schema.llmEvaluations)
          .values(llmRows.slice(j, j + BATCH_SIZE));
      }
      ctx.stats.llmEvaluationsCreated += llmRows.length;
    }
  }
}

async function importPraticas(ctx: LoadContext, rows: SheetRow[]) {
  const batch: Array<{
    applicationId: string;
    practiceCode: string;
    scoreRaw: string;
    rawResponse: string | null;
    weight: string | null;
    direction: string | null;
  }> = [];

  for (const row of rows) {
    const candidaturaId = cellText(row, "candidatura_id");
    const applicationId = candidaturaId
      ? ctx.applicationByRef.get(candidaturaId)
      : undefined;
    if (!applicationId) continue;

    const practiceCode = cellText(row, "practice_code");
    const valor = cellNumber(row, "valor");
    if (!practiceCode || valor === null) continue;

    batch.push({
      applicationId,
      practiceCode,
      scoreRaw: String(valor),
      rawResponse:
        cellNumber(row, "resposta_raw") !== null
          ? String(cellNumber(row, "resposta_raw"))
          : null,
      weight:
        cellNumber(row, "peso") !== null ? String(cellNumber(row, "peso")) : null,
      direction: cellText(row, "direcao"),
    });
  }

  ctx.stats.teachingPracticeScoresCreated += batch.length;
  if (ctx.dryRun || batch.length === 0) return;
  for (let i = 0; i < batch.length; i += BATCH_SIZE) {
    await ctx.db
      .insert(schema.teachingPracticeScores)
      .values(batch.slice(i, i + BATCH_SIZE));
  }
}

async function importScoresDimensao(ctx: LoadContext, rows: SheetRow[]) {
  const byKey = new Map<
    string,
    {
      applicationId: string;
      dimensionId: string;
      score: string;
      source: string;
    }
  >();

  for (const row of rows) {
    const candidaturaId = cellText(row, "candidatura_id");
    const applicationId = candidaturaId
      ? ctx.applicationByRef.get(candidaturaId)
      : undefined;
    if (!applicationId) continue;

    const dimensionCode = cellText(row, "dimension_code");
    const score = cellNumber(row, "score");
    if (!dimensionCode || score === null) continue;

    const dimensionId = ctx.dimensionByCode.get(dimensionCode);
    if (!dimensionId) continue;

    byKey.set(`${applicationId}:${dimensionId}`, {
      applicationId,
      dimensionId,
      score: String(score),
      source: cellText(row, "origem") ?? "import",
    });
  }

  const batch = [...byKey.values()];

  ctx.stats.importedDimensionScoresCreated += batch.length;
  if (ctx.dryRun || batch.length === 0) return;
  for (let i = 0; i < batch.length; i += BATCH_SIZE) {
    await ctx.db
      .insert(schema.importedDimensionScores)
      .values(batch.slice(i, i + BATCH_SIZE));
  }
}

async function importAulasTeste(ctx: LoadContext, rows: SheetRow[]) {
  const byAula = new Map<string, SheetRow[]>();
  for (const row of rows) {
    const aulaId = cellText(row, "aula_teste_id");
    if (!aulaId) continue;
    const list = byAula.get(aulaId) ?? [];
    list.push(row);
    byAula.set(aulaId, list);
  }

  for (const [, criteriaRows] of byAula) {
    const first = criteriaRows[0];
    const candidaturaId = cellText(first, "candidatura_id");
    const applicationId = candidaturaId
      ? ctx.applicationByRef.get(candidaturaId)
      : undefined;
    if (!applicationId) continue;

    const evaluatorEmail = cellText(first, "avaliador_email");
    const evaluatorName = cellText(first, "avaliador_nome") ?? "Avaliador";
    const aulaTesteId = cellText(first, "aula_teste_id");
    if (!evaluatorEmail || !aulaTesteId) continue;

    ctx.stats.lessonTestEvaluationsCreated += 1;
    ctx.stats.lessonTestScoresCreated += criteriaRows.filter(
      (r) => cellNumber(r, "nota") !== null,
    ).length;

    if (ctx.dryRun) continue;

    const aulaRef = aulaTesteId.trim().toUpperCase();
    const evaluatorStaffId = await resolveLessonTestEvaluator(
      ctx.db,
      evaluatorEmail,
      evaluatorName,
      ctx.ingestStaffId,
    );

    const [existingEval] = await ctx.db
      .select({ id: schema.lessonTestEvaluations.id })
      .from(schema.lessonTestEvaluations)
      .where(eq(schema.lessonTestEvaluations.externalRef, aulaRef))
      .limit(1);

    let evaluationId: string;
    if (existingEval) {
      evaluationId = existingEval.id;
      await ctx.db
        .delete(schema.lessonTestScores)
        .where(eq(schema.lessonTestScores.lessonTestEvaluationId, evaluationId));
      await ctx.db
        .update(schema.lessonTestEvaluations)
        .set({
          evaluatorStaffId,
          vacancyLabel: cellText(first, "vaga_bruta"),
          comment: cellText(first, "comentario"),
          evaluatedAt: parseAppliedAt(cellText(first, "data_aula")),
        })
        .where(eq(schema.lessonTestEvaluations.id, evaluationId));
    } else {
      const [evaluation] = await ctx.db
        .insert(schema.lessonTestEvaluations)
        .values({
          applicationId,
          evaluatorStaffId,
          externalRef: aulaRef,
          vacancyLabel: cellText(first, "vaga_bruta"),
          comment: cellText(first, "comentario"),
          evaluatedAt: parseAppliedAt(cellText(first, "data_aula")),
        })
        .returning({ id: schema.lessonTestEvaluations.id });
      evaluationId = evaluation.id;
    }

    const scoreRows: Array<{
      lessonTestEvaluationId: string;
      criterionId: string;
      score: string;
    }> = [];

    for (const row of criteriaRows) {
      const criterionName = cellText(row, "criterio");
      const score = cellNumber(row, "nota");
      if (!criterionName || score === null) continue;
      const criterionId = ctx.criterionByName.get(criterionName);
      if (!criterionId) continue;
      scoreRows.push({
        lessonTestEvaluationId: evaluationId,
        criterionId,
        score: String(score),
      });
    }

    if (scoreRows.length > 0) {
      await ctx.db.insert(schema.lessonTestScores).values(scoreRows);
    }
  }
}

async function importProvas(ctx: LoadContext, rows: SheetRow[]) {
  for (const row of rows) {
    const vinculo = cellText(row, "vinculo");
    const candidaturaId = cellText(row, "candidatura_id");
    const matricula = cellText(row, "matricula");

    if (vinculo?.startsWith("ambiguo")) {
      ctx.stats.errors += 1;
      if (!ctx.dryRun) {
        await ctx.db.insert(schema.importRowErrors).values({
          importBatchId: ctx.batchId,
          message: "Ambiguous exam linkage",
          payload: safePayload(cellText(row, "pessoa_id"), candidaturaId, "prova_ambigua"),
        });
      }
      continue;
    }

    if (!candidaturaId || !matricula) continue;
    const applicationId = ctx.applicationByRef.get(candidaturaId);
    if (!applicationId) continue;

    if (ctx.dryRun) continue;

    await ctx.db
      .update(schema.applications)
      .set({ examRegistration: matricula, updatedAt: new Date() })
      .where(eq(schema.applications.id, applicationId));

    if (vinculo === "unico_por_pessoa") {
      await ctx.db.insert(schema.applicationFlags).values({
        applicationId,
        flagCode: "vinculo_prova_disciplina_diverge",
        active: true,
      });
      ctx.stats.flagsCreated += 1;
    }
  }
}

async function importSegundaFase(ctx: LoadContext, rows: SheetRow[]) {
  for (const row of rows) {
    const pessoaId = cellText(row, "pessoa_id");
    const candidateId = pessoaId ? ctx.candidateByRef.get(pessoaId) : undefined;
    if (!candidateId) continue;

    const externalRef = cellText(row, "segunda_fase_id");
    const examChoice = cellText(row, "prova_escolhida");
    if (!externalRef || !examChoice) continue;

    ctx.stats.secondPhaseCreated += 1;
    if (ctx.dryRun) continue;

    await ctx.db
      .insert(schema.secondPhaseConfirmations)
      .values({
        campaignId: ctx.campaignId,
        candidateId,
        externalRef,
        examChoice,
        confirmedAt: parseAppliedAt(cellText(row, "confirmado_em")),
        emailDiverged: Boolean(cellText(row, "divergencia_email")),
      })
      .onConflictDoUpdate({
        target: schema.secondPhaseConfirmations.externalRef,
        set: {
          examChoice,
          confirmedAt: parseAppliedAt(cellText(row, "confirmado_em")),
          emailDiverged: Boolean(cellText(row, "divergencia_email")),
        },
      });
  }
}

async function getOrCreateTag(ctx: LoadContext, code: string): Promise<string> {
  const slug = slugify(code);
  const cached = ctx.tagBySlug.get(slug);
  if (cached) return cached;

  const [existing] = await ctx.db
    .select({ id: schema.tags.id })
    .from(schema.tags)
    .where(eq(schema.tags.slug, slug))
    .limit(1);
  if (existing) {
    ctx.tagBySlug.set(slug, existing.id);
    return existing.id;
  }

  const [created] = await ctx.db
    .insert(schema.tags)
    .values({ name: code, slug })
    .returning({ id: schema.tags.id });
  ctx.tagBySlug.set(slug, created.id);
  return created.id;
}

async function importFlagsTags(ctx: LoadContext, rows: SheetRow[]) {
  for (const row of rows) {
    const candidaturaId = cellText(row, "candidatura_id");
    const applicationId = candidaturaId
      ? ctx.applicationByRef.get(candidaturaId)
      : undefined;
    if (!applicationId) continue;

    const tipo = cellText(row, "tipo");
    const codigo = cellText(row, "codigo");
    const texto = cellText(row, "texto_original");
    if (!tipo || !codigo) continue;

    if (tipo === "flag") {
      ctx.stats.flagsCreated += 1;
      if (ctx.dryRun) continue;
      await ctx.db.insert(schema.applicationFlags).values({
        applicationId,
        flagCode: codigo,
        active: true,
      });
    } else if (tipo === "tag") {
      ctx.stats.tagsCreated += 1;
      if (ctx.dryRun) continue;
      const tagId = await getOrCreateTag(ctx, codigo);
      await ctx.db.insert(schema.applicationTags).values({
        applicationId,
        tagId,
      });
    } else if (tipo === "nota" && texto) {
      ctx.stats.notesCreated += 1;
      if (ctx.dryRun) continue;
      await ctx.db.insert(schema.notes).values({
        applicationId,
        staffId: ctx.ingestStaffId,
        body: `[${codigo}] ${texto}`,
        isHighlighted: false,
      });
    }
  }
}

async function importRejeitados(ctx: LoadContext, rows: SheetRow[]) {
  for (const row of rows) {
    ctx.stats.errors += 1;
    if (ctx.dryRun) continue;
    await ctx.db.insert(schema.importRowErrors).values({
      importBatchId: ctx.batchId,
      message: "Rejected source row",
      payload: {
        origem: cellText(row, "origem") ?? "workbook",
        linha: cellText(row, "linha") ?? "",
      },
    });
  }
}

async function importMergeSuggestions(
  ctx: LoadContext,
  candidaturaRows: SheetRow[],
) {
  const preferMap = new Map<string, string>();
  for (const row of candidaturaRows) {
    const candidaturaId = cellText(row, "candidatura_id");
    const prefer = cellText(row, "duplicata_preferir");
    const suspect = cellText(row, "duplicata_suspeita");
    if (candidaturaId && prefer && suspect) {
      preferMap.set(candidaturaId, prefer);
    }
  }

  for (const [candidaturaId, preferId] of preferMap) {
    const appA = ctx.applicationByRef.get(candidaturaId);
    const appB = ctx.applicationByRef.get(preferId);
    if (!appA || !appB) continue;

    if (ctx.dryRun) {
      ctx.stats.mergeSuggestionsCreated += 1;
      continue;
    }

    const [appRowA] = await ctx.db
      .select({ candidateId: schema.applications.candidateId })
      .from(schema.applications)
      .where(eq(schema.applications.id, appA))
      .limit(1);
    const [appRowB] = await ctx.db
      .select({ candidateId: schema.applications.candidateId })
      .from(schema.applications)
      .where(eq(schema.applications.id, appB))
      .limit(1);
    if (!appRowA || !appRowB || appRowA.candidateId === appRowB.candidateId) continue;

    await ctx.db.insert(schema.candidateMergeSuggestions).values({
      candidateAId: appRowA.candidateId,
      candidateBId: appRowB.candidateId,
      reason: "duplicata_suspeita na planilha",
      confidence: "low",
    });
    ctx.stats.mergeSuggestionsCreated += 1;
  }
}

export async function createCrossCampaignMergeSuggestions(db: Db) {
  await db
    .delete(schema.candidateMergeSuggestions)
    .where(eq(schema.candidateMergeSuggestions.reason, "mesmo e-mail em campanhas distintas"));

  const rows = await db
    .select({
      id: schema.candidates.id,
      email: schema.candidates.email,
    })
    .from(schema.candidates)
    .where(sql`${schema.candidates.email} is not null`);

  const byEmail = new Map<string, string[]>();
  for (const row of rows) {
    const email = normalizeEmail(row.email);
    if (!email) continue;
    const list = byEmail.get(email) ?? [];
    list.push(row.id);
    byEmail.set(email, list);
  }

  for (const ids of byEmail.values()) {
    if (ids.length < 2) continue;
    for (let i = 1; i < ids.length; i++) {
      await db.insert(schema.candidateMergeSuggestions).values({
        candidateAId: ids[0],
        candidateBId: ids[i],
        reason: "mesmo e-mail em campanhas distintas",
        confidence: "medium",
      });
    }
  }
}

export async function loadCampaign(
  db: Db,
  workbook: WorkbookData,
  config: CampaignConfig,
  options: { dryRun: boolean; replace: boolean; sourceFile?: string },
): Promise<IngestStats> {
  const [campaign] = await db
    .select()
    .from(schema.campaigns)
    .where(eq(schema.campaigns.slug, config.slug))
    .limit(1);
  if (!campaign) {
    throw new Error(`Campaign not found: ${config.slug}. Run db:seed first.`);
  }

  let batchId = "dry-run";
  if (!options.dryRun) {
    if (options.replace) {
      await replaceCampaign(db, config.slug);
    }
    const [batch] = await db
      .insert(schema.importBatches)
      .values({
        sourceFile: options.sourceFile ?? config.identFile.replace(/^tmp\//, ""),
        rowCount: workbook.CANDIDATURAS.length,
      })
      .returning({ id: schema.importBatches.id });
    batchId = batch.id;
  }

  const ctx = await buildContext(
    db,
    config,
    batchId,
    campaign.id,
    options.dryRun,
  );

  if (!options.dryRun) {
    const yearPrefix = config.slug === "2025-efaf-em" ? "PES-2025-" : "PES-2026-";
    const existingCandidates = await db
      .select({
        id: schema.candidates.id,
        externalRef: schema.candidates.externalRef,
      })
      .from(schema.candidates)
      .where(sql`${schema.candidates.externalRef} like ${`${yearPrefix}%`}`);
    for (const row of existingCandidates) {
      if (row.externalRef) ctx.candidateByRef.set(row.externalRef, row.id);
    }

    const existingApps = await db
      .select({
        id: schema.applications.id,
        externalRef: schema.applications.externalRef,
      })
      .from(schema.applications)
      .where(eq(schema.applications.campaignId, campaign.id));
    for (const row of existingApps) {
      if (row.externalRef) ctx.applicationByRef.set(row.externalRef, row.id);
    }
  }

  const qnfValidation = validateQnFRows(workbook.RESPOSTAS);
  ctx.stats.maeQnF = qnfValidation.mae;
  ctx.stats.maeQnFCount = qnfValidation.count;

  const aprValidation = validateAprObjRows(
    workbook.PRATICAS,
    workbook.SCORES_DIMENSAO,
  );
  ctx.stats.maeAprObj = aprValidation.mae;
  ctx.stats.maeAprObjCount = aprValidation.count;

  for (const row of workbook.CANDIDATOS) {
    await upsertCandidate(ctx, row);
  }
  console.log(`  candidates: ${ctx.candidateByRef.size}`);

  for (const row of workbook.CANDIDATURAS) {
    const pessoaId = cellText(row, "pessoa_id");
    const candidateId = pessoaId ? ctx.candidateByRef.get(pessoaId) : undefined;
    if (!candidateId) {
      ctx.stats.errors += 1;
      continue;
    }
    await upsertApplication(ctx, row, candidateId);
  }
  console.log(`  applications: ${ctx.applicationByRef.size}`);

  await importDocuments(ctx, workbook.DOCUMENTOS);
  console.log("  documents done");
  await importRespostas(ctx, workbook.RESPOSTAS);
  console.log("  respostas done");
  await importPraticas(ctx, workbook.PRATICAS);
  console.log("  praticas done");
  await importScoresDimensao(ctx, workbook.SCORES_DIMENSAO);
  console.log("  scores dimensao done");
  await importAulasTeste(ctx, workbook.AULAS_TESTE ?? []);
  console.log("  aulas-teste done");

  if (workbook.PROVAS) await importProvas(ctx, workbook.PROVAS);
  if (workbook.SEGUNDA_FASE) await importSegundaFase(ctx, workbook.SEGUNDA_FASE);
  if (workbook.FLAGS_TAGS) await importFlagsTags(ctx, workbook.FLAGS_TAGS);
  if (workbook.REJEITADOS) await importRejeitados(ctx, workbook.REJEITADOS);

  await importMergeSuggestions(ctx, workbook.CANDIDATURAS);

  if (!options.dryRun) {
    await db
      .update(schema.importBatches)
      .set({
        finishedAt: new Date(),
        errorCount: ctx.stats.errors,
      })
      .where(eq(schema.importBatches.id, batchId));
  }

  return ctx.stats;
}

export function workbookRowCounts(workbook: WorkbookData): Record<string, number> {
  return {
    CANDIDATOS: workbook.CANDIDATOS.length,
    CANDIDATURAS: workbook.CANDIDATURAS.length,
    DOCUMENTOS: workbook.DOCUMENTOS.length,
    RESPOSTAS: workbook.RESPOSTAS.length,
    PRATICAS: workbook.PRATICAS.length,
    AULAS_TESTE: workbook.AULAS_TESTE?.length ?? 0,
    SCORES_DIMENSAO: workbook.SCORES_DIMENSAO.length,
    PROVAS: workbook.PROVAS?.length ?? 0,
    SEGUNDA_FASE: workbook.SEGUNDA_FASE?.length ?? 0,
    FLAGS_TAGS: workbook.FLAGS_TAGS?.length ?? 0,
    REJEITADOS: workbook.REJEITADOS?.length ?? 0,
  };
}

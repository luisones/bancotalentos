import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  applicationFlags,
  applicationInterests,
  blindPeeks,
  applicationPotentials,
  applicationTags,
  applications,
  auditEvents,
  campaigns,
  candidates,
  contacts,
  dimensions,
  disciplines,
  documents,
  instruments,
  lessonTestCriteria,
  lessonTestEvaluations,
  lessonTestScores,
  notes,
  schedules,
  secondPhaseConfirmations,
  segments,
  staffUsers,
  subjectiveAnswers,
  tags,
  teachingPracticeScores,
} from "@/lib/db/schema";
import {
  assembleScoresForApplications,
  getApplicationEvaluationsForApplications,
  prefetchScoringData,
  type EvaluationRow,
} from "./scoring-data";
import { normalizeScore, type ConsolidatedResult } from "@/lib/scoring";

/** Avaliação do próprio usuário numa dimensão. Nunca contém dados de terceiros. */
export type OwnEvaluation = {
  evaluationId: string;
  dimensionId: string;
  dimensionCode: string;
  /** Já normalizado para 0–10 no servidor. */
  score: number;
  comment: string | null;
  updatedAt: Date;
};

function groupByApp<T extends { applicationId: string }>(
  rows: T[],
): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const row of rows) {
    const list = out[row.applicationId] ?? [];
    list.push(row);
    out[row.applicationId] = list;
  }
  return out;
}

/**
 * Candidatura padrão, determinística: campanha ativa > maior appliedAt > maior createdAt.
 * `appliedAt` é nullable, então ordenar só por ele torna a "primária" arbitrária.
 */
function pickDefaultApplication<
  T extends {
    application: {
      id: string;
      appliedAt: Date | null;
      createdAt: Date;
    };
    campaignStatus: string | null;
  },
>(rows: T[]): T | undefined {
  if (rows.length === 0) return undefined;
  return [...rows].sort((a, b) => {
    const activeA = a.campaignStatus === "ativa" ? 1 : 0;
    const activeB = b.campaignStatus === "ativa" ? 1 : 0;
    if (activeA !== activeB) return activeB - activeA;

    const appliedA = a.application.appliedAt?.getTime() ?? -Infinity;
    const appliedB = b.application.appliedAt?.getTime() ?? -Infinity;
    if (appliedA !== appliedB) return appliedB - appliedA;

    return b.application.createdAt.getTime() - a.application.createdAt.getTime();
  })[0];
}

export async function getCandidateProfile(candidateId: string, staffUserId: string) {
  const [candidate] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);

  if (!candidate) return null;

  const candidateApplications = await db
    .select({
      application: applications,
      disciplineName: disciplines.name,
      campaignName: campaigns.name,
      campaignStatus: campaigns.status,
    })
    .from(applications)
    .leftJoin(disciplines, eq(disciplines.id, applications.disciplineId))
    .leftJoin(campaigns, eq(campaigns.id, applications.campaignId))
    .where(eq(applications.candidateId, candidateId))
    .orderBy(desc(applications.appliedAt));

  const applicationIds = candidateApplications.map((a) => a.application.id);

  const docsByApp: Record<string, (typeof documents.$inferSelect)[]> = {};
  const scoresByApp: Record<string, ConsolidatedResult> = {};
  /**
   * Mesmo cálculo, mas ignorando a avaliação cega. NÃO é para exibir — serve só
   * para detectar que o consolidado mostrado ao usuário difere do real, e avisar.
   */
  const scoresByAppRevealed: Record<string, ConsolidatedResult> = {};
  const evalsByApp: Record<string, EvaluationRow[]> = {};
  const ownEvaluationsByApp: Record<string, Record<string, OwnEvaluation>> = {};

  if (applicationIds.length > 0) {
    const [allDocs, [catalog, scoreInputs], evalMap, peekRows] =
      await Promise.all([
        db
          .select()
          .from(documents)
          .where(inArray(documents.applicationId, applicationIds)),
        prefetchScoringData(applicationIds),
        getApplicationEvaluationsForApplications(applicationIds),
        // Revelações de avaliação cega DESTE usuário, por dimensão.
        db
          .select({
            applicationId: blindPeeks.applicationId,
            dimensionCode: dimensions.code,
          })
          .from(blindPeeks)
          .innerJoin(dimensions, eq(dimensions.id, blindPeeks.dimensionId))
          .where(
            and(
              eq(blindPeeks.staffId, staffUserId),
              inArray(blindPeeks.applicationId, applicationIds),
            ),
          ),
      ]);

    const peeksByApp = new Map<string, Set<string>>();
    for (const row of peekRows) {
      const set = peeksByApp.get(row.applicationId) ?? new Set<string>();
      set.add(row.dimensionCode);
      peeksByApp.set(row.applicationId, set);
    }

    // Duas visões do mesmo fetch — sem segunda ida ao banco.
    const scoreMap = assembleScoresForApplications(
      applicationIds,
      catalog,
      scoreInputs,
      { staffUserId, peeksByApp },
    );
    const revealedMap = assembleScoresForApplications(
      applicationIds,
      catalog,
      scoreInputs,
      { forceReveal: true },
    );

    for (const doc of allDocs) {
      const list = docsByApp[doc.applicationId] ?? [];
      list.push(doc);
      docsByApp[doc.applicationId] = list;
    }
    for (const appId of applicationIds) {
      const scores = scoreMap.get(appId);
      if (scores) scoresByApp[appId] = scores;
      const revealed = revealedMap.get(appId);
      if (revealed) scoresByAppRevealed[appId] = revealed;

      const rows = evalMap.get(appId) ?? [];
      evalsByApp[appId] = rows;

      // Projeção separada: só as próprias, já normalizadas. Garante pelo tipo
      // que a UI de edição nunca recebe a avaliação de outro avaliador.
      const own: Record<string, OwnEvaluation> = {};
      for (const row of rows) {
        if (row.evaluatorStaffId !== staffUserId) continue;
        own[row.dimensionId] = {
          evaluationId: row.id,
          dimensionId: row.dimensionId,
          dimensionCode: row.dimensionCode,
          score: normalizeScore(Number(row.scoreRaw), Number(row.scaleMax)),
          comment: row.comment,
          updatedAt: row.createdAt,
        };
      }
      ownEvaluationsByApp[appId] = own;
    }
  }

  const [
    candidateNotes,
    candidateContacts,
    history,
    allDimensions,
    allFlags,
    allSecondPhase,
  ] = await Promise.all([
    db
      .select({
        note: notes,
        staffName: staffUsers.name,
      })
      .from(notes)
      .leftJoin(staffUsers, eq(staffUsers.id, notes.staffId))
      .where(eq(notes.candidateId, candidateId))
      .orderBy(desc(notes.createdAt)),
    db
      .select({
        contact: contacts,
        staffName: staffUsers.name,
      })
      .from(contacts)
      .leftJoin(staffUsers, eq(staffUsers.id, contacts.staffId))
      .where(eq(contacts.candidateId, candidateId))
      .orderBy(desc(contacts.contactedAt)),
    db
      .select({
        event: auditEvents,
        staffName: staffUsers.name,
      })
      .from(auditEvents)
      .leftJoin(staffUsers, eq(staffUsers.id, auditEvents.staffId))
      // Eventos de avaliação e de status gravam entityId = applicationId, e o
      // peek grava entityId = evaluationId. Filtrar só por candidateId deixava
      // a trilha praticamente vazia.
      .where(inArray(auditEvents.entityId, [candidateId, ...applicationIds]))
      .orderBy(desc(auditEvents.createdAt))
      .limit(50),
    db.select().from(dimensions).orderBy(dimensions.sortOrder),
    applicationIds.length > 0
      ? db
          .select({
            applicationId: applicationFlags.applicationId,
            flagCode: applicationFlags.flagCode,
            active: applicationFlags.active,
          })
          .from(applicationFlags)
          .where(inArray(applicationFlags.applicationId, applicationIds))
      : Promise.resolve([]),
    db
      .select({
        campaignId: secondPhaseConfirmations.campaignId,
        examChoice: secondPhaseConfirmations.examChoice,
        confirmedAt: secondPhaseConfirmations.confirmedAt,
        emailDiverged: secondPhaseConfirmations.emailDiverged,
      })
      .from(secondPhaseConfirmations)
      .where(eq(secondPhaseConfirmations.candidateId, candidateId))
      .orderBy(secondPhaseConfirmations.confirmedAt),
  ]);

  const defaultRow = pickDefaultApplication(candidateApplications);
  const defaultApp = defaultRow?.application;

  type SubjectiveRow = {
    applicationId: string;
    answer: typeof subjectiveAnswers.$inferSelect;
    instrument: typeof instruments.$inferSelect;
  };
  type LessonTest = {
    applicationId: string;
    evaluation: typeof lessonTestEvaluations.$inferSelect;
    scores: Array<{
      criterion: typeof lessonTestCriteria.$inferSelect;
      score: string;
    }>;
  };
  type InterestRow = {
    applicationId: string;
    disciplineName: string | null;
    segmentName: string | null;
  };
  type TagRow = { applicationId: string; name: string; slug: string };

  let subjectiveByApp: Record<string, SubjectiveRow[]> = {};
  let schedulesByApp: Record<string, (typeof schedules.$inferSelect)[]> = {};
  let lessonTestsByApp: Record<string, LessonTest[]> = {};
  let practicesByApp: Record<
    string,
    (typeof teachingPracticeScores.$inferSelect)[]
  > = {};
  let interestsByApp: Record<string, InterestRow[]> = {};
  let potentialsByApp: Record<string, InterestRow[]> = {};
  let tagsByApp: Record<string, TagRow[]> = {};

  if (applicationIds.length > 0) {
    const [
      subjectiveRows,
      scheduleRows,
      lessonEvals,
      practiceRows,
      interestRows,
      potentialRows,
      tagRows,
    ] = await Promise.all([
      db
        .select({
          applicationId: subjectiveAnswers.applicationId,
          answer: subjectiveAnswers,
          instrument: instruments,
        })
        .from(subjectiveAnswers)
        .innerJoin(
          instruments,
          eq(instruments.id, subjectiveAnswers.instrumentId),
        )
        .where(inArray(subjectiveAnswers.applicationId, applicationIds)),
      db
        .select()
        .from(schedules)
        .where(inArray(schedules.applicationId, applicationIds)),
      db
        .select()
        .from(lessonTestEvaluations)
        .where(inArray(lessonTestEvaluations.applicationId, applicationIds)),
      db
        .select()
        .from(teachingPracticeScores)
        .where(inArray(teachingPracticeScores.applicationId, applicationIds)),
      db
        .select({
          applicationId: applicationInterests.applicationId,
          disciplineName: disciplines.name,
          segmentName: segments.name,
        })
        .from(applicationInterests)
        .leftJoin(
          disciplines,
          eq(disciplines.id, applicationInterests.disciplineId),
        )
        .leftJoin(segments, eq(segments.id, applicationInterests.segmentId))
        .where(inArray(applicationInterests.applicationId, applicationIds)),
      db
        .select({
          applicationId: applicationPotentials.applicationId,
          disciplineName: disciplines.name,
          segmentName: segments.name,
        })
        .from(applicationPotentials)
        .leftJoin(
          disciplines,
          eq(disciplines.id, applicationPotentials.disciplineId),
        )
        .leftJoin(segments, eq(segments.id, applicationPotentials.segmentId))
        .where(inArray(applicationPotentials.applicationId, applicationIds)),
      db
        .select({
          applicationId: applicationTags.applicationId,
          name: tags.name,
          slug: tags.slug,
        })
        .from(applicationTags)
        .innerJoin(tags, eq(tags.id, applicationTags.tagId))
        .where(inArray(applicationTags.applicationId, applicationIds)),
    ]);

    subjectiveByApp = groupByApp(subjectiveRows);
    schedulesByApp = groupByApp(scheduleRows);
    practicesByApp = groupByApp(practiceRows);
    interestsByApp = groupByApp(interestRows);
    potentialsByApp = groupByApp(potentialRows);
    tagsByApp = groupByApp(tagRows);

    if (lessonEvals.length > 0) {
      const scoreRows = await db
        .select({
          evaluationId: lessonTestScores.lessonTestEvaluationId,
          criterion: lessonTestCriteria,
          score: lessonTestScores.score,
        })
        .from(lessonTestScores)
        .innerJoin(
          lessonTestCriteria,
          eq(lessonTestCriteria.id, lessonTestScores.criterionId),
        )
        .where(
          inArray(
            lessonTestScores.lessonTestEvaluationId,
            lessonEvals.map((le) => le.id),
          ),
        );

      const scoresByEval = new Map<
        string,
        Array<{ criterion: typeof lessonTestCriteria.$inferSelect; score: string }>
      >();
      for (const row of scoreRows) {
        const list = scoresByEval.get(row.evaluationId) ?? [];
        list.push({ criterion: row.criterion, score: row.score });
        scoresByEval.set(row.evaluationId, list);
      }
      lessonTestsByApp = groupByApp(
        lessonEvals.map((le) => ({
          applicationId: le.applicationId,
          evaluation: le,
          scores: scoresByEval.get(le.id) ?? [],
        })),
      );
    }
  }

  const defaultId = defaultApp?.id;

  return {
    candidate,
    applications: candidateApplications,
    documentsByApp: docsByApp,
    scoresByApp,
    scoresByAppRevealed,
    evalsByApp,
    ownEvaluationsByApp,
    notes: candidateNotes,
    contacts: candidateContacts,
    history,
    dimensions: allDimensions,

    /** Candidatura padrão determinística (ver pickDefaultApplication). */
    defaultApplicationId: defaultId ?? null,

    // Escopo candidatura, agora para TODAS as candidaturas.
    subjectiveByApp,
    schedulesByApp,
    lessonTestsByApp,
    practicesByApp,
    interestsByApp,
    potentialsByApp,
    tagsByApp,
    flagsByApp: groupByApp(allFlags),
    secondPhase: allSecondPhase,

    // Projeções da candidatura padrão, para a UI atual. Serão removidas na Fase 5,
    // quando o perfil passar a receber a candidatura em foco.
    primaryApp: defaultApp ?? null,
    subjectiveAnswers: defaultId ? (subjectiveByApp[defaultId] ?? []) : [],
    schedules: defaultId ? (schedulesByApp[defaultId] ?? []) : [],
    lessonTests: defaultId ? (lessonTestsByApp[defaultId] ?? []) : [],
    practiceScores: defaultId ? (practicesByApp[defaultId] ?? []) : [],
    interests: defaultId ? (interestsByApp[defaultId] ?? []) : [],
    potentials: defaultId ? (potentialsByApp[defaultId] ?? []) : [],
    tags: defaultId ? (tagsByApp[defaultId] ?? []) : [],
    flags: allFlags,
  };
}

export async function getCandidatesByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(candidates)
    .where(inArray(candidates.id, ids));
  const byId = new Map(rows.map((c) => [c.id, c]));
  return ids
    .map((id) => byId.get(id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
}

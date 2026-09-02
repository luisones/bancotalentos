import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  applicationInterests,
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
  segments,
  staffUsers,
  subjectiveAnswers,
  tags,
  teachingPracticeScores,
} from "@/lib/db/schema";
import {
  buildDimensionScoresForApplications,
  getApplicationEvaluationsForApplications,
  type EvaluationRow,
} from "./scoring-data";
import type { ConsolidatedResult } from "@/lib/scoring";

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
    })
    .from(applications)
    .leftJoin(disciplines, eq(disciplines.id, applications.disciplineId))
    .leftJoin(campaigns, eq(campaigns.id, applications.campaignId))
    .where(eq(applications.candidateId, candidateId))
    .orderBy(desc(applications.appliedAt));

  const applicationIds = candidateApplications.map((a) => a.application.id);

  const docsByApp: Record<string, (typeof documents.$inferSelect)[]> = {};
  const scoresByApp: Record<string, ConsolidatedResult> = {};
  const evalsByApp: Record<string, EvaluationRow[]> = {};

  if (applicationIds.length > 0) {
    const [allDocs, scoreMap, evalMap] = await Promise.all([
      db
        .select()
        .from(documents)
        .where(inArray(documents.applicationId, applicationIds)),
      buildDimensionScoresForApplications(applicationIds, { staffUserId }),
      getApplicationEvaluationsForApplications(applicationIds),
    ]);

    for (const doc of allDocs) {
      const list = docsByApp[doc.applicationId] ?? [];
      list.push(doc);
      docsByApp[doc.applicationId] = list;
    }
    for (const appId of applicationIds) {
      const scores = scoreMap.get(appId);
      if (scores) scoresByApp[appId] = scores;
      evalsByApp[appId] = evalMap.get(appId) ?? [];
    }
  }

  const [candidateNotes, candidateContacts, history, allDimensions] =
    await Promise.all([
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
        .where(eq(auditEvents.entityId, candidateId))
        .orderBy(desc(auditEvents.createdAt))
        .limit(50),
      db.select().from(dimensions).orderBy(dimensions.sortOrder),
    ]);

  const primaryApp = candidateApplications[0]?.application;

  let subjectiveAnswersData: Array<{
    answer: typeof subjectiveAnswers.$inferSelect;
    instrument: typeof instruments.$inferSelect;
  }> = [];
  let schedulesData: Array<typeof schedules.$inferSelect> = [];
  const lessonTests: Array<{
    evaluation: typeof lessonTestEvaluations.$inferSelect;
    scores: Array<{
      criterion: typeof lessonTestCriteria.$inferSelect;
      score: string;
    }>;
  }> = [];
  let practiceScores: Array<typeof teachingPracticeScores.$inferSelect> = [];
  let interests: Array<{
    disciplineName: string | null;
    segmentName: string | null;
  }> = [];
  let potentials: Array<{
    disciplineName: string | null;
    segmentName: string | null;
  }> = [];
  let appTags: Array<{ name: string; slug: string }> = [];

  if (primaryApp) {
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
        .select({ answer: subjectiveAnswers, instrument: instruments })
        .from(subjectiveAnswers)
        .innerJoin(
          instruments,
          eq(instruments.id, subjectiveAnswers.instrumentId),
        )
        .where(eq(subjectiveAnswers.applicationId, primaryApp.id)),
      db
        .select()
        .from(schedules)
        .where(eq(schedules.applicationId, primaryApp.id)),
      db
        .select()
        .from(lessonTestEvaluations)
        .where(eq(lessonTestEvaluations.applicationId, primaryApp.id)),
      db
        .select()
        .from(teachingPracticeScores)
        .where(eq(teachingPracticeScores.applicationId, primaryApp.id)),
      db
        .select({
          disciplineName: disciplines.name,
          segmentName: segments.name,
        })
        .from(applicationInterests)
        .leftJoin(
          disciplines,
          eq(disciplines.id, applicationInterests.disciplineId),
        )
        .leftJoin(segments, eq(segments.id, applicationInterests.segmentId))
        .where(eq(applicationInterests.applicationId, primaryApp.id)),
      db
        .select({
          disciplineName: disciplines.name,
          segmentName: segments.name,
        })
        .from(applicationPotentials)
        .leftJoin(
          disciplines,
          eq(disciplines.id, applicationPotentials.disciplineId),
        )
        .leftJoin(segments, eq(segments.id, applicationPotentials.segmentId))
        .where(eq(applicationPotentials.applicationId, primaryApp.id)),
      db
        .select({ name: tags.name, slug: tags.slug })
        .from(applicationTags)
        .innerJoin(tags, eq(tags.id, applicationTags.tagId))
        .where(eq(applicationTags.applicationId, primaryApp.id)),
    ]);

    subjectiveAnswersData = subjectiveRows;
    schedulesData = scheduleRows;
    practiceScores = practiceRows;
    interests = interestRows;
    potentials = potentialRows;
    appTags = tagRows;

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
      for (const le of lessonEvals) {
        lessonTests.push({
          evaluation: le,
          scores: scoresByEval.get(le.id) ?? [],
        });
      }
    }
  }

  return {
    candidate,
    applications: candidateApplications,
    documentsByApp: docsByApp,
    scoresByApp,
    evalsByApp,
    notes: candidateNotes,
    contacts: candidateContacts,
    history,
    primaryApp,
    subjectiveAnswers: subjectiveAnswersData,
    schedules: schedulesData,
    lessonTests,
    practiceScores,
    interests,
    potentials,
    tags: appTags,
    dimensions: allDimensions,
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

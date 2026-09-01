import { desc, eq } from "drizzle-orm";
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
  buildDimensionScoresForApplication,
  getApplicationEvaluations,
} from "./scoring-data";

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
  if (applicationIds.length > 0) {
    for (const appId of applicationIds) {
      docsByApp[appId] = await db
        .select()
        .from(documents)
        .where(eq(documents.applicationId, appId));
    }
  }

  const scoresByApp: Record<string, Awaited<ReturnType<typeof buildDimensionScoresForApplication>>> = {};
  const evalsByApp: Record<string, Awaited<ReturnType<typeof getApplicationEvaluations>>> = {};

  for (const appId of applicationIds) {
    scoresByApp[appId] = await buildDimensionScoresForApplication(appId, {
      staffUserId,
    });
    evalsByApp[appId] = await getApplicationEvaluations(appId);
  }

  const candidateNotes = await db
    .select({
      note: notes,
      staffName: staffUsers.name,
    })
    .from(notes)
    .leftJoin(staffUsers, eq(staffUsers.id, notes.staffId))
    .where(eq(notes.candidateId, candidateId))
    .orderBy(desc(notes.createdAt));

  const candidateContacts = await db
    .select({
      contact: contacts,
      staffName: staffUsers.name,
    })
    .from(contacts)
    .leftJoin(staffUsers, eq(staffUsers.id, contacts.staffId))
    .where(eq(contacts.candidateId, candidateId))
    .orderBy(desc(contacts.contactedAt));

  const history = await db
    .select({
      event: auditEvents,
      staffName: staffUsers.name,
    })
    .from(auditEvents)
    .leftJoin(staffUsers, eq(staffUsers.id, auditEvents.staffId))
    .where(eq(auditEvents.entityId, candidateId))
    .orderBy(desc(auditEvents.createdAt))
    .limit(50);

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
  let interests: Array<{ disciplineName: string | null; segmentName: string | null }> = [];
  let potentials: Array<{ disciplineName: string | null; segmentName: string | null }> = [];
  let appTags: Array<{ name: string; slug: string }> = [];

  if (primaryApp) {
    subjectiveAnswersData = await db
      .select({ answer: subjectiveAnswers, instrument: instruments })
      .from(subjectiveAnswers)
      .innerJoin(instruments, eq(instruments.id, subjectiveAnswers.instrumentId))
      .where(eq(subjectiveAnswers.applicationId, primaryApp.id));

    schedulesData = await db
      .select()
      .from(schedules)
      .where(eq(schedules.applicationId, primaryApp.id));

    const lessonEvals = await db
      .select()
      .from(lessonTestEvaluations)
      .where(eq(lessonTestEvaluations.applicationId, primaryApp.id));

    for (const le of lessonEvals) {
      const scores = await db
        .select({
          criterion: lessonTestCriteria,
          score: lessonTestScores.score,
        })
        .from(lessonTestScores)
        .innerJoin(
          lessonTestCriteria,
          eq(lessonTestCriteria.id, lessonTestScores.criterionId),
        )
        .where(eq(lessonTestScores.lessonTestEvaluationId, le.id));
      lessonTests.push({ evaluation: le, scores });
    }

    practiceScores = await db
      .select()
      .from(teachingPracticeScores)
      .where(eq(teachingPracticeScores.applicationId, primaryApp.id));

    interests = await db
      .select({
        disciplineName: disciplines.name,
        segmentName: segments.name,
      })
      .from(applicationInterests)
      .leftJoin(disciplines, eq(disciplines.id, applicationInterests.disciplineId))
      .leftJoin(segments, eq(segments.id, applicationInterests.segmentId))
      .where(eq(applicationInterests.applicationId, primaryApp.id));

    potentials = await db
      .select({
        disciplineName: disciplines.name,
        segmentName: segments.name,
      })
      .from(applicationPotentials)
      .leftJoin(disciplines, eq(disciplines.id, applicationPotentials.disciplineId))
      .leftJoin(segments, eq(segments.id, applicationPotentials.segmentId))
      .where(eq(applicationPotentials.applicationId, primaryApp.id));

    appTags = await db
      .select({ name: tags.name, slug: tags.slug })
      .from(applicationTags)
      .innerJoin(tags, eq(tags.id, applicationTags.tagId))
      .where(eq(applicationTags.applicationId, primaryApp.id));
  }

  const allDimensions = await db
    .select()
    .from(dimensions)
    .orderBy(dimensions.sortOrder);

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
  const results = [];
  for (const id of ids) {
    const [candidate] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, id))
      .limit(1);
    if (candidate) results.push(candidate);
  }
  return results;
}

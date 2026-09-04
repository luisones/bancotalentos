import { eq, sql } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "../../src/lib/db/schema";
import type { CampaignConfig, IngestStats } from "./types";

type Db = NeonHttpDatabase<typeof schema>;

export async function assertCampaignCounts(
  db: Db,
  config: CampaignConfig,
  stats: IngestStats,
): Promise<void> {
  const exp = config.expected;
  const failures: string[] = [];
  const yearPrefix = config.slug === "2025-efaf-em" ? "PES-2025-" : "PES-2026-";

  const [candidateCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.candidates)
    .where(sql`${schema.candidates.externalRef} like ${`${yearPrefix}%`}`);

  const [appCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.applications)
    .innerJoin(schema.campaigns, eq(schema.applications.campaignId, schema.campaigns.id))
    .where(eq(schema.campaigns.slug, config.slug));

  const [answerCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.subjectiveAnswers)
    .innerJoin(
      schema.applications,
      eq(schema.subjectiveAnswers.applicationId, schema.applications.id),
    )
    .innerJoin(schema.campaigns, eq(schema.applications.campaignId, schema.campaigns.id))
    .where(eq(schema.campaigns.slug, config.slug));

  const [llmCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.llmEvaluations)
    .innerJoin(
      schema.subjectiveAnswers,
      eq(schema.llmEvaluations.answerId, schema.subjectiveAnswers.id),
    )
    .innerJoin(
      schema.applications,
      eq(schema.subjectiveAnswers.applicationId, schema.applications.id),
    )
    .innerJoin(schema.campaigns, eq(schema.applications.campaignId, schema.campaigns.id))
    .where(eq(schema.campaigns.slug, config.slug));

  const [practiceCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.teachingPracticeScores)
    .innerJoin(
      schema.applications,
      eq(schema.teachingPracticeScores.applicationId, schema.applications.id),
    )
    .innerJoin(schema.campaigns, eq(schema.applications.campaignId, schema.campaigns.id))
    .where(eq(schema.campaigns.slug, config.slug));

  const [lessonEvalCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.lessonTestEvaluations)
    .innerJoin(
      schema.applications,
      eq(schema.lessonTestEvaluations.applicationId, schema.applications.id),
    )
    .innerJoin(schema.campaigns, eq(schema.applications.campaignId, schema.campaigns.id))
    .where(eq(schema.campaigns.slug, config.slug));

  const [lessonScoreCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.lessonTestScores)
    .innerJoin(
      schema.lessonTestEvaluations,
      eq(schema.lessonTestScores.lessonTestEvaluationId, schema.lessonTestEvaluations.id),
    )
    .innerJoin(
      schema.applications,
      eq(schema.lessonTestEvaluations.applicationId, schema.applications.id),
    )
    .innerJoin(schema.campaigns, eq(schema.applications.campaignId, schema.campaigns.id))
    .where(eq(schema.campaigns.slug, config.slug));

  const [importedCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.importedDimensionScores)
    .innerJoin(
      schema.applications,
      eq(schema.importedDimensionScores.applicationId, schema.applications.id),
    )
    .innerJoin(schema.campaigns, eq(schema.applications.campaignId, schema.campaigns.id))
    .where(eq(schema.campaigns.slug, config.slug));

  const counts = {
    candidates: candidateCount?.count ?? 0,
    applications: appCount?.count ?? 0,
    subjectiveAnswers: answerCount?.count ?? 0,
    llmEvaluations: llmCount?.count ?? 0,
    teachingPracticeScores: practiceCount?.count ?? 0,
    lessonTestEvaluations: lessonEvalCount?.count ?? 0,
    lessonTestScores: lessonScoreCount?.count ?? 0,
    importedDimensionScores: importedCount?.count ?? 0,
  };

  if (counts.candidates !== exp.candidates) {
    failures.push(`candidates: got ${counts.candidates}, expected ${exp.candidates}`);
  }
  if (counts.applications !== exp.applications) {
    failures.push(`applications: got ${counts.applications}, expected ${exp.applications}`);
  }
  if (counts.subjectiveAnswers !== exp.subjectiveAnswers) {
    failures.push(
      `subjective_answers: got ${counts.subjectiveAnswers}, expected ${exp.subjectiveAnswers}`,
    );
  }
  if (counts.llmEvaluations > exp.llmEvaluationsMax) {
    failures.push(
      `llm_evaluations: got ${counts.llmEvaluations}, max ${exp.llmEvaluationsMax} (false zeros?)`,
    );
  }
  if (config.slug === "2025-efaf-em" && counts.llmEvaluations !== exp.llmEvaluations) {
    failures.push(
      `llm_evaluations: got ${counts.llmEvaluations}, expected ${exp.llmEvaluations}`,
    );
  }
  if (counts.teachingPracticeScores !== exp.teachingPracticeScores) {
    failures.push(
      `teaching_practice_scores: got ${counts.teachingPracticeScores}, expected ${exp.teachingPracticeScores}`,
    );
  }
  if (counts.lessonTestEvaluations !== exp.lessonTestEvaluations) {
    failures.push(
      `lesson_test_evaluations: got ${counts.lessonTestEvaluations}, expected ${exp.lessonTestEvaluations}`,
    );
  }
  if (counts.lessonTestScores !== exp.lessonTestScores) {
    failures.push(
      `lesson_test_scores: got ${counts.lessonTestScores}, expected ${exp.lessonTestScores}`,
    );
  }
  if (counts.importedDimensionScores > exp.importedDimensionScoresMax) {
    failures.push(
      `imported_dimension_scores: got ${counts.importedDimensionScores}, max ${exp.importedDimensionScoresMax}`,
    );
  }
  if (
    config.slug === "2025-efaf-em" &&
    counts.importedDimensionScores !== exp.importedDimensionScores
  ) {
    failures.push(
      `imported_dimension_scores: got ${counts.importedDimensionScores}, expected ${exp.importedDimensionScores}`,
    );
  }

  if (exp.secondPhaseConfirmations !== undefined) {
    const [sfCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.secondPhaseConfirmations)
      .innerJoin(
        schema.campaigns,
        eq(schema.secondPhaseConfirmations.campaignId, schema.campaigns.id),
      )
      .where(eq(schema.campaigns.slug, config.slug));
    const n = sfCount?.count ?? 0;
    if (n !== exp.secondPhaseConfirmations) {
      failures.push(
        `second_phase_confirmations: got ${n}, expected ${exp.secondPhaseConfirmations}`,
      );
    }
  }

  if (stats.maeQnF !== null && config.slug === "2025-efaf-em" && stats.maeQnF > 1e-6) {
    failures.push(`MAE QnF: ${stats.maeQnF} exceeds 1e-6`);
  }
  if (stats.maeQnF !== null && config.slug === "2026-scs" && stats.maeQnF > 0.05) {
    failures.push(`MAE QnF: ${stats.maeQnF} exceeds 0.05`);
  }

  if (failures.length > 0) {
    throw new Error(`Coverage guard failed for ${config.slug}:\n- ${failures.join("\n- ")}`);
  }
}

export function printDryRunSummary(
  config: CampaignConfig,
  stats: IngestStats,
  rowCounts: Record<string, number>,
): void {
  console.log(`\n=== Dry run: ${config.slug} ===`);
  for (const [sheet, count] of Object.entries(rowCounts)) {
    if (count > 0) console.log(`  ${sheet}: ${count} rows`);
  }
  console.log(`  skipped candidaturas: ${stats.skippedCandidaturas}`);
  console.log(`  notas rápidas (OBS): ${stats.quickNotesImported}`);
  console.log(
    `  MAE QnF: ${stats.maeQnF?.toExponential(3) ?? "n/a"} (${stats.maeQnFCount} rows)`,
  );
  console.log(
    `  MAE Apr Obj: ${stats.maeAprObj?.toExponential(3) ?? "n/a"} (${stats.maeAprObjCount} rows)`,
  );
  console.log(`  expected applications: ${config.expected.applications}`);
  console.log(`  expected LLM max: ${config.expected.llmEvaluationsMax}`);
}

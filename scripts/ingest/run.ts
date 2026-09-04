#!/usr/bin/env tsx
import { config } from "dotenv";
config({ path: ".env.local" });

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../../src/lib/db/schema";
import { assertCampaignCounts, printDryRunSummary } from "./guards";
import {
  createCrossCampaignMergeSuggestions,
  loadCampaign,
  workbookRowCounts,
} from "./load-campaign";
import { readWorkbook } from "./read-workbook";
import { CAMPAIGN_CONFIGS, type CampaignConfig } from "./types";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

function parseArgs(argv: string[]) {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const positionals = argv.filter((a) => !a.startsWith("--"));

  const campaignSlug = positionals[0];
  const fileOverride = positionals[1];

  return {
    campaignSlug,
    fileOverride,
    dryRun: flags.has("--dry-run"),
    allowPii: flags.has("--allow-pii"),
    replace: flags.has("--replace-campaign"),
    all: flags.has("--all"),
    crossMerge: flags.has("--cross-merge"),
  };
}

function resolveFile(
  config: CampaignConfig,
  fileOverride: string | undefined,
  allowPii: boolean,
): string {
  if (fileOverride) {
    if (!allowPii && fileOverride.includes("IDENTIFICADO")) {
      throw new Error(
        "Refusing IDENTIFICADO file without --allow-pii. Use ANONIMIZADO for development.",
      );
    }
    return fileOverride;
  }
  if (allowPii) return config.identFile;
  return config.anonFile;
}

function writeHandoff(
  config: CampaignConfig,
  stats: Awaited<ReturnType<typeof loadCampaign>>,
  dryRun: boolean,
) {
  const handoffPath = path.join(
    "docs/plano/handoffs",
    `ingest-${config.slug}.md`,
  );
  const now = new Date().toISOString();
  const content = `# Ingestão ${config.slug}

Gerado em ${now}${dryRun ? " (dry-run)" : ""}.

## Resumo

| Métrica | Valor |
|---------|-------|
| Candidatos criados | ${stats.candidatesCreated} |
| Candidatos atualizados | ${stats.candidatesUpdated} |
| Candidaturas criadas | ${stats.applicationsCreated} |
| Candidaturas atualizadas | ${stats.applicationsUpdated} |
| Documentos | ${stats.documentsCreated} |
| Respostas subjetivas | ${stats.subjectiveAnswersCreated} |
| Avaliações LLM | ${stats.llmEvaluationsCreated} |
| Scores de prática | ${stats.teachingPracticeScoresCreated} |
| Scores importados (dimensão) | ${stats.importedDimensionScoresCreated} |
| Aulas-teste (eval / scores) | ${stats.lessonTestEvaluationsCreated} / ${stats.lessonTestScoresCreated} |
| 2ª fase | ${stats.secondPhaseCreated} |
| Flags / tags / notas | ${stats.flagsCreated} / ${stats.tagsCreated} / ${stats.notesCreated} |
| Notas rápidas (OBS) | ${stats.quickNotesImported} |
| Merge suggestions | ${stats.mergeSuggestionsCreated} |
| Candidaturas ignoradas | ${stats.skippedCandidaturas} |
| Erros | ${stats.errors} |

## Validação de fórmulas

| Métrica | MAE | Amostras |
|---------|-----|----------|
| QnF | ${stats.maeQnF?.toExponential(3) ?? "—"} | ${stats.maeQnFCount} |
| Apr Obj | ${stats.maeAprObj?.toExponential(3) ?? "—"} | ${stats.maeAprObjCount} |

## Conferência esperada (${config.slug})

| | Esperado |
|---|---|
| candidates | ${config.expected.candidates} |
| applications | ${config.expected.applications} |
| subjective_answers | ${config.expected.subjectiveAnswers} |
| llm_evaluations (max) | ${config.expected.llmEvaluationsMax} |
| teaching_practice_scores | ${config.expected.teachingPracticeScores} |
| lesson_test_evaluations | ${config.expected.lessonTestEvaluations} |
| imported_dimension_scores (max) | ${config.expected.importedDimensionScoresMax} |
`;

  mkdirSync(path.dirname(handoffPath), { recursive: true });
  writeFileSync(handoffPath, content, "utf-8");
  console.log(`Handoff written: ${handoffPath}`);
}

async function runCampaign(
  config: CampaignConfig,
  options: ReturnType<typeof parseArgs>,
) {
  const filePath = resolveFile(config, options.fileOverride, options.allowPii);
  console.log(`Reading workbook for ${config.slug}...`);
  const workbook = readWorkbook(filePath);
  const rowCounts = workbookRowCounts(workbook);

  const stats = await loadCampaign(db, workbook, config, {
    dryRun: options.dryRun,
    replace: options.replace,
    sourceFile: path.basename(filePath),
  });

  printDryRunSummary(config, stats, rowCounts);

  if (!options.dryRun) {
    await assertCampaignCounts(db, config, stats);
    writeHandoff(config, stats, false);
  } else {
    writeHandoff(config, stats, true);
  }

  return stats;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.crossMerge) {
    await createCrossCampaignMergeSuggestions(db);
    console.log("Cross-campaign merge suggestions created.");
    return;
  }

  const slugs = options.all
    ? (["2025-efaf-em", "2026-scs"] as const)
    : options.campaignSlug
      ? ([options.campaignSlug] as const)
      : null;

  if (!slugs) {
    console.log(`Usage:
  npm run db:ingest -- <campaign-slug> [file] [--dry-run] [--allow-pii] [--replace-campaign]
  npm run db:ingest -- --all [--dry-run] [--allow-pii] [--replace-campaign]
  npm run db:ingest -- --cross-merge

Campaigns: ${Object.keys(CAMPAIGN_CONFIGS).join(", ")}
Default file: ANONIMIZADO (use --allow-pii for IDENTIFICADO)`);
    process.exit(1);
  }

  for (const slug of slugs) {
    const config = CAMPAIGN_CONFIGS[slug];
    if (!config) {
      console.error(`Unknown campaign: ${slug}`);
      process.exit(1);
    }
    await runCampaign(config, { ...options, campaignSlug: slug });
  }

  if (options.all && !options.dryRun) {
    await createCrossCampaignMergeSuggestions(db);
    console.log("Cross-campaign merge suggestions created.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

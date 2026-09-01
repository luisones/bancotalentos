import { config } from "dotenv";
config({ path: ".env.local" });

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../../src/lib/db/schema";
import { computeAprDisF, computeAprObj } from "../../src/lib/scoring";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const SOURCE_FILE =
  "dados-brutos/Anonimizado - BANCO TALENTOS DOCENTE EFAF-EM 2025.xlsx";
const CAMPAIGN_SLUG = "2025-efaf-em";
const HANDOFF_PATH = "docs/plano/handoffs/ingest-2025.md";

const PRACTICE_COLUMNS: { index: number; name: string; code: string }[] = [
  { index: 53, name: "Aferição Constante", code: "afericao-constante" },
  { index: 54, name: "Trabalhos em Grupo", code: "trabalhos-em-grupo" },
  { index: 55, name: "Seminários", code: "seminarios" },
  {
    index: 56,
    name: "Devolutiva Individualizada",
    code: "devolutiva-individualizada",
  },
  {
    index: 57,
    name: "Trabalhos de Pesquisa (internet)",
    code: "trabalhos-de-pesquisa-internet",
  },
  {
    index: 58,
    name: "Participação Estimulada",
    code: "participacao-estimulada",
  },
  { index: 59, name: "Estímulo ao Erro", code: "estimulo-ao-erro" },
  { index: 60, name: "Filmes e Séries", code: "filmes-e-series" },
  {
    index: 61,
    name: "Diagnóstico de Pré-requisitos",
    code: "diagnostico-de-pre-requisitos",
  },
  { index: 62, name: "Lousa Interativa", code: "lousa-interativa" },
  {
    index: 63,
    name: "Análise de resultados por habilidade",
    code: "analise-de-resultados-por-habilidade",
  },
  { index: 64, name: "Exercícios frequentes", code: "exercicios-frequentes" },
  { index: 65, name: "Cronômetro / tempo", code: "cronometro-tempo" },
  { index: 66, name: "Sermões", code: "sermoes" },
  { index: 67, name: "Focar nos interessados", code: "focar-nos-interessados" },
  {
    index: 68,
    name: "Destacar erros publicamente",
    code: "destacar-erros-publicamente",
  },
  {
    index: 69,
    name: "Corrigir comportamento imperceptível",
    code: "corrigir-comportamento-imperceptivel",
  },
  { index: 70, name: "Correção pública", code: "correcao-publica" },
  { index: 71, name: "Planejamento de aula", code: "planejamento-de-aula" },
];

const QUESTION_CONFIG = [
  { q: 1, answerCol: 27, llmCols: { L: 28, G: 29, A: 30, O: 31 }, humanCol: 32 },
  { q: 2, answerCol: 33, llmCols: { L: 34, G: 35, A: 36, O: 37 }, humanCol: 38 },
  { q: 3, answerCol: 39, llmCols: { L: 40, G: 41, A: 42, O: 43 }, humanCol: 44 },
  { q: 4, answerCol: 45, llmCols: { L: 46, G: 47, A: 48, O: 49 }, humanCol: 50 },
] as const;

const LESSON_CRITERIA_COLS = [
  { index: 6, name: "Empatia" },
  { index: 7, name: "Presença" },
  { index: 8, name: "Linguagem" },
  { index: 9, name: "Preparação" },
  { index: 10, name: "Material" },
  { index: 11, name: "Aferição" },
  { index: 12, name: "Clareza" },
  { index: 13, name: "Paciência" },
  { index: 14, name: "Responsabilidade" },
  { index: 15, name: "Energia" },
  { index: 16, name: "Lousa" },
  { index: 17, name: "Resolução Exercício" },
  { index: 18, name: "Voz" },
  { index: 19, name: "Confiança" },
];

type SheetRow = (string | number | null)[];

type ParsedWorkbook = {
  professores: { rowNumber: number; cells: SheetRow }[];
  aulasTeste: { rowNumber: number; cells: SheetRow }[];
};

type IngestStats = {
  rowsTotal: number;
  rowsImported: number;
  rowsSkipped: number;
  candidatesCreated: number;
  candidatesReused: number;
  applicationsCreated: number;
  documentsCreated: number;
  subjectiveAnswersCreated: number;
  llmEvaluationsCreated: number;
  teachingPracticeScoresCreated: number;
  importedDimensionScoresCreated: number;
  lessonTestsMatched: number;
  unmatchedLessonTests: number;
  maeAprDisF: number | null;
  maeAprObj: number | null;
  maeAprDisFCount: number;
  maeAprObjCount: number;
  errors: string[];
};

function extractDriveId(url: unknown): string | null {
  if (!url) return null;
  const s = String(url).trim();
  const idMatch = s.match(/[?&]id=([^&]+)/);
  if (idMatch) return idMatch[1];
  const fileMatch = s.match(/\/d\/([^/]+)/);
  return fileMatch ? fileMatch[1] : null;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function toText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

function meanAbsoluteError(expected: number[], actual: number[]): number | null {
  if (expected.length === 0) return null;
  const sum = expected.reduce(
    (acc, exp, i) => acc + Math.abs(exp - actual[i]),
    0,
  );
  return sum / expected.length;
}

function readWorkbook(filePath: string): ParsedWorkbook {
  const absPath = path.resolve(filePath);
  const python = `
import json, openpyxl, sys
from datetime import date, datetime

def serialize(v):
    if v is None:
        return None
    if isinstance(v, float) and v != v:
        return None
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    return v

path = sys.argv[1]
wb = openpyxl.load_workbook(path, read_only=True, data_only=True)

def read_sheet(name):
    ws = wb[name]
    rows = []
    for i, row in enumerate(ws.iter_rows(values_only=True), start=1):
        if i == 1:
            continue
        cells = [serialize(c) for c in row]
        if all(c is None or c == "" for c in cells):
            continue
        rows.append({"rowNumber": i, "cells": cells})
    return rows

print(json.dumps({
    "professores": read_sheet("PROFESSORES"),
    "aulasTeste": read_sheet("AULAS_TESTE"),
}))
`;

  const result = spawnSync("python3", ["-c", python, absPath], {
    encoding: "utf-8",
    maxBuffer: 50 * 1024 * 1024,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr || `python exited with ${result.status}`);
  }

  return JSON.parse(result.stdout) as ParsedWorkbook;
}

type ImportCaches = {
  candidateByDriveId: Map<string, string>;
  applicationKeys: Set<string>;
};

async function loadImportCaches(campaignId: string): Promise<ImportCaches> {
  const candidateRows = await db
    .select({
      id: schema.candidates.id,
      driveCvId: schema.candidates.driveCvId,
    })
    .from(schema.candidates);

  const candidateByDriveId = new Map<string, string>();
  for (const row of candidateRows) {
    if (row.driveCvId) candidateByDriveId.set(row.driveCvId, row.id);
  }

  const applicationRows = await db
    .select({
      candidateId: schema.applications.candidateId,
      disciplineId: schema.applications.disciplineId,
    })
    .from(schema.applications)
    .where(eq(schema.applications.campaignId, campaignId));

  const applicationKeys = new Set(
    applicationRows.map((a) => `${a.candidateId}:${a.disciplineId}`),
  );

  return { candidateByDriveId, applicationKeys };
}

async function getOrCreateCandidate(
  driveId: string,
  row: SheetRow,
  stats: IngestStats,
  caches: ImportCaches,
): Promise<string> {
  const cached = caches.candidateByDriveId.get(driveId);
  if (cached) {
    stats.candidatesReused += 1;
    return cached;
  }

  const [created] = await db
    .insert(schema.candidates)
    .values({
      fullName: `Candidato ${driveId.slice(0, 8)}`,
      email: toText(row[2]),
      phone: toText(row[3]),
      englishLevel: toText(row[9]),
      driveCvId: driveId,
    })
    .onConflictDoNothing({ target: schema.candidates.driveCvId })
    .returning({ id: schema.candidates.id });

  if (created) {
    caches.candidateByDriveId.set(driveId, created.id);
    stats.candidatesCreated += 1;
    return created.id;
  }

  const [existing] = await db
    .select({ id: schema.candidates.id })
    .from(schema.candidates)
    .where(eq(schema.candidates.driveCvId, driveId))
    .limit(1);

  if (!existing) {
    throw new Error(`Failed to resolve candidate for drive ID ${driveId}`);
  }

  caches.candidateByDriveId.set(driveId, existing.id);
  stats.candidatesReused += 1;
  return existing.id;
}

function validateFormulasFromSheet(
  rows: ParsedWorkbook["professores"],
): Pick<
  IngestStats,
  "maeAprDisF" | "maeAprObj" | "maeAprDisFCount" | "maeAprObjCount"
> {
  const aprDisExpected: number[] = [];
  const aprDisActual: number[] = [];
  const aprObjExpected: number[] = [];
  const aprObjActual: number[] = [];

  for (const { cells } of rows) {
    const aprDisSheet = toNumber(cells[14]);
    const q1f = toNumber(cells[32]);
    const q2f = toNumber(cells[38]);
    const q3f = toNumber(cells[44]);
    const q4f = toNumber(cells[50]);
    if (
      aprDisSheet !== null &&
      q1f !== null &&
      q2f !== null &&
      q3f !== null &&
      q4f !== null
    ) {
      aprDisExpected.push(computeAprDisF(q1f, q2f, q3f, q4f));
      aprDisActual.push(aprDisSheet);
    }

    const aprObjSheet = toNumber(cells[20]);
    const practiceSum = PRACTICE_COLUMNS.reduce((sum, p) => {
      const v = toNumber(cells[p.index]);
      return sum + (v ?? 0);
    }, 0);
    if (aprObjSheet !== null && practiceSum > 0) {
      aprObjExpected.push(computeAprObj(practiceSum));
      aprObjActual.push(aprObjSheet);
    }
  }

  return {
    maeAprDisF: meanAbsoluteError(aprDisExpected, aprDisActual),
    maeAprObj: meanAbsoluteError(aprObjExpected, aprObjActual),
    maeAprDisFCount: aprDisExpected.length,
    maeAprObjCount: aprObjExpected.length,
  };
}

async function importProfessoresRow(
  rowNumber: number,
  cells: SheetRow,
  ctx: {
    batchId: string;
    campaignId: string;
    disciplineByName: Map<string, string>;
    instrumentByCode: Map<string, string>;
    dimensionByCode: Map<string, string>;
    caches: ImportCaches;
    stats: IngestStats;
  },
) {
  const driveId = extractDriveId(cells[5]);
  if (!driveId) {
    ctx.stats.errors.push(`Row ${rowNumber}: missing Drive CV ID`);
    await db.insert(schema.importRowErrors).values({
      importBatchId: ctx.batchId,
      rowNumber,
      message: "Missing Drive CV ID in Currículo URL",
      payload: { cells },
    });
    ctx.stats.rowsSkipped += 1;
    return;
  }

  const disciplineName = toText(cells[4])?.trim();
  if (!disciplineName) {
    ctx.stats.errors.push(`Row ${rowNumber}: missing discipline`);
    await db.insert(schema.importRowErrors).values({
      importBatchId: ctx.batchId,
      rowNumber,
      message: "Missing discipline",
      payload: { driveId },
    });
    ctx.stats.rowsSkipped += 1;
    return;
  }

  const disciplineId = ctx.disciplineByName.get(disciplineName);
  if (!disciplineId) {
    ctx.stats.errors.push(
      `Row ${rowNumber}: unknown discipline "${disciplineName}"`,
    );
    await db.insert(schema.importRowErrors).values({
      importBatchId: ctx.batchId,
      rowNumber,
      message: `Unknown discipline: ${disciplineName}`,
      payload: { driveId, disciplineName },
    });
    ctx.stats.rowsSkipped += 1;
    return;
  }

  const candidateId = await getOrCreateCandidate(
    driveId,
    cells,
    ctx.stats,
    ctx.caches,
  );

  const applicationKey = `${candidateId}:${disciplineId}`;
  if (ctx.caches.applicationKeys.has(applicationKey)) {
    ctx.stats.errors.push(
      `Row ${rowNumber}: duplicate application for drive ${driveId} / ${disciplineName}`,
    );
    await db.insert(schema.importRowErrors).values({
      importBatchId: ctx.batchId,
      rowNumber,
      message: "Duplicate application (same drive CV + discipline)",
      payload: { driveId, disciplineName },
    });
    ctx.stats.rowsSkipped += 1;
    return;
  }

  const [application] = await db
    .insert(schema.applications)
    .values({
      candidateId,
      campaignId: ctx.campaignId,
      disciplineId,
      source: "import",
      differentialText: toText(cells[7]),
      candidateObservation: toText(cells[8]),
    })
    .returning({ id: schema.applications.id });

  ctx.stats.applicationsCreated += 1;
  ctx.caches.applicationKeys.add(applicationKey);

  const documentRows: {
    applicationId: string;
    type: "curriculo" | "video";
    url: string;
  }[] = [];
  const curriculumUrl = toText(cells[5]);
  if (curriculumUrl) {
    documentRows.push({
      applicationId: application.id,
      type: "curriculo",
      url: curriculumUrl,
    });
  }
  const videoUrl = toText(cells[6]);
  if (videoUrl) {
    documentRows.push({
      applicationId: application.id,
      type: "video",
      url: videoUrl,
    });
  }
  if (documentRows.length > 0) {
    await db.insert(schema.documents).values(documentRows);
    ctx.stats.documentsCreated += documentRows.length;
  }

  const answerRows: {
    applicationId: string;
    instrumentId: string;
    answerText: string | null;
    question: number;
  }[] = [];

  for (const q of QUESTION_CONFIG) {
    const answerText = toText(cells[q.answerCol]);
    const hasLlm = Object.values(q.llmCols).some(
      (col) => toNumber(cells[col]) !== null,
    );
    if (!answerText && !hasLlm) continue;

    const instrumentId = ctx.instrumentByCode.get(`Q${q.q}`);
    if (!instrumentId) continue;

    answerRows.push({
      applicationId: application.id,
      instrumentId,
      answerText,
      question: q.q,
    });
  }

  if (answerRows.length > 0) {
    const insertedAnswers = await db
      .insert(schema.subjectiveAnswers)
      .values(
        answerRows.map(({ applicationId, instrumentId, answerText }) => ({
          applicationId,
          instrumentId,
          answerText,
        })),
      )
      .returning({ id: schema.subjectiveAnswers.id });

    ctx.stats.subjectiveAnswersCreated += insertedAnswers.length;

    const llmRows: {
      answerId: string;
      providerCode: string;
      scoreRaw: string;
      scaleMax: string;
    }[] = [];

    insertedAnswers.forEach((answer, idx) => {
      const q = QUESTION_CONFIG.find((c) => c.q === answerRows[idx].question);
      if (!q) return;
      for (const provider of ["L", "G", "A", "O"] as const) {
        const score = toNumber(cells[q.llmCols[provider]]);
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
      await db.insert(schema.llmEvaluations).values(llmRows);
      ctx.stats.llmEvaluationsCreated += llmRows.length;
    }
  }

  const practiceRows = PRACTICE_COLUMNS.flatMap((practice) => {
    const score = toNumber(cells[practice.index]);
    if (score === null) return [];
    return [
      {
        applicationId: application.id,
        practiceCode: practice.code,
        scoreRaw: String(score),
      },
    ];
  });

  if (practiceRows.length > 0) {
    await db.insert(schema.teachingPracticeScores).values(practiceRows);
    ctx.stats.teachingPracticeScoresCreated += practiceRows.length;
  }

  const aprDisSheet = toNumber(cells[14]);
  const aprObjSheet = toNumber(cells[20]);

  const dimensionRows: {
    applicationId: string;
    dimensionId: string;
    score: string;
    source: string;
  }[] = [];

  const didaticaHumanaId = ctx.dimensionByCode.get("didatica_humana");
  if (didaticaHumanaId && aprDisSheet !== null) {
    dimensionRows.push({
      applicationId: application.id,
      dimensionId: didaticaHumanaId,
      score: String(aprDisSheet),
      source: "planilha_2025",
    });
  }

  const didaticaObjetivaId = ctx.dimensionByCode.get("didatica_objetiva");
  if (didaticaObjetivaId && aprObjSheet !== null) {
    dimensionRows.push({
      applicationId: application.id,
      dimensionId: didaticaObjetivaId,
      score: String(aprObjSheet),
      source: "planilha_2025",
    });
  }

  const finalCont = toNumber(cells[23]);
  const objCont = toNumber(cells[21]);
  const provaScore = finalCont ?? objCont;
  const provaConteudoId = ctx.dimensionByCode.get("prova_conteudo");
  if (provaConteudoId && provaScore !== null) {
    dimensionRows.push({
      applicationId: application.id,
      dimensionId: provaConteudoId,
      score: String(provaScore),
      source:
        finalCont !== null
          ? "planilha_2025_final_cont"
          : "planilha_2025_obj_cont",
    });
  }

  if (dimensionRows.length > 0) {
    await db.insert(schema.importedDimensionScores).values(dimensionRows);
    ctx.stats.importedDimensionScoresCreated += dimensionRows.length;
  }

  ctx.stats.rowsImported += 1;
}

async function importAulasTeste(
  rows: ParsedWorkbook["aulasTeste"],
  staffByEmail: Map<string, string>,
  stats: IngestStats,
) {
  const candidates = await db
    .select({
      applicationId: schema.applications.id,
      fullName: schema.candidates.fullName,
    })
    .from(schema.applications)
    .innerJoin(
      schema.candidates,
      eq(schema.applications.candidateId, schema.candidates.id),
    );

  const appsByCandidateName = new Map<string, string[]>();
  for (const row of candidates) {
    const list = appsByCandidateName.get(row.fullName) ?? [];
    list.push(row.applicationId);
    appsByCandidateName.set(row.fullName, list);
  }

  for (const { rowNumber, cells } of rows) {
    const candidateName = toText(cells[5]);
    const evaluatorEmail = toText(cells[2])?.toLowerCase() ?? null;
    const evaluatorStaffId = evaluatorEmail
      ? staffByEmail.get(evaluatorEmail)
      : undefined;

    const payload: Record<string, unknown> = {
      rowNumber,
      dataAula: cells[0],
      nomeAvaliador: cells[1],
      emailAvaliador: cells[2],
      cargoAvaliador: cells[3],
      vaga: cells[4],
      nomeCandidato: cells[5],
      comentarios: cells[20],
      criteria: Object.fromEntries(
        LESSON_CRITERIA_COLS.map((c) => [c.name, cells[c.index]]),
      ),
    };

    if (evaluatorStaffId) {
      payload.evaluatorStaffId = evaluatorStaffId;
    }

    const matchingApps = candidateName
      ? appsByCandidateName.get(candidateName)
      : undefined;

    if (matchingApps?.length === 1 && evaluatorStaffId) {
      stats.lessonTestsMatched += 1;
      continue;
    }

    await db.insert(schema.unmatchedLessonTests).values({
      candidateNameRaw: candidateName,
      evaluatorEmail,
      vacancyLabel: toText(cells[4]),
      payload,
    });
    stats.unmatchedLessonTests += 1;
  }
}

function formatHandoff(stats: IngestStats, batchId: string, startedAt: Date) {
  const finishedAt = new Date();
  return `# Ingestão 2025 EFAF-EM

Gerado em ${finishedAt.toISOString()} por \`scripts/ingest/2025-efaf-em.ts\`.

## Fonte

- Arquivo: \`${SOURCE_FILE}\`
- Batch ID: \`${batchId}\`
- Início: ${startedAt.toISOString()}
- Fim: ${finishedAt.toISOString()}

## Resumo

| Métrica | Valor |
|---------|-------|
| Linhas PROFESSORES | ${stats.rowsTotal} |
| Importadas | ${stats.rowsImported} |
| Ignoradas | ${stats.rowsSkipped} |
| Candidatos criados | ${stats.candidatesCreated} |
| Candidatos reutilizados | ${stats.candidatesReused} |
| Candidaturas | ${stats.applicationsCreated} |
| Documentos | ${stats.documentsCreated} |
| Respostas subjetivas | ${stats.subjectiveAnswersCreated} |
| Avaliações LLM | ${stats.llmEvaluationsCreated} |
| Scores de prática | ${stats.teachingPracticeScoresCreated} |
| Scores importados (dimensão) | ${stats.importedDimensionScoresCreated} |
| Aulas-teste pareadas | ${stats.lessonTestsMatched} |
| Aulas-teste sem par | ${stats.unmatchedLessonTests} |
| Erros | ${stats.errors.length} |

## Validação de fórmulas

| Dimensão | MAE | Amostras |
|----------|-----|----------|
| Apr Dis (F) | ${stats.maeAprDisF?.toExponential(3) ?? "—"} | ${stats.maeAprDisFCount} |
| Apr Obj | ${stats.maeAprObj?.toExponential(3) ?? "—"} | ${stats.maeAprObjCount} |

Critério de sucesso E03: MAE < 1e-6.

## Erros (${stats.errors.length})

${stats.errors.length === 0 ? "_Nenhum._" : stats.errors.map((e) => `- ${e}`).join("\n")}

## Comando

\`\`\`bash
npx tsx scripts/ingest/2025-efaf-em.ts
\`\`\`
`;
}

async function main() {
  const startedAt = new Date();
  console.log(`Reading ${SOURCE_FILE}...`);
  const workbook = readWorkbook(SOURCE_FILE);

  const [batch] = await db
    .insert(schema.importBatches)
    .values({ sourceFile: SOURCE_FILE })
    .returning({ id: schema.importBatches.id });

  const stats: IngestStats = {
    rowsTotal: workbook.professores.length,
    rowsImported: 0,
    rowsSkipped: 0,
    candidatesCreated: 0,
    candidatesReused: 0,
    applicationsCreated: 0,
    documentsCreated: 0,
    subjectiveAnswersCreated: 0,
    llmEvaluationsCreated: 0,
    teachingPracticeScoresCreated: 0,
    importedDimensionScoresCreated: 0,
    lessonTestsMatched: 0,
    unmatchedLessonTests: 0,
    maeAprDisF: null,
    maeAprObj: null,
    maeAprDisFCount: 0,
    maeAprObjCount: 0,
    errors: [],
  };

  const [campaign] = await db
    .select()
    .from(schema.campaigns)
    .where(eq(schema.campaigns.slug, CAMPAIGN_SLUG))
    .limit(1);

  if (!campaign) {
    throw new Error(
      `Campaign "${CAMPAIGN_SLUG}" not found. Run scripts/seed.ts first.`,
    );
  }

  const disciplineRows = await db.select().from(schema.disciplines);
  const disciplineByName = new Map(
    disciplineRows.map((d) => [d.name.trim(), d.id]),
  );

  const instrumentRows = await db
    .select()
    .from(schema.instruments)
    .where(eq(schema.instruments.campaignId, campaign.id));
  const instrumentByCode = new Map(
    instrumentRows.map((i) => [i.code, i.id]),
  );

  const dimensionRows = await db.select().from(schema.dimensions);
  const dimensionByCode = new Map(dimensionRows.map((d) => [d.code, d.id]));

  const staffRows = await db.select().from(schema.staffUsers);
  const staffByEmail = new Map(
    staffRows.map((s) => [s.email.toLowerCase(), s.id]),
  );

  const caches = await loadImportCaches(campaign.id);

  console.log(`Importing ${workbook.professores.length} PROFESSORES rows...`);

  for (let i = 0; i < workbook.professores.length; i++) {
    const { rowNumber, cells } = workbook.professores[i];
    await importProfessoresRow(rowNumber, cells, {
      batchId: batch.id,
      campaignId: campaign.id,
      disciplineByName,
      instrumentByCode,
      dimensionByCode,
      caches,
      stats,
    });

    if ((i + 1) % 25 === 0 || i + 1 === workbook.professores.length) {
      console.log(`  ${i + 1}/${workbook.professores.length} rows processed`);
    }
  }

  const formulaValidation = validateFormulasFromSheet(workbook.professores);
  stats.maeAprDisF = formulaValidation.maeAprDisF;
  stats.maeAprObj = formulaValidation.maeAprObj;
  stats.maeAprDisFCount = formulaValidation.maeAprDisFCount;
  stats.maeAprObjCount = formulaValidation.maeAprObjCount;

  console.log(
    `Formula MAE — Apr Dis (F): ${stats.maeAprDisF?.toExponential(3) ?? "n/a"} (${stats.maeAprDisFCount} rows)`,
  );
  console.log(
    `Formula MAE — Apr Obj: ${stats.maeAprObj?.toExponential(3) ?? "n/a"} (${stats.maeAprObjCount} rows)`,
  );

  console.log(`Importing ${workbook.aulasTeste.length} AULAS_TESTE rows...`);
  await importAulasTeste(workbook.aulasTeste, staffByEmail, stats);

  await db
    .update(schema.importBatches)
    .set({
      finishedAt: new Date(),
      rowCount: stats.rowsImported,
      errorCount: stats.errors.length,
    })
    .where(eq(schema.importBatches.id, batch.id));

  const handoff = formatHandoff(stats, batch.id, startedAt);
  mkdirSync(path.dirname(HANDOFF_PATH), { recursive: true });
  writeFileSync(HANDOFF_PATH, handoff, "utf-8");

  console.log("\n--- Ingest summary ---");
  console.log(JSON.stringify(stats, null, 2));
  console.log(`\nHandoff written to ${HANDOFF_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  applications,
  campaigns,
  candidates,
  dimensions,
  disciplines,
  documents,
  evaluations,
  instruments,
  notes,
  staffUsers,
  subjectiveAnswers,
  teachingPracticeScores,
} from "@/lib/db/schema";
import { normalizeScore } from "@/lib/scoring";
import { getAnswerScores, type AnswerScore } from "./answer-overrides";

/**
 * O que a página do professor precisa ALÉM das notas.
 *
 * As notas, o status, a estrela e as distâncias vêm de `getScoredApplications`,
 * que já pontua o banco inteiro uma vez por request — é a mesma passada que
 * calcula a posição na disciplina e o anterior/próximo. Aqui ficam só os
 * detalhes de UMA pessoa.
 *
 * O que saiu daqui em relação à consulta antiga: contatos, agendamentos,
 * interesses, potenciais, etiquetas, flags, segunda fase e a trilha de
 * auditoria. Nenhum deles aparece mais na página, e continuar carregando
 * oito tabelas para descartá-las era o custo invisível de um acordeão de dez
 * seções.
 *
 * A aula-teste também saiu — e ela custava DOIS acessos, porque os critérios
 * dependem dos ids das avaliações e não caíam no `batch`. Agora a ficha vem de
 * `/api/painel/[applicationId]` quando alguém a abre, que é o que a maioria das
 * visitas nunca faz.
 */
export type CandidateDetail = Awaited<ReturnType<typeof getCandidateDetail>>;

export type OwnEvaluation = {
  evaluationId: string;
  dimensionId: string;
  dimensionCode: string;
  /** Já normalizada para 0–10 no servidor. */
  score: number;
  comment: string | null;
  updatedAt: Date;
};

export type AnswerDetail = AnswerScore & {
  order: string;
  prompt: string;
  text: string | null;
  /** Escala dos provedores, para converter a nota em porcentagem. */
  scaleMax: number;
};

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = map.get(k);
    if (list) list.push(row);
    else map.set(k, [row]);
  }
  return map;
}

/**
 * Candidatura padrão, determinística: campanha ativa > maior `appliedAt` >
 * maior `createdAt`. `appliedAt` é nullable, então ordenar só por ele tornaria
 * a "primária" arbitrária entre dois carregamentos.
 */
function pickDefault<
  T extends {
    id: string;
    appliedAt: Date | null;
    createdAt: Date;
    campaignStatus: string | null;
  },
>(rows: T[]): T | undefined {
  if (rows.length === 0) return undefined;
  return [...rows].sort((a, b) => {
    const activeA = a.campaignStatus === "ativa" ? 1 : 0;
    const activeB = b.campaignStatus === "ativa" ? 1 : 0;
    if (activeA !== activeB) return activeB - activeA;

    const appliedA = a.appliedAt?.getTime() ?? -Infinity;
    const appliedB = b.appliedAt?.getTime() ?? -Infinity;
    if (appliedA !== appliedB) return appliedB - appliedA;

    return b.createdAt.getTime() - a.createdAt.getTime();
  })[0];
}

export async function getCandidateDetail(
  candidateId: string,
  staffUserId: string,
) {
  const [candidate] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);

  if (!candidate) return null;

  const apps = await db
    .select({
      id: applications.id,
      status: applications.status,
      appliedAt: applications.appliedAt,
      createdAt: applications.createdAt,
      differentialText: applications.differentialText,
      candidateObservation: applications.candidateObservation,
      disciplineName: disciplines.name,
      campaignName: campaigns.name,
      campaignSlug: campaigns.slug,
      campaignStatus: campaigns.status,
    })
    .from(applications)
    .leftJoin(disciplines, eq(disciplines.id, applications.disciplineId))
    .leftJoin(campaigns, eq(campaigns.id, applications.campaignId))
    .where(eq(applications.candidateId, candidateId))
    .orderBy(desc(applications.appliedAt));

  const applicationIds = apps.map((a) => a.id);

  if (applicationIds.length === 0) {
    return {
      candidate,
      applications: apps,
      defaultApplicationId: null,
      documentsByApp: new Map<string, (typeof documents.$inferSelect)[]>(),
      answersByApp: new Map<string, AnswerDetail[]>(),
      practicesByApp: new Map<
        string,
        (typeof teachingPracticeScores.$inferSelect)[]
      >(),
      ownEvaluationsByApp: new Map<string, Map<string, OwnEvaluation>>(),
      notes: [] as Array<{ id: string; body: string; author: string; createdAt: Date }>,
      dimensions: await db.select().from(dimensions).orderBy(dimensions.sortOrder),
    };
  }

  const [
    [docs, answerRows, practices, ownEvalRows, noteRows, allDimensions],
    answerScores,
  ] = await Promise.all([
    // Seis selects num HTTP: latência us-east-1 × 6 era o perfil "sempre lento".
    db.batch([
      db
        .select()
        .from(documents)
        .where(inArray(documents.applicationId, applicationIds)),
      db
        .select({
          applicationId: subjectiveAnswers.applicationId,
          answerId: subjectiveAnswers.id,
          answerText: subjectiveAnswers.answerText,
          code: instruments.code,
          promptText: instruments.promptText,
          scaleMax: instruments.scaleMax,
        })
        .from(subjectiveAnswers)
        .innerJoin(instruments, eq(instruments.id, subjectiveAnswers.instrumentId))
        .where(inArray(subjectiveAnswers.applicationId, applicationIds)),
      db
        .select()
        .from(teachingPracticeScores)
        .where(inArray(teachingPracticeScores.applicationId, applicationIds)),
      // Só as PRÓPRIAS avaliações: garante pelo tipo que a UI de edição nunca
      // recebe a nota de outro avaliador.
      db
        .select({
          id: evaluations.id,
          applicationId: evaluations.applicationId,
          dimensionId: evaluations.dimensionId,
          dimensionCode: dimensions.code,
          scoreRaw: evaluations.scoreRaw,
          scaleMax: evaluations.scaleMax,
          comment: evaluations.comment,
          updatedAt: evaluations.updatedAt,
        })
        .from(evaluations)
        .innerJoin(dimensions, eq(dimensions.id, evaluations.dimensionId))
        .where(
          and(
            inArray(evaluations.applicationId, applicationIds),
            eq(evaluations.evaluatorStaffId, staffUserId),
          ),
        ),
      db
        .select({
          id: notes.id,
          body: notes.body,
          createdAt: notes.createdAt,
          author: staffUsers.name,
        })
        .from(notes)
        .leftJoin(staffUsers, eq(staffUsers.id, notes.staffId))
        .where(eq(notes.candidateId, candidateId))
        .orderBy(desc(notes.createdAt)),
      db.select().from(dimensions).orderBy(dimensions.sortOrder),
    ]),
    getAnswerScores(applicationIds),
  ]);

  // As respostas casam com as notas do ensemble pelo id da resposta.
  const scoreByAnswerId = new Map<string, AnswerScore>();
  for (const list of answerScores.values()) {
    for (const score of list) scoreByAnswerId.set(score.answerId, score);
  }

  const answersByApp = new Map<string, AnswerDetail[]>();
  for (const row of answerRows) {
    const score = scoreByAnswerId.get(row.answerId);
    const list = answersByApp.get(row.applicationId) ?? [];
    list.push({
      answerId: row.answerId,
      applicationId: row.applicationId,
      ensemble: score?.ensemble ?? null,
      override: score?.override ?? null,
      effective: score?.effective ?? null,
      order: row.code,
      prompt: row.promptText ?? row.code,
      text: row.answerText,
      scaleMax: Number(row.scaleMax),
    });
    answersByApp.set(row.applicationId, list);
  }
  for (const list of answersByApp.values()) {
    list.sort((a, b) => a.order.localeCompare(b.order));
  }

  const ownEvaluationsByApp = new Map<string, Map<string, OwnEvaluation>>();
  for (const row of ownEvalRows) {
    const map = ownEvaluationsByApp.get(row.applicationId) ?? new Map();
    map.set(row.dimensionCode, {
      evaluationId: row.id,
      dimensionId: row.dimensionId,
      dimensionCode: row.dimensionCode,
      score: normalizeScore(Number(row.scoreRaw), Number(row.scaleMax)),
      comment: row.comment,
      updatedAt: row.updatedAt,
    });
    ownEvaluationsByApp.set(row.applicationId, map);
  }

  return {
    candidate,
    applications: apps,
    defaultApplicationId: pickDefault(apps)?.id ?? null,
    documentsByApp: groupBy(docs, (d) => d.applicationId),
    answersByApp,
    practicesByApp: groupBy(practices, (p) => p.applicationId),
    ownEvaluationsByApp,
    notes: noteRows.map((n) => ({
      ...n,
      author: n.author ?? "Autor não identificado",
    })),
    dimensions: allDimensions,
  };
}

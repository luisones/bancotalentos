export type SheetRow = Record<string, string | number | null>;

export type WorkbookData = {
  CANDIDATOS: SheetRow[];
  CANDIDATURAS: SheetRow[];
  DOCUMENTOS: SheetRow[];
  RESPOSTAS: SheetRow[];
  PRATICAS: SheetRow[];
  AULAS_TESTE: SheetRow[];
  SCORES_DIMENSAO: SheetRow[];
  PROVAS?: SheetRow[];
  SEGUNDA_FASE?: SheetRow[];
  FLAGS_TAGS?: SheetRow[];
  REJEITADOS?: SheetRow[];
  LEGENDA?: SheetRow[];
  DISCIPLINAS_DE_PARA?: SheetRow[];
};

export const SKIP_CANDIDATURA_IDS = new Set(["CAND-2026-399"]);

/** Prova-only labels that the workbook left without disciplina_canonica. */
export const DISCIPLINE_FALLBACKS: Record<string, string> = {
  "Língua Portuguesa": "Português (Produção e Interpretação de Texto)",
  "Lingua Portuguesa": "Português (Produção e Interpretação de Texto)",
};

export const QUESTION_PROMPTS: Record<string, string> = {
  Q1: "Como são suas estratégias para otimizar o uso do tempo em sala de aula?",
  Q2: "Durante o processo letivo, como você obtém a confirmação que seus alunos dominaram uma habilidade ou um conceito? Descreva suas estratégias de aferição/avaliação parcial.",
  Q3: "Que técnicas de estudo e autogestão da aprendizagem você faz total questão de ensinar minuciosamente e garantir que seus alunos estejam fazendo?",
  Q4: "Quais suas formas de renovação e aperfeiçoamento de técnicas de sala de aula? Fique à vontade para citar referências teóricas que você considera cruciais para o desenvolvimento das habilidades de docência.",
};

export type CampaignConfig = {
  slug: string;
  name: string;
  anonFile: string;
  identFile: string;
  skipCandidaturaIds: Set<string>;
  expected: {
    candidates: number;
    applications: number;
    subjectiveAnswers: number;
    llmEvaluations: number;
    llmEvaluationsMax: number;
    teachingPracticeScores: number;
    lessonTestEvaluations: number;
    lessonTestScores: number;
    importedDimensionScores: number;
    importedDimensionScoresMax: number;
    secondPhaseConfirmations?: number;
  };
};

export const CAMPAIGN_CONFIGS: Record<string, CampaignConfig> = {
  "2025-efaf-em": {
    slug: "2025-efaf-em",
    name: "2025 — EFAF-EM",
    anonFile: "tmp/2025-EFAF-EM_ANONIMIZADO.xlsx",
    identFile: "tmp/2025-EFAF-EM_IDENTIFICADO.xlsx",
    skipCandidaturaIds: new Set(),
    expected: {
      candidates: 264,
      applications: 270,
      subjectiveAnswers: 1080,
      llmEvaluations: 3372,
      llmEvaluationsMax: 3372,
      teachingPracticeScores: 5130,
      lessonTestEvaluations: 18,
      lessonTestScores: 219,
      importedDimensionScores: 729,
      importedDimensionScoresMax: 729,
    },
  },
  "2026-scs": {
    slug: "2026-scs",
    name: "2026 — SCS",
    anonFile: "tmp/2026-SCS_ANONIMIZADO.xlsx",
    identFile: "tmp/2026-SCS_IDENTIFICADO.xlsx",
    skipCandidaturaIds: SKIP_CANDIDATURA_IDS,
    expected: {
      candidates: 428,
      applications: 437,
      subjectiveAnswers: 1668,
      llmEvaluations: 2965,
      llmEvaluationsMax: 2965,
      teachingPracticeScores: 7923,
      lessonTestEvaluations: 0,
      lessonTestScores: 0,
      importedDimensionScores: 914,
      importedDimensionScoresMax: 914,
      secondPhaseConfirmations: 406,
    },
  },
};

export type IngestStats = {
  candidatesCreated: number;
  candidatesUpdated: number;
  applicationsCreated: number;
  applicationsUpdated: number;
  documentsCreated: number;
  subjectiveAnswersCreated: number;
  llmEvaluationsCreated: number;
  teachingPracticeScoresCreated: number;
  importedDimensionScoresCreated: number;
  lessonTestEvaluationsCreated: number;
  lessonTestScoresCreated: number;
  flagsCreated: number;
  tagsCreated: number;
  notesCreated: number;
  secondPhaseCreated: number;
  mergeSuggestionsCreated: number;
  errors: number;
  skippedCandidaturas: number;
  maeQnF: number | null;
  maeQnFCount: number;
  maeAprObj: number | null;
  maeAprObjCount: number;
};

export function emptyStats(): IngestStats {
  return {
    candidatesCreated: 0,
    candidatesUpdated: 0,
    applicationsCreated: 0,
    applicationsUpdated: 0,
    documentsCreated: 0,
    subjectiveAnswersCreated: 0,
    llmEvaluationsCreated: 0,
    teachingPracticeScoresCreated: 0,
    importedDimensionScoresCreated: 0,
    lessonTestEvaluationsCreated: 0,
    lessonTestScoresCreated: 0,
    flagsCreated: 0,
    tagsCreated: 0,
    notesCreated: 0,
    secondPhaseCreated: 0,
    mergeSuggestionsCreated: 0,
    errors: 0,
    skippedCandidaturas: 0,
    maeQnF: null,
    maeQnFCount: 0,
    maeAprObj: null,
    maeAprObjCount: 0,
  };
}

export function safePayload(
  pessoaId?: string | null,
  candidaturaId?: string | null,
  code?: string,
): Record<string, string> {
  const payload: Record<string, string> = {};
  if (pessoaId) payload.pessoa_id = pessoaId;
  if (candidaturaId) payload.candidatura_id = candidaturaId;
  if (code) payload.code = code;
  return payload;
}

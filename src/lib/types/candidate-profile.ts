import type { Tone } from "@/lib/tone";

/**
 * View model do perfil.
 *
 * Toda derivação — rótulos, formatação, tons, posições — acontece no SERVIDOR.
 * Os componentes só renderizam: não calculam, não normalizam, não traduzem
 * código cru.
 *
 * O modelo encolheu junto com a página. Sumiram `kpis`, `attention`, `stages`,
 * `history`, `contacts`, `audit` e `defaultOpen`: eram dez seções em acordeão
 * para responder uma pergunta que cabe em quatro faixas.
 */

export type Viewer = {
  staffId: string;
  canWrite: boolean;
  isAdmin: boolean;
};

export type FocusedApplication = {
  applicationId: string;
  /** "2026 SCS · História" — o escopo ao qual as notas pertencem. */
  label: string;
};

/** Avaliação do próprio usuário numa dimensão. Nunca contém dados de terceiros. */
export type OwnScore = {
  score: number;
  comment: string | null;
  updatedAt: string;
};

export type Position = {
  /** "2º de 12" */
  label: string;
  /** "na campanha" | "no banco" */
  scope: string;
};

/** Uma das quatro notas-folha, com o detalhe que o cartão abre. */
export type ScorePart = {
  code: string;
  /** `Obj.` | `Dis.` — o cartão já diz "Didática", a parte diz qual metade. */
  shortCode: string;
  label: string;
  score: number | null;
  display: string;
  positions: Position[];
  dimensionId: string;
  own: OwnScore | null;
};

export type AnswerView = {
  answerId: string;
  order: string;
  prompt: string;
  text: string;
  /** 0–100. `null` quando a pergunta não foi avaliada. */
  ensemblePercent: number | null;
  overridePercent: number | null;
  effectivePercent: number | null;
};

export type PracticeView = {
  code: string;
  label: string;
  /** "Favorável à aprendizagem" | "Desfavorável à aprendizagem" | null */
  direction: string | null;
  favorable: boolean;
  display: string;
};

/**
 * Um dos quatro cartões de nota.
 *
 * Não há mais `emptyHint`. A ausência era dita em prosa — "Ninguém lançou nota
 * de aula-teste.", "Só conteúdo objetiva." — e prosa é a forma mais lenta de
 * ler um estado que a própria barra vazia e o rótulo em vermelho mostram de
 * relance. Quatro cartões com uma frase embaixo de cada eram quatro parágrafos
 * onde bastavam quatro barras.
 */
export type ScoreCard = {
  code: string;
  label: string;
  score: number | null;
  display: string;
  tone: Tone;
  /** Vazio nos cartões que não são grupo. */
  parts: ScorePart[];
  positions: Position[];
  /** Dimensão a lançar quando o cartão aceita nota direta. */
  dimensionId: string | null;
  own: OwnScore | null;
  /** Quantas avaliações de colegas existem mas estão ocultas pela cegueira. */
  hiddenPeers: number;
};

export type ProfileViewModel = {
  candidateId: string;
  viewer: Viewer;
  focused: FocusedApplication | null;

  identity: {
    name: string;
    disciplineName: string | null;
    campaignName: string | null;
    campaignSlug: string | null;
    status: string;
    statusLabel: string;
    starred: boolean;
    positions: Position[];
    email: string | null;
    phone: string | null;
    whatsappUrl: string | null;
    quickNote: string | null;
    englishLevel: string | null;
    distances: {
      santoAndre: string | null;
      saoCaetano: string | null;
      /** Explica a aproximação, quando há. */
      note: string | null;
      /** Números crus e coordenada, para o mini-mapa. */
      kmSantoAndre: number | null;
      kmSaoCaetano: number | null;
      lat: number | null;
      lng: number | null;
      mode: string | null;
      precision: string | null;
    };
  };

  scores: {
    consolidated: number | null;
    display: string;
    coverage: number;
    totalDimensions: number;
    /** O consolidado exibido difere do real por causa da avaliação cega. */
    blindPartial: boolean;
    cards: ScoreCard[];
    answers: AnswerView[];
    practices: PracticeView[];
  };

  materials: {
    curriculoUrl: string | null;
    videoUrl: string | null;
    /** A nota do vídeo se lança AO LADO do vídeo, não numa aba de avaliação. */
    videoDimensionId: string | null;
    videoOwn: OwnScore | null;
    videoScore: number | null;
    videoDisplay: string;
    /** Texto do candidato — não é observação da equipe. */
    differential: string | null;
    candidateObservation: string | null;
  };

  notes: Array<{
    id: string;
    body: string;
    author: string;
    date: string;
  }>;

  applications: Array<{
    applicationId: string;
    label: string;
    sub: string;
  }>;
};

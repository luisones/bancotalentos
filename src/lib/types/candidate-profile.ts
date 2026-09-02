import type { SummaryItem } from "@/components/liceu/section-summary";
import type { AttentionPoint } from "@/lib/candidate/attention-points";
import type { Tone } from "@/lib/tone";

/**
 * View model do perfil.
 *
 * As 22 props de `ProfileTabs` viram cinco campos, e toda derivação (rótulos,
 * linhas-resumo, tons, datas) acontece no SERVIDOR. O componente de seção só
 * renderiza — não calcula, não normaliza, não traduz código cru.
 */

export type Badge = { label: string; tone: Tone };

export type FocusedApplication = {
  applicationId: string;
  /** "EFAF-EM 2025 · História" — o chip de escopo das seções. */
  label: string;
};

export type Viewer = {
  staffId: string;
  canWrite: boolean;
  isAdmin: boolean;
};

/** Avaliação do usuário numa dimensão. Nunca contém dados de terceiros. */
export type OwnScore = {
  score: number;
  comment: string | null;
  updatedAt: string;
};

export type DimensionView = {
  dimensionId: string;
  name: string;
  /** null nunca é 0: a dimensão simplesmente não entra no cálculo. */
  score: number | null;
  display: string;
  tone: Tone;
  evaluatorCount: number;
  /** Origem da nota, para o usuário saber de onde ela vem. */
  originLabel: string;
  own: OwnScore | null;
  /** Notas de colegas existem mas estão ocultas pela avaliação cega. */
  hiddenPeers: number;
  peers: Array<{ evaluator: string; display: string; comment: string | null }>;
};

export type ProfileViewModel = {
  candidateId: string;
  viewer: Viewer;
  focused: FocusedApplication | null;

  identity: {
    eyebrow: string;
    name: string;
    quickNote: string | null;
    quickNoteAuthorship: string | null;
    chips: string[];
    selective: { label: string; tone: Tone; raw: string };
    operational: { label: string; raw: string };
    classification: { label: string; raw: string };
    email: string | null;
    phone: string | null;
    whatsappUrl: string | null;
    footnote: string | null;
  };

  kpis: Array<{ value: string; label: string; note?: string; tone?: Tone }>;
  attention: AttentionPoint[];

  applications: Array<{
    applicationId: string;
    label: string;
    sub: string;
  }>;

  evaluation: {
    summary: SummaryItem[];
    dimensions: DimensionView[];
    coverage: number;
    totalDimensions: number;
    ownPending: string[];
    /** O consolidado exibido difere do real por causa da cegueira. */
    blindPartial: boolean;
  };

  materials: {
    summary: SummaryItem[];
    hasCurriculo: boolean;
    hasVideo: boolean;
    documents: Array<{
      id: string;
      typeLabel: string;
      openLabel: string;
      description: string | null;
      date: string | null;
      url: string | null;
    }>;
  };

  answers: {
    summary: SummaryItem[];
    items: Array<{
      id: string;
      order: string;
      prompt: string;
      text: string;
      scaleNote: string;
    }>;
  };

  stages: {
    summary: SummaryItem[];
    badge?: Badge;
    schedules: Array<{
      id: string;
      typeLabel: string;
      date: string;
      location: string | null;
      statusLabel: string;
      overdue: boolean;
    }>;
    lessonTests: Array<{
      id: string;
      evaluatorName: string;
      date: string;
      comment: string | null;
      criteria: Array<{ name: string; score: string }>;
    }>;
  };

  practices: {
    summary: SummaryItem[];
    items: Array<{
      code: string;
      label: string;
      direction: string | null;
      score: string;
    }>;
  };

  application: {
    summary: SummaryItem[];
    enrollment: Array<{ label: string; value: string }>;
    interests: string[];
    potentials: string[];
    tags: string[];
    activeFlags: string[];
    observation: string | null;
    differential: string | null;
    selectiveStatus: string;
    operationalStatus: string;
  };

  history: {
    summary: SummaryItem[];
    campaignCount: number;
    rows: Array<{
      applicationId: string;
      campaignName: string;
      disciplineName: string;
      appliedAt: string;
      score: string;
      coverage: string;
      selectiveLabel: string;
    }>;
  };

  contacts: {
    summary: SummaryItem[];
    badge?: Badge;
    items: Array<{
      id: string;
      date: string;
      channel: string;
      result: string;
      note: string | null;
      author: string;
    }>;
  };

  notes: {
    summary: SummaryItem[];
    badge?: Badge;
    items: Array<{
      id: string;
      body: string;
      author: string;
      date: string;
      highlighted: boolean;
    }>;
  };

  audit: {
    summary: SummaryItem[];
    badge?: Badge;
    items: Array<{
      id: string;
      date: string;
      action: string;
      detail: string | null;
      author: string;
      isPeek: boolean;
    }>;
  };

  /** Seções que nascem abertas, calculado no servidor: útil sem JS. */
  defaultOpen: string[];
};

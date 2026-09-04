import { isAdmin, canWrite, type StaffUser } from "@/lib/auth/staff";
import { formatDate } from "@/lib/format";
import {
  candidateStatusLabels,
  dimensionLabels,
  isFavorablePractice,
  labelFor,
  practiceDirectionLabels,
  scoringItemLabel,
  teachingPracticeLabels,
} from "@/lib/labels";
import type { CandidateDetail } from "@/lib/queries/candidate-detail";
import type {
  DisciplinePositions,
  ScoredApplication,
} from "@/lib/queries/scored-applications";
import { formatPosition } from "@/lib/queries/scored-applications";
import { formatScore } from "@/lib/scoring";
import type { Tone } from "@/lib/tone";
import type {
  AnswerView,
  InstrumentBadge,
  LessonTestView,
  OwnScore,
  Position,
  PracticeView,
  ProfileViewModel,
  ScoreCard,
  ScorePart,
} from "@/lib/types/candidate-profile";

/** Ordem fixa da fileira de pastilhas e dos cartões. */
const INSTRUMENT_ORDER = ["AT", "DO", "DD", "CD", "CO", "VD"];

/**
 * Nota alta é positiva, nota baixa é alerta — e ausência é neutra, nunca
 * alerta: não ter feito a prova não é o mesmo que ter ido mal nela.
 */
function scoreTone(score: number | null): Tone {
  if (score === null) return "neutral";
  if (score >= 7.5) return "positive";
  if (score >= 5) return "gold";
  return "alert";
}

/** Só dígitos, com DDI: é o formato que o wa.me aceita. */
function whatsappUrl(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}`;
}

function ownScoreOf(
  own: Map<string, { score: number; comment: string | null; updatedAt: Date }>,
  code: string,
): OwnScore | null {
  const entry = own.get(code);
  if (!entry) return null;
  return {
    score: entry.score,
    comment: entry.comment,
    updatedAt: formatDate(entry.updatedAt),
  };
}

function positionsOf(positions: DisciplinePositions): Position[] {
  const out: Position[] = [];
  const campaign = formatPosition(positions.campaign);
  const bank = formatPosition(positions.bank);
  if (campaign) out.push({ label: campaign, scope: "na campanha" });
  // Uma campanha só no banco torna as duas posições idênticas: repetir seria
  // ocupar espaço para dizer a mesma coisa duas vezes.
  if (bank && bank !== campaign) out.push({ label: bank, scope: "no banco" });
  return out;
}

/**
 * Distância formatada, com o grau de aproximação explícito.
 *
 * `≈` marca o que veio de centroide de bairro ou de município, ou de linha reta
 * porque o roteador não respondeu. Sem CEP não é 0 km: é `null`, e a interface
 * mostra o vazio.
 */
function formatDistance(
  km: number | null,
  approximate: boolean,
): string | null {
  if (km === null) return null;
  const value = km.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  return `${approximate ? "≈ " : ""}${value} km`;
}

export function buildProfileViewModel({
  detail,
  scored,
  positions,
  staff,
  focusedApplicationId,
}: {
  detail: NonNullable<CandidateDetail>;
  /** A candidatura em foco, já pontuada pela passada única do request. */
  scored: ScoredApplication | undefined;
  positions: DisciplinePositions;
  staff: StaffUser;
  focusedApplicationId?: string;
}): ProfileViewModel {
  const { candidate } = detail;

  const focusedApp =
    detail.applications.find((a) => a.id === focusedApplicationId) ??
    detail.applications.find((a) => a.id === detail.defaultApplicationId) ??
    detail.applications[0];

  const appId = focusedApp?.id ?? null;
  const scopeLabel = focusedApp
    ? [focusedApp.campaignName, focusedApp.disciplineName]
        .filter(Boolean)
        .join(" · ")
    : "";

  const own = (appId && detail.ownEvaluationsByApp.get(appId)) || new Map();
  const scores = scored?.scores ?? {};

  const dimensionByCode = new Map<string, (typeof detail.dimensions)[number]>(
    detail.dimensions.map((d) => [d.code, d]),
  );

  // ── Pastilhas de instrumento ────────────────────────────────────────────
  const instruments: InstrumentBadge[] = detail.dimensions
    .filter((d) => d.active && d.shortCode)
    .map((d) => {
      const score = scores[d.code] ?? null;
      return {
        code: d.code,
        shortCode: d.shortCode!,
        name: labelFor(dimensionLabels, d.code),
        score,
        display: formatScore(score),
        applied: score !== null,
      };
    })
    .sort(
      (a, b) =>
        INSTRUMENT_ORDER.indexOf(a.shortCode) -
        INSTRUMENT_ORDER.indexOf(b.shortCode),
    );

  const partOf = (code: string): ScorePart => {
    const dim = dimensionByCode.get(code);
    const score = scores[code] ?? null;
    return {
      code,
      shortCode: dim?.shortCode ?? "",
      label: labelFor(dimensionLabels, code),
      score,
      display: formatScore(score),
      // A posição relativa é do candidato, não da dimensão: repeti-la em cada
      // parte transformaria o cartão numa parede de "3º de 14".
      positions: [],
      dimensionId: dim?.id ?? "",
      own: ownScoreOf(own, code),
    };
  };

  const groupCard = (
    groupCode: string,
    memberCodes: string[],
  ): ScoreCard => {
    const score = scores[groupCode] ?? null;
    return {
      code: groupCode,
      label: scoringItemLabel(groupCode),
      score,
      display: formatScore(score),
      tone: scoreTone(score),
      parts: memberCodes.map(partOf),
      positions: [],
      dimensionId: null,
      own: null,
      hiddenPeers: 0,
      emptyHint: null,
    };
  };

  const lessonScore = scores.aula_teste ?? null;
  const videoScore = scores.video ?? null;
  const videoDim = dimensionByCode.get("video");
  const lessonDim = dimensionByCode.get("aula_teste");

  const cards: ScoreCard[] = [
    {
      code: "aula_teste",
      label: "Aula-teste",
      score: lessonScore,
      display: formatScore(lessonScore),
      tone: scoreTone(lessonScore),
      parts: [],
      positions: [],
      dimensionId: lessonDim?.id ?? null,
      own: ownScoreOf(own, "aula_teste"),
      hiddenPeers: 0,
      emptyHint:
        lessonScore === null
          ? "Sem aula-teste lançada — clique para avaliar"
          : null,
    },
    groupCard("didatica", ["didatica_objetiva", "didatica_dissertativa"]),
    groupCard("conteudo", ["conteudo_dissertativa", "conteudo_objetiva"]),
    {
      code: "video",
      label: "Vídeo",
      score: videoScore,
      display: formatScore(videoScore),
      tone: scoreTone(videoScore),
      parts: [],
      positions: [],
      dimensionId: videoDim?.id ?? null,
      own: ownScoreOf(own, "video"),
      hiddenPeers: 0,
      emptyHint:
        videoScore === null ? "Sem nota de vídeo — clique para avaliar" : null,
    },
  ];

  // ── Detalhe dos cartões ────────────────────────────────────────────────
  const lessonTests: LessonTestView[] = (
    (appId && detail.lessonTestsByApp.get(appId)) ||
    []
  ).map((test) => ({
    id: test.id,
    evaluatorName: test.evaluatorName,
    date: test.evaluatedAt ? formatDate(test.evaluatedAt) : null,
    comment: test.comment,
    criteria: test.criteria.map((c) => ({
      name: c.name,
      display: formatScore(c.score),
    })),
  }));

  const toPercent = (value: number | null, scaleMax: number) =>
    value === null || scaleMax <= 0 ? null : (value / scaleMax) * 100;

  const answers: AnswerView[] = (
    (appId && detail.answersByApp.get(appId)) ||
    []
  ).map((answer) => ({
    answerId: answer.answerId,
    order: answer.order,
    prompt: answer.prompt,
    text: answer.text ?? "",
    ensemblePercent: toPercent(answer.ensemble, answer.scaleMax),
    overridePercent: toPercent(answer.override, answer.scaleMax),
    effectivePercent: toPercent(answer.effective, answer.scaleMax),
  }));

  const practices: PracticeView[] = (
    (appId && detail.practicesByApp.get(appId)) ||
    []
  ).map((practice) => ({
    code: practice.practiceCode,
    // `labelFor` devolve o código cru quando não sabemos traduzi-lo, em vez
    // de esconder a prática.
    label: labelFor(teachingPracticeLabels, practice.practiceCode),
    direction: practice.direction
      ? labelFor(practiceDirectionLabels, practice.direction)
      : null,
    favorable: isFavorablePractice(practice.direction),
    display: formatScore(Number(practice.scoreRaw), 2),
  }));

  // ── Materiais ──────────────────────────────────────────────────────────
  const docs = (appId && detail.documentsByApp.get(appId)) || [];
  const urlOf = (type: string) => {
    const doc = docs.find((d) => d.type === type);
    // `e_url = NAO` na origem virou URL que não é URL: nome de arquivo ou
    // "Não encontrado". Um link para isso não abre nada.
    if (!doc?.url || !/^https?:\/\//i.test(doc.url)) return null;
    return doc.url;
  };

  const approximate =
    scored?.distanceMode !== "rodoviaria" || scored?.distancePrecision !== "rua";

  return {
    candidateId: candidate.id,
    viewer: {
      staffId: staff.id,
      canWrite: canWrite(staff),
      isAdmin: isAdmin(staff),
    },
    focused: focusedApp
      ? { applicationId: focusedApp.id, label: scopeLabel }
      : null,

    identity: {
      name: candidate.fullName,
      disciplineName: focusedApp?.disciplineName ?? null,
      campaignName: focusedApp?.campaignName ?? null,
      campaignSlug: focusedApp?.campaignSlug ?? null,
      status: focusedApp?.status ?? "novo",
      statusLabel: labelFor(candidateStatusLabels, focusedApp?.status ?? "novo"),
      starred: candidate.starred,
      positions: positionsOf(positions),
      email: candidate.email,
      phone: candidate.phone,
      whatsappUrl: whatsappUrl(candidate.phone),
      quickNote: candidate.highlightedNote,
      englishLevel: candidate.englishLevel,
      distances: {
        santoAndre: formatDistance(scored?.kmSantoAndre ?? null, approximate),
        saoCaetano: formatDistance(scored?.kmSaoCaetano ?? null, approximate),
        note: distanceNote(scored),
      },
    },

    instruments,

    scores: {
      consolidated: scored?.consolidated ?? null,
      display: formatScore(scored?.consolidated ?? null),
      coverage: scored?.coverage ?? 0,
      totalDimensions: scored?.totalDimensions ?? 0,
      blindPartial: false,
      cards,
      lessonTests,
      answers,
      practices,
    },

    materials: {
      curriculoUrl: urlOf("curriculo"),
      videoUrl: urlOf("video"),
      differential: focusedApp?.differentialText ?? null,
      candidateObservation: focusedApp?.candidateObservation ?? null,
    },

    notes: detail.notes.map((note) => ({
      id: note.id,
      body: note.body,
      author: note.author,
      date: formatDate(note.createdAt),
    })),

    applications: detail.applications.map((app) => ({
      applicationId: app.id,
      label: app.disciplineName ?? "Sem disciplina",
      sub: app.campaignName ?? "Sem campanha",
    })),
  };
}

function distanceNote(scored: ScoredApplication | undefined): string | null {
  if (!scored || scored.kmSantoAndre === null) return null;
  const parts: string[] = [];
  parts.push(
    scored.distanceMode === "rodoviaria"
      ? "distância rodoviária"
      : "linha reta (o roteador não respondeu)",
  );
  if (scored.distancePrecision === "rua") {
    parts.push("a partir do logradouro do CEP");
  } else if (scored.distancePrecision === "bairro") {
    parts.push("a partir do centro do bairro do CEP");
  } else {
    parts.push("a partir do centro do município — o CEP não tem logradouro");
  }
  return parts.join(", ");
}

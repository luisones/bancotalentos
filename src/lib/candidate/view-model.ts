import type { SummaryItem } from "@/components/liceu/section-summary";
import type { StaffUser } from "@/lib/auth/staff";
import { canWrite, isAdmin } from "@/lib/auth/staff";
import {
  buildAttentionPoints,
  type AttentionPoint,
} from "@/lib/candidate/attention-points";
import { formatDate, relativeDays } from "@/lib/format";
import {
  auditActionLabels,
  contactChannelLabels,
  contactResultLabels,
  dimensionLabels,
  flagLabel,
  labelFor,
  operationalStatusLabels,
  practiceDirectionLabels,
  scheduleStatusLabels,
  scheduleTypeLabels,
  selectiveStatusLabels,
  talentClassificationLabels,
  teachingPracticeLabels,
  isFavorablePractice,
} from "@/lib/labels";
import type { getCandidateProfile } from "@/lib/queries/candidate";
import { formatScore, normalizeScore } from "@/lib/scoring";
import type { Tone } from "@/lib/tone";
import type {
  DimensionView,
  ProfileViewModel,
} from "@/lib/types/candidate-profile";
import { whatsAppUrl } from "@/lib/whatsapp";

type Profile = NonNullable<Awaited<ReturnType<typeof getCandidateProfile>>>;

const DOC_TYPE_LABELS: Record<string, string> = {
  curriculo: "Currículo",
  video: "Vídeo de apresentação",
  gravacao_entrevista: "Gravação da entrevista",
  outro: "Outro material",
};

const DOC_OPEN_LABELS: Record<string, string> = {
  curriculo: "Abrir currículo",
  video: "Assistir ao vídeo",
  gravacao_entrevista: "Assistir à gravação",
  outro: "Abrir",
};

/**
 * Constrói o view model do perfil.
 *
 * Tudo aqui roda no servidor: rótulos, linhas-resumo, tons, datas, o conjunto
 * de seções abertas por padrão e as regras de pendência. As seções só
 * renderizam. É o que faz a página ser útil antes de qualquer JS.
 */
export function buildProfileViewModel({
  profile,
  staff,
  focusedApplicationId,
  openSectionId,
}: {
  profile: Profile;
  staff: StaffUser;
  focusedApplicationId?: string;
  /** Deep link ?abrir=secao-x: abre aquela seção no servidor. */
  openSectionId?: string;
}): ProfileViewModel {
  const c = profile.candidate;
  const viewer = {
    staffId: staff.id,
    canWrite: canWrite(staff),
    isAdmin: isAdmin(staff),
  };

  // Candidatura em foco: query param válido, senão o default determinístico.
  const focusedRow =
    profile.applications.find(
      (a) => a.application.id === focusedApplicationId,
    ) ??
    profile.applications.find(
      (a) => a.application.id === profile.defaultApplicationId,
    ) ??
    null;

  const appId = focusedRow?.application.id ?? null;
  const appLabel = focusedRow
    ? [
        focusedRow.campaignName ?? "Cadastro manual · sem campanha",
        focusedRow.disciplineName,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  const scores = appId ? profile.scoresByApp[appId] : undefined;
  const revealed = appId ? profile.scoresByAppRevealed[appId] : undefined;
  const evals = appId ? (profile.evalsByApp[appId] ?? []) : [];
  const own = appId ? (profile.ownEvaluationsByApp[appId] ?? {}) : {};
  const docs = appId ? (profile.documentsByApp[appId] ?? []) : [];

  // --- dimensões ---
  const byCode = new Map(
    (scores?.dimensionScores ?? []).map((d) => [d.code, d]),
  );
  const dimensions: DimensionView[] = profile.dimensions.map((dim) => {
    const ds = byCode.get(dim.code);
    const rows = evals.filter((e) => e.dimensionId === dim.id);
    const mine = own[dim.id] ?? null;
    const peerRows = rows.filter((e) => e.evaluatorStaffId !== staff.id);
    const canSeePeers = Boolean(mine) || peerRows.some((e) => e.blindPeekedAt);

    return {
      dimensionId: dim.id,
      name: labelFor(dimensionLabels, dim.code),
      score: ds?.score ?? null,
      display: formatScore(ds?.score ?? null),
      tone: scoreTone(ds?.score ?? null),
      evaluatorCount: rows.length,
      originLabel: originOf(dim.code, rows.length, ds?.score ?? null),
      own: mine
        ? {
            score: mine.score,
            comment: mine.comment,
            updatedAt: formatDate(mine.updatedAt),
          }
        : null,
      hiddenPeers: canSeePeers ? 0 : peerRows.length,
      peers: canSeePeers
        ? peerRows.map((e) => ({
            evaluator: e.evaluatorName,
            display: formatScore(
              normalizeScore(Number(e.scoreRaw), Number(e.scaleMax)),
            ),
            comment: e.comment,
          }))
        : [],
    };
  });

  const missing = dimensions.filter((d) => d.score === null).map((d) => d.name);
  const singleEvaluator = dimensions
    .filter((d) => d.evaluatorCount === 1)
    .map((d) => d.name);
  const ownPending = viewer.canWrite
    ? dimensions.filter((d) => !d.own).map((d) => d.name)
    : [];
  const evaluatorIds = new Set(evals.map((e) => e.evaluatorStaffId));
  const coverage = scores?.coverage ?? 0;
  const totalDimensions = scores?.totalDimensions ?? profile.dimensions.length;
  const blindPartial =
    revealed !== undefined &&
    scores !== undefined &&
    revealed.consolidated !== scores.consolidated;

  // --- materiais ---
  const hasCurriculo = docs.some((d) => d.type === "curriculo");
  const hasVideo = docs.some((d) => d.type === "video");
  const lastDocDate = docs
    .map((d) => d.documentDate)
    .filter((d): d is Date => Boolean(d))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  // --- respostas ---
  const answerRows = appId ? (profile.subjectiveByApp[appId] ?? []) : [];
  const words = answerRows.reduce(
    (acc, r) => acc + (r.answer.answerText?.trim().split(/\s+/).length ?? 0),
    0,
  );

  // --- etapas ---
  const scheduleRows = appId ? (profile.schedulesByApp[appId] ?? []) : [];
  const now = Date.now();
  const stale = scheduleRows.filter(
    (s) => s.status === "agendado" && s.scheduledAt && s.scheduledAt.getTime() < now,
  );
  const pendingSchedules = scheduleRows.filter(
    (s) => s.status === "a_agendar" || s.status === "reagendar",
  );
  const lessonRows = appId ? (profile.lessonTestsByApp[appId] ?? []) : [];

  // --- práticas ---
  const practiceRows = appId ? (profile.practicesByApp[appId] ?? []) : [];
  const favorable = practiceRows.filter((p) =>
    isFavorablePractice(p.direction),
  ).length;
  const unfavorable = practiceRows.filter(
    (p) => p.direction && !isFavorablePractice(p.direction),
  ).length;

  // --- candidatura ---
  const flagRows = appId ? (profile.flagsByApp[appId] ?? []) : [];
  const activeFlags = flagRows
    .filter((f) => f.active)
    .map((f) => flagLabel(f.flagCode));
  const tagRows = appId ? (profile.tagsByApp[appId] ?? []) : [];
  const secondPhase = focusedRow?.application.campaignId
    ? profile.secondPhase.filter(
        (s) => s.campaignId === focusedRow.application.campaignId,
      )
    : [];
  const emailDiverged = secondPhase.some((s) => s.emailDiverged);

  // --- contatos / observações / auditoria ---
  const lastContact = profile.contacts[0];
  const awaiting =
    lastContact &&
    ["retornar_depois", "nao_respondeu"].includes(lastContact.contact.result);
  const overdueFollowUp =
    lastContact && lastContact.contact.result === "retornar_depois"
      ? { since: lastContact.contact.contactedAt }
      : null;
  const highlightedCount = profile.notes.filter(
    (n) => n.note.isHighlighted,
  ).length;
  const peekEvents = profile.history.filter((h) =>
    h.event.action.startsWith("blind_peek"),
  );
  const evaluationEvents = profile.history.filter(
    (h) => h.event.action === "evaluation_saved",
  );
  const quickNoteEvent = profile.history.find(
    (h) => h.event.action === "quick_note_updated",
  );

  const attention: AttentionPoint[] = buildAttentionPoints({
    consolidated: scores?.consolidated ?? null,
    coverage,
    totalDimensions,
    missingDimensions: missing,
    singleEvaluatorDimensions: singleEvaluator,
    ownPendingDimensions: ownPending,
    hasCurriculo,
    hasVideo,
    overdueFollowUp,
    staleSchedules: stale.length,
    emailDiverged,
    activeFlags,
    hasWeights: totalDimensions > 0,
    canWrite: viewer.canWrite,
  });

  const campaignCount = new Set(
    profile.applications.map((a) => a.application.campaignId ?? "manual"),
  ).size;
  const bestScore = profile.applications
    .map((a) => profile.scoresByApp[a.application.id]?.consolidated ?? null)
    .filter((s): s is number => s !== null)
    .sort((a, b) => b - a)[0];
  const firstYear = profile.applications
    .map((a) => a.application.appliedAt ?? a.application.createdAt)
    .sort((a, b) => a.getTime() - b.getTime())[0]
    ?.getFullYear();

  return {
    candidateId: c.id,
    viewer,
    focused: appId && appLabel ? { applicationId: appId, label: appLabel } : null,

    identity: {
      eyebrow: appLabel
        ? `Ficha do candidato · ${appLabel}`
        : "Ficha do candidato · sem candidatura",
      name: c.fullName,
      quickNote: c.highlightedNote,
      quickNoteAuthorship: quickNoteEvent
        ? `editada por ${quickNoteEvent.staffName ?? "autor não identificado"} ${relativeDays(quickNoteEvent.event.createdAt)}`
        : null,
      chips: [
        focusedRow?.disciplineName,
        c.city,
        c.englishLevel ? `Inglês ${c.englishLevel}` : null,
        c.externalRef,
      ].filter((v): v is string => Boolean(v)),
      selective: {
        label: labelFor(
          selectiveStatusLabels,
          focusedRow?.application.selectiveStatus,
        ),
        tone: selectiveTone(focusedRow?.application.selectiveStatus),
        raw: focusedRow?.application.selectiveStatus ?? "em_avaliacao",
      },
      operational: {
        label: labelFor(
          operationalStatusLabels,
          focusedRow?.application.operationalStatus,
        ),
        raw: focusedRow?.application.operationalStatus ?? "novo",
      },
      classification: {
        label: labelFor(talentClassificationLabels, c.talentClassification),
        raw: c.talentClassification,
      },
      email: c.email,
      phone: c.phone,
      whatsappUrl: whatsAppUrl(c.phone),
      footnote: c.origin
        ? `Origem do registro: ${c.origin}. Cadastro manual não recebe importação.`
        : null,
    },

    kpis: [
      {
        value: formatScore(scores?.consolidated ?? null),
        label: "Resultado consolidado",
        note:
          scores?.consolidated === undefined || scores?.consolidated === null
            ? "sem dimensões avaliadas"
            : `sobre ${coverage} de ${totalDimensions} dimensões`,
      },
      {
        value: `${coverage}/${totalDimensions}`,
        label: "Cobertura",
        note:
          missing.length > 0
            ? `${missing.length} sem nenhuma avaliação`
            : "todas as dimensões avaliadas",
        tone: coverageTone(coverage, totalDimensions),
      },
      viewer.canWrite
        ? {
            value: String(ownPending.length),
            label: "Pendentes suas",
            note:
              ownPending.length === 0
                ? "sua avaliação está completa"
                : ownPending.slice(0, 3).join(", "),
            tone: ownPending.length > 0 ? ("alert" as Tone) : ("positive" as Tone),
          }
        : {
            value: String(missing.length),
            label: "Sem avaliação",
            note: "dimensões sem nenhuma nota",
            tone: "neutral" as Tone,
          },
      {
        value: String(evaluatorIds.size),
        label: "Avaliadores",
        note: `${evals.length} registros individuais · média não substitui registro`,
      },
      {
        value: String(profile.applications.length),
        label: "Candidaturas",
        note: `em ${campaignCount} ${campaignCount === 1 ? "campanha" : "campanhas"}${firstYear ? ` desde ${firstYear}` : ""}`,
      },
      {
        value: profile.history[0]
          ? (relativeDays(profile.history[0].event.createdAt) ?? "—")
          : "—",
        label: "Última movimentação",
        note: profile.history[0]
          ? labelFor(auditActionLabels, profile.history[0].event.action)
          : "nenhum evento",
        tone: "neutral",
      },
    ],

    attention,

    applications: profile.applications.map((a) => {
      const s = profile.scoresByApp[a.application.id];
      return {
        applicationId: a.application.id,
        label: [
          a.campaignName ?? "Manual · sem campanha",
          a.disciplineName,
        ]
          .filter(Boolean)
          .join(" · "),
        sub: `${formatScore(s?.consolidated ?? null)} · ${s?.coverage ?? 0}/${s?.totalDimensions ?? 0} · ${labelFor(selectiveStatusLabels, a.application.selectiveStatus)}`,
      };
    }),

    evaluation: {
      summary: appId
        ? trim4([
            {
              text: `${formatScore(scores?.consolidated ?? null)} consolidado`,
              strong: true,
            },
            { text: `${coverage} de ${totalDimensions} dimensões avaliadas` },
            {
              text: `${evaluatorIds.size} ${evaluatorIds.size === 1 ? "avaliador" : "avaliadores"}`,
            },
            ownPending.length > 0
              ? {
                  text: `${ownPending.length} pendentes suas`,
                  tone: "alert" as Tone,
                }
              : null,
          ])
        : [{ text: "sem candidatura em foco" }],
      dimensions,
      coverage,
      totalDimensions,
      ownPending,
      blindPartial,
    },

    materials: {
      summary: trim4([
        { text: hasCurriculo ? "1 currículo" : "sem currículo", tone: hasCurriculo ? undefined : ("alert" as Tone) },
        { text: hasVideo ? "1 vídeo" : "sem vídeo", tone: hasVideo ? undefined : ("alert" as Tone) },
        docs.some((d) => d.type === "gravacao_entrevista")
          ? { text: "com gravação de entrevista" }
          : { text: "sem gravação de entrevista" },
        lastDocDate ? { text: `anexados em ${formatDate(lastDocDate)}` } : null,
      ]),
      hasCurriculo,
      hasVideo,
      documents: docs.map((d) => ({
        id: d.id,
        typeLabel: labelFor(DOC_TYPE_LABELS, d.type),
        openLabel: labelFor(DOC_OPEN_LABELS, d.type),
        description: d.description,
        date: d.documentDate ? formatDate(d.documentDate) : null,
        url: d.url || null,
      })),
    },

    answers: {
      summary: trim4([
        {
          text: `${answerRows.length} ${answerRows.length === 1 ? "resposta" : "respostas"} registradas`,
        },
        words > 0 ? { text: `${words.toLocaleString("pt-BR")} palavras` } : null,
      ]),
      items: answerRows.map((r, i) => ({
        id: r.answer.id,
        order: `Pergunta ${i + 1}`,
        // O enunciado real já está no banco; o código Q1 era o que vazava.
        prompt: r.instrument.promptText ?? r.instrument.code,
        text: r.answer.answerText ?? "",
        scaleNote: `Escala de 0 a ${r.instrument.scaleMax ?? 10} no instrumento, normalizada para 0 a 10 no consolidado.`,
      })),
    },

    stages: {
      summary: trim4([
        {
          text: `${scheduleRows.length} ${scheduleRows.length === 1 ? "agendamento" : "agendamentos"}`,
        },
        {
          text:
            lessonRows.length > 0
              ? `aula-teste avaliada por ${lessonRows.length}`
              : "aula-teste sem avaliação",
        },
        stale.length > 0
          ? { text: `${stale.length} com data vencida`, tone: "alert" as Tone }
          : null,
      ]),
      badge:
        stale.length > 0
          ? { label: "Data vencida", tone: "alert" }
          : pendingSchedules.length > 0
            ? { label: "Agendamento pendente", tone: "gold" }
            : undefined,
      schedules: scheduleRows.map((s) => ({
        id: s.id,
        typeLabel: labelFor(scheduleTypeLabels, s.type),
        date: formatDate(s.scheduledAt),
        location: s.location,
        statusLabel: labelFor(scheduleStatusLabels, s.status),
        overdue:
          s.status === "agendado" &&
          Boolean(s.scheduledAt && s.scheduledAt.getTime() < now),
      })),
      lessonTests: lessonRows.map((lt) => ({
        id: lt.evaluation.id,
        evaluatorName: "Avaliador",
        date: formatDate(lt.evaluation.evaluatedAt ?? lt.evaluation.createdAt),
        comment: lt.evaluation.comment,
        criteria: lt.scores.map((s) => ({
          name: s.criterion.name,
          score: formatScore(Number(s.score)),
        })),
      })),
    },

    practices: {
      summary: trim4([
        {
          text: `${practiceRows.length} ${practiceRows.length === 1 ? "prática declarada" : "práticas declaradas"}`,
        },
        favorable > 0 || unfavorable > 0
          ? { text: `${favorable} favoráveis, ${unfavorable} desfavoráveis` }
          : null,
        { text: "compõem a Didática objetiva" },
      ]),
      items: practiceRows.map((p) => ({
        code: p.practiceCode,
        label: labelFor(teachingPracticeLabels, p.practiceCode),
        direction: p.direction
          ? labelFor(practiceDirectionLabels, p.direction)
          : null,
        score: formatScore(Number(p.scoreRaw)),
      })),
    },

    application: {
      summary: appLabel
        ? trim4([
            { text: appLabel, strong: true },
            focusedRow?.application.appliedAt
              ? {
                  text: `inscrito em ${formatDate(focusedRow.application.appliedAt)}`,
                }
              : null,
            tagRows.length > 0
              ? {
                  text: `${tagRows.length} ${tagRows.length === 1 ? "etiqueta" : "etiquetas"}`,
                }
              : null,
            activeFlags.length > 0
              ? { text: "com sinalização", tone: "alert" as Tone }
              : null,
          ])
        : [{ text: "sem candidatura registrada" }],
      enrollment: [
        {
          label: "Campanha",
          value: focusedRow?.campaignName ?? "Sem campanha",
        },
        {
          label: "Disciplina",
          value: focusedRow?.disciplineName ?? "—",
        },
        {
          label: "Inscrição",
          value: formatDate(focusedRow?.application.appliedAt),
        },
        {
          label: "Matrícula",
          value: focusedRow?.application.examRegistration ?? "—",
        },
        ...(secondPhase.length > 0
          ? [
              {
                label: "2ª fase",
                value: secondPhase
                  .map((s) => s.examChoice)
                  .filter(Boolean)
                  .join(", "),
              },
            ]
          : []),
      ],
      interests: (appId ? (profile.interestsByApp[appId] ?? []) : []).map((i) =>
        [i.disciplineName, i.segmentName].filter(Boolean).join(" · "),
      ),
      potentials: (appId ? (profile.potentialsByApp[appId] ?? []) : []).map(
        (i) => [i.disciplineName, i.segmentName].filter(Boolean).join(" · "),
      ),
      tags: tagRows.map((t) => t.name),
      activeFlags,
      observation: focusedRow?.application.candidateObservation ?? null,
      differential: focusedRow?.application.differentialText ?? null,
      selectiveStatus: focusedRow?.application.selectiveStatus ?? "em_avaliacao",
      operationalStatus: focusedRow?.application.operationalStatus ?? "novo",
    },

    history: {
      summary: trim4([
        {
          text: `${profile.applications.length} candidaturas em ${campaignCount} ${campaignCount === 1 ? "campanha" : "campanhas"}`,
        },
        bestScore !== undefined
          ? { text: `melhor resultado ${formatScore(bestScore)}` }
          : null,
        firstYear ? { text: `primeira em ${firstYear}` } : null,
      ]),
      campaignCount,
      rows: profile.applications.map((a) => {
        const s = profile.scoresByApp[a.application.id];
        return {
          applicationId: a.application.id,
          campaignName: a.campaignName ?? "Manual · sem campanha",
          disciplineName: a.disciplineName ?? "—",
          appliedAt: formatDate(a.application.appliedAt),
          score: formatScore(s?.consolidated ?? null),
          coverage: `${s?.coverage ?? 0}/${s?.totalDimensions ?? 0}`,
          selectiveLabel: labelFor(
            selectiveStatusLabels,
            a.application.selectiveStatus,
          ),
        };
      }),
    },

    contacts: {
      summary: trim4([
        {
          text: `${profile.contacts.length} ${profile.contacts.length === 1 ? "contato" : "contatos"}`,
        },
        lastContact
          ? {
              text: `último por ${labelFor(contactChannelLabels, lastContact.contact.channel)} em ${formatDate(lastContact.contact.contactedAt)}`,
            }
          : null,
        lastContact
          ? {
              text: labelFor(
                contactResultLabels,
                lastContact.contact.result,
              ).toLowerCase(),
              tone: awaiting ? ("gold" as Tone) : undefined,
            }
          : null,
      ]),
      badge: awaiting ? { label: "Aguardando retorno", tone: "gold" } : undefined,
      items: profile.contacts.map((row) => ({
        id: row.contact.id,
        date: formatDate(row.contact.contactedAt),
        channel: labelFor(contactChannelLabels, row.contact.channel),
        result: labelFor(contactResultLabels, row.contact.result),
        note: row.contact.note,
        author: row.staffName ?? "autor não identificado",
      })),
    },

    notes: {
      summary: trim4([
        {
          text: `${profile.notes.length} ${profile.notes.length === 1 ? "observação" : "observações"}`,
        },
        highlightedCount > 0
          ? { text: `${highlightedCount} fixada no topo`, tone: "gold" as Tone }
          : null,
        profile.notes[0]
          ? {
              text: `última por ${profile.notes[0].staffName ?? "autor não identificado"} em ${formatDate(profile.notes[0].note.createdAt)}`,
            }
          : null,
      ]),
      badge:
        highlightedCount > 0
          ? { label: `${highlightedCount} fixada`, tone: "gold" }
          : undefined,
      items: profile.notes.map((row) => ({
        id: row.note.id,
        body: row.note.body,
        author: row.staffName ?? "autor não identificado",
        date: formatDate(row.note.createdAt),
        highlighted: row.note.isHighlighted,
      })),
    },

    audit: {
      summary: trim4([
        {
          text: `${profile.history.length} ${profile.history.length === 1 ? "evento" : "eventos"}`,
        },
        evaluationEvents.length > 0
          ? { text: `${evaluationEvents.length} avaliações salvas` }
          : null,
        peekEvents.length > 0
          ? {
              text: `${peekEvents.length} ${peekEvents.length === 1 ? "revelação" : "revelações"} de avaliação cega`,
              tone: "alert" as Tone,
            }
          : null,
        profile.history[0]
          ? { text: `último ${relativeDays(profile.history[0].event.createdAt)}` }
          : null,
      ]),
      badge:
        peekEvents.length > 0
          ? {
              label: `${peekEvents.length} ${peekEvents.length === 1 ? "revelação" : "revelações"} de avaliação cega`,
              tone: "alert",
            }
          : undefined,
      items: profile.history.map((row) => ({
        id: row.event.id,
        date: formatDate(row.event.createdAt),
        action: labelFor(auditActionLabels, row.event.action),
        detail: auditDetail(row.event.action, row.event.metadata),
        author: row.staffName ?? "autor não identificado",
        isPeek: row.event.action.startsWith("blind_peek"),
      })),
    },

    // Abertas por padrão: o que responde "posso decidir sobre este candidato?".
    defaultOpen: [
      "secao-avaliacao",
      "secao-materiais",
      ...(profile.applications.length > 1 ? ["secao-historico"] : []),
      ...(stale.length > 0 || pendingSchedules.length > 0
        ? ["secao-etapas"]
        : []),
      ...(awaiting ? ["secao-contatos"] : []),
      ...(highlightedCount > 0 ? ["secao-observacoes"] : []),
      ...(openSectionId ? [openSectionId] : []),
    ],
  };
}

/** Máximo 4 itens por linha-resumo: a partir de 6, densidade vira ruído. */
function trim4(items: Array<SummaryItem | null>): SummaryItem[] {
  return items.filter((i): i is SummaryItem => i !== null).slice(0, 4);
}

function scoreTone(score: number | null): Tone {
  if (score === null) return "neutral";
  if (score >= 8) return "positive";
  if (score >= 6) return "navy";
  return "alert";
}

function coverageTone(coverage: number, total: number): Tone {
  if (total === 0 || coverage === 0) return "alert";
  if (coverage >= total) return "positive";
  if (coverage * 2 < total) return "alert";
  return "gold";
}

function selectiveTone(status: string | undefined): Tone {
  if (status === "avancar" || status === "selecionado") return "positive";
  if (status === "em_duvida") return "gold";
  if (status === "nao_avancar" || status === "nao_selecionado") return "alert";
  return "navy";
}


function originOf(
  code: string,
  evaluatorCount: number,
  score: number | null,
): string {
  if (score === null) return "Ausente — não conta como zero";
  if (evaluatorCount > 0) {
    return `Avaliada por ${evaluatorCount} ${evaluatorCount === 1 ? "avaliador" : "avaliadores"}`;
  }
  if (code === "aula_teste") return "Rubrica da aula-teste";
  return "Importada da planilha";
}

function auditDetail(action: string, metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const m = metadata as Record<string, unknown>;

  if (action === "status_updated") {
    const parts: string[] = [];
    if (typeof m.selectiveStatus === "string") {
      parts.push(
        `situação seletiva para "${labelFor(selectiveStatusLabels, m.selectiveStatus)}"`,
      );
    }
    if (typeof m.operationalStatus === "string") {
      parts.push(
        `etapa para "${labelFor(operationalStatusLabels, m.operationalStatus)}"`,
      );
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  }
  if (action === "classification_updated" && typeof m.classification === "string") {
    return `para "${labelFor(talentClassificationLabels, m.classification)}"`;
  }
  if (action === "quick_note_updated") {
    const to = typeof m.para === "string" ? m.para : null;
    return to ? `para "${to}"` : "nota rápida removida";
  }
  if (action === "evaluation_saved" && typeof m.score === "number") {
    return `nota ${formatScore(m.score)}`;
  }
  // Nunca JSON.stringify na tela: metadata inesperado não vira lixo visível.
  return null;
}

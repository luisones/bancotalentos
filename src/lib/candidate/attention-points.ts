import type { Tone } from "@/lib/tone";

/**
 * Pontos de atenção — o substituto DETERMINÍSTICO do painel "✦" da referência.
 *
 * Nenhuma IA: cada regra é uma função pura sobre dados que o app já tem, com
 * uma origem declarada e um link para a seção onde se resolve. Isso também
 * torna as regras testáveis, o que um assistente não seria.
 */
export type AttentionPoint = {
  id: string;
  tag: string;
  title: string;
  detail: string;
  tone: Tone;
  /**
   * Link para a seção que resolve a pendência. Usa ?abrir= (lido no servidor)
   * em vez de só #hash, para a seção abrir mesmo com JS desligado.
   */
  href: string;
};

export type AttentionInput = {
  consolidated: number | null;
  coverage: number;
  totalDimensions: number;
  /** Dimensões sem nenhuma avaliação. */
  missingDimensions: string[];
  /** Dimensões com exatamente um avaliador (regra 5 pede múltiplos). */
  singleEvaluatorDimensions: string[];
  /** Dimensões que o próprio usuário ainda não avaliou. */
  ownPendingDimensions: string[];
  hasCurriculo: boolean;
  hasVideo: boolean;
  /** Contatos com resultado "retornar depois" e data já vencida. */
  overdueFollowUp: { since: Date } | null;
  /** Agendamentos com data passada e status ainda "agendado". */
  staleSchedules: number;
  emailDiverged: boolean;
  activeFlags: string[];
  hasWeights: boolean;
  canWrite: boolean;
};

export function buildAttentionPoints(input: AttentionInput): AttentionPoint[] {
  const points: AttentionPoint[] = [];

  if (input.canWrite && input.ownPendingDimensions.length > 0) {
    points.push({
      id: "suas-pendentes",
      tag: "sua avaliação",
      title: `${input.ownPendingDimensions.length} ${plural(input.ownPendingDimensions.length, "dimensão pendente", "dimensões pendentes")} sua${input.ownPendingDimensions.length > 1 ? "s" : ""}`,
      detail: input.ownPendingDimensions.join(", "),
      tone: "navy",
      href: "?abrir=secao-avaliacao",
    });
  }

  if (input.totalDimensions > 0 && input.coverage === 0) {
    points.push({
      id: "sem-avaliacao",
      tag: "sem resultado",
      title: "Nenhuma dimensão avaliada",
      detail: `${input.totalDimensions} dimensões previstas e nenhuma nota registrada.`,
      tone: "alert",
      href: "?abrir=secao-avaliacao",
    });
  } else if (input.missingDimensions.length > 0) {
    points.push({
      id: "cobertura",
      tag: "cobertura parcial",
      title: `${input.missingDimensions.length} ${plural(input.missingDimensions.length, "dimensão sem avaliação", "dimensões sem avaliação")}`,
      detail: `${input.missingDimensions.join(", ")} — ficam fora do cálculo e não valem zero.`,
      tone: "gold",
      href: "?abrir=secao-avaliacao",
    });
  }

  if (input.singleEvaluatorDimensions.length > 0) {
    points.push({
      id: "avaliador-unico",
      tag: "um só avaliador",
      title: `${input.singleEvaluatorDimensions.length} ${plural(input.singleEvaluatorDimensions.length, "dimensão", "dimensões")} com um avaliador só`,
      detail: `${input.singleEvaluatorDimensions.join(", ")} — o processo prevê múltiplos avaliadores por dimensão.`,
      tone: "gold",
      href: "?abrir=secao-avaliacao",
    });
  }

  if (!input.hasCurriculo || !input.hasVideo) {
    const faltando = [
      !input.hasCurriculo ? "currículo" : null,
      !input.hasVideo ? "vídeo" : null,
    ].filter(Boolean);
    points.push({
      id: "material",
      tag: "material faltando",
      title: `Sem ${faltando.join(" e sem ")}`,
      detail:
        "Currículo e vídeo pertencem à candidatura — outras candidaturas podem ter material próprio.",
      tone: "alert",
      href: "?abrir=secao-materiais",
    });
  }

  if (input.overdueFollowUp) {
    points.push({
      id: "retorno",
      tag: "retorno vencido",
      title: "Contato marcado para retornar já venceu",
      detail: `Último contato pedia retorno desde ${fmt(input.overdueFollowUp.since)}.`,
      tone: "alert",
      href: "?abrir=secao-contatos",
    });
  }

  if (input.staleSchedules > 0) {
    points.push({
      id: "agenda",
      tag: "agenda vencida",
      title: `${input.staleSchedules} ${plural(input.staleSchedules, "agendamento", "agendamentos")} com data passada`,
      detail: "Ainda marcado como agendado. Registre se aconteceu.",
      tone: "alert",
      href: "?abrir=secao-etapas",
    });
  }

  if (input.emailDiverged) {
    points.push({
      id: "email",
      tag: "cadastro",
      title: "E-mail da 2ª fase difere do cadastro",
      detail: "Confirme qual endereço é o válido antes de enviar comunicação.",
      tone: "gold",
      href: "?abrir=secao-candidatura",
    });
  }

  for (const flag of input.activeFlags) {
    points.push({
      id: `flag-${flag}`,
      tag: "importação",
      title: flag,
      detail: "Sinalização detectada na importação da planilha.",
      tone: "alert",
      href: "?abrir=secao-candidatura",
    });
  }

  if (!input.hasWeights) {
    points.push({
      id: "pesos",
      tag: "metodologia",
      title: "Nenhuma configuração de pesos cadastrada",
      detail:
        "O consolidado está usando pesos iguais para todas as dimensões.",
      tone: "neutral",
      href: "/admin/pesos",
    });
  }

  return points;
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

function fmt(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

import type { Tone } from "./tone";

/**
 * Cor do status único.
 *
 * Semântica só onde há DESFECHO. Enquanto a candidatura está andando —
 * `novo`, `em_avaliacao`, `a_contatar`, `aula_teste_agendada` — a tag fica
 * neutra de propósito: no instante em que "aula-teste agendada" fica verde, a
 * lista ensina a ler progresso como aprovação.
 */
export function statusTone(status: string): Tone {
  switch (status) {
    case "selecionado":
    case "avancar":
      return "positive";
    case "em_duvida":
    case "manter_no_banco":
      return "gold";
    case "nao_avancar":
      return "alert";
    default:
      return "neutral";
  }
}

/** Status que encerram a decisão. A etapa operacional não os sobrepõe. */
export const FINAL_STATUSES = new Set([
  "avancar",
  "selecionado",
  "nao_avancar",
  "manter_no_banco",
  "em_duvida",
]);

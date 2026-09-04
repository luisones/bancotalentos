import { revalidatePath, updateTag } from "next/cache";
import {
  APPLICATION_LIST_TAG,
  SCORING_DATA_TAG,
} from "@/lib/queries/cached-data";

/**
 * Revalida as telas que mostram dados de candidato.
 *
 * `revalidatePath("/candidatos")` NÃO revalida `/candidatos/[id]` — é preciso
 * passar o padrão da rota (com o grupo) e o tipo "page".
 *
 * Tags do Data Cache:
 * - `scoring-data` — notas / pesos / overrides
 * - `application-list` — status, estrela, recado, CEP, cadastro
 */
export function revalidateCandidateViews(opts?: {
  /** Invalida o cache de pontuação (default: true). */
  scores?: boolean;
  /** Invalida a lista de candidaturas (default: false). */
  list?: boolean;
}) {
  const scores = opts?.scores !== false;
  const list = opts?.list === true;

  if (scores) updateTag(SCORING_DATA_TAG);
  if (list) updateTag(APPLICATION_LIST_TAG);

  revalidatePath("/(app)/candidatos/[id]", "page");
  revalidatePath("/(app)", "page");
}

/** CRM / cadastro: lista muda; notas não. */
export function revalidateCandidateListViews() {
  revalidateCandidateViews({ scores: false, list: true });
}

/** Avaliação / pesos: notas mudam. */
export function revalidateCandidateScoreViews() {
  revalidateCandidateViews({ scores: true, list: false });
}

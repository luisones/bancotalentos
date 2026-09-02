import { revalidatePath } from "next/cache";

/**
 * Revalida as telas que mostram dados de candidato.
 *
 * `revalidatePath("/candidatos")` NÃO revalida `/candidatos/[id]` — é preciso
 * passar o padrão da rota (com o grupo) e o tipo "page". Sem isso, salvar uma
 * avaliação não atualizava o perfil.
 */
export function revalidateCandidateViews() {
  revalidatePath("/(app)/candidatos/[id]", "page");
  revalidatePath("/(app)/ranking", "page");
  revalidatePath("/(app)", "page");
}

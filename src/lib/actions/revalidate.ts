import { revalidatePath } from "next/cache";

/**
 * Revalida as telas que mostram dados de candidato.
 *
 * `revalidatePath("/candidatos")` NÃO revalida `/candidatos/[id]` — é preciso
 * passar o padrão da rota (com o grupo) e o tipo "page". Sem isso, salvar uma
 * avaliação não atualizava o perfil.
 *
 * `/(app)` é o Painel, que hoje é a raiz. `/ranking` só redireciona e não tem
 * o que revalidar.
 */
export function revalidateCandidateViews() {
  revalidatePath("/(app)/candidatos/[id]", "page");
  revalidatePath("/(app)", "page");
}

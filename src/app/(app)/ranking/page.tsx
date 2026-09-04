import { redirect } from "next/navigation";

/**
 * O Ranking virou o Painel e passou a ser a tela de entrada.
 *
 * O redirecionamento preserva a query: links antigos, favoritos e o
 * `fromRanking=1` que o perfil usa para o anterior/próximo continuam
 * funcionando exatamente como antes.
 */
export default async function RankingRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) query.set(key, value);
  }
  redirect(query.size > 0 ? `/?${query}` : "/");
}

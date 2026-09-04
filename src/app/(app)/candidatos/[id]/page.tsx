import { notFound } from "next/navigation";
import { CandidateProfile } from "@/components/candidate/profile";
import { requireStaff } from "@/lib/auth/staff";
import { buildProfileViewModel } from "@/lib/candidate/view-model";
import { getCandidateDetail } from "@/lib/queries/candidate-detail";
import {
  getRankingNeighborIds,
  type RankingFilters,
} from "@/lib/queries/ranking";
import {
  getDisciplinePositions,
  getScoredApplications,
} from "@/lib/queries/scored-applications";
import { SORT_KEYS } from "@/lib/ranking-sort";

export default async function CandidateProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requireStaff();
  const { id } = await params;
  const query = await searchParams;
  const str = (k: string) =>
    typeof query[k] === "string" ? (query[k] as string) : undefined;

  const detail = await getCandidateDetail(id, staff.id);
  if (!detail) notFound();

  const focusedId =
    str("candidatura") ??
    detail.defaultApplicationId ??
    detail.applications[0]?.id;

  const sort = str("sort");
  const rankingFilters: RankingFilters = {
    campaign: str("campaign"),
    discipline: str("discipline"),
    search: str("search"),
    sort: sort && SORT_KEYS.includes(sort) ? sort : "score",
    order: str("order") === "asc" ? "asc" : "desc",
  };

  const rankingQuery = new URLSearchParams(
    Object.entries(rankingFilters).filter(([, v]) => Boolean(v)) as [
      string,
      string,
    ][],
  ).toString();

  // Uma passada só pontua o banco inteiro; posição na disciplina e vizinhos no
  // Painel saem dela sem nenhuma consulta a mais (`cache` do React deduplica).
  const [{ byApplicationId }, positions, neighbors] = await Promise.all([
    getScoredApplications(staff.id),
    focusedId
      ? getDisciplinePositions(focusedId, staff.id)
      : Promise.resolve({ campaign: null, bank: null }),
    query.fromRanking === "1"
      ? getRankingNeighborIds(id, rankingFilters, staff.id)
      : Promise.resolve({ prevId: null, nextId: null }),
  ]);

  // Toda derivação acontece no servidor: a página é útil antes de qualquer JS.
  const vm = buildProfileViewModel({
    detail,
    scored: focusedId ? byApplicationId.get(focusedId) : undefined,
    positions,
    staff,
    focusedApplicationId: focusedId,
  });

  return (
    <CandidateProfile
      vm={vm}
      neighbors={neighbors}
      rankingQuery={rankingQuery}
    />
  );
}

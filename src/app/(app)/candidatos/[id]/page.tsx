import { notFound } from "next/navigation";
import { CandidateProfile } from "@/components/candidate/profile";
import { requireStaff } from "@/lib/auth/staff";
import { buildProfileViewModel } from "@/lib/candidate/view-model";
import { getCandidateProfile } from "@/lib/queries/candidate";
import {
  getRankingNeighborIds,
  type RankingFilters,
} from "@/lib/queries/ranking";

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

  const profile = await getCandidateProfile(id, staff.id);
  if (!profile) notFound();

  const rankingFilters: RankingFilters = {
    campaign: str("campaign"),
    discipline: str("discipline"),
    search: str("search"),
    sort: str("sort") ?? "score",
    order: str("order") ?? "desc",
  };

  const rankingQuery = new URLSearchParams(
    Object.entries(rankingFilters).filter(([, v]) => v !== undefined) as [
      string,
      string,
    ][],
  ).toString();

  const neighbors =
    query.fromRanking === "1"
      ? await getRankingNeighborIds(id, rankingFilters, staff.id)
      : { prevId: null, nextId: null };

  // Toda derivação acontece no servidor: a página é útil antes de qualquer JS.
  const vm = buildProfileViewModel({
    profile,
    staff,
    focusedApplicationId: str("candidatura"),
    openSectionId: str("abrir"),
  });

  return (
    <CandidateProfile
      vm={vm}
      neighbors={neighbors}
      rankingQuery={rankingQuery}
    />
  );
}

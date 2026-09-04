import { PainelBoard } from "@/components/painel/painel-board";
import { canWrite, requireStaff } from "@/lib/auth/staff";
import { campaignToneMap } from "@/lib/campaign-color";
import {
  getAllRankingRows,
  getRankingFiltersData,
  type RankingFilters,
} from "@/lib/queries/ranking";
import { SORT_KEYS } from "@/lib/ranking-sort";
import type { Tone } from "@/lib/tone";

export default async function PainelPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requireStaff();
  const params = await searchParams;
  const str = (k: string) =>
    typeof params[k] === "string" ? (params[k] as string) : undefined;

  const sort = str("sort");
  const initialFilters: RankingFilters = {
    campaign: str("campaign"),
    discipline: str("discipline"),
    search: str("search"),
    sort: sort && SORT_KEYS.includes(sort) ? sort : "score",
    order: str("order") === "asc" ? "asc" : "desc",
  };

  // Banco inteiro uma vez; filtro/sort vivem no cliente.
  const [{ campaigns, disciplines }, rows] = await Promise.all([
    getRankingFiltersData(),
    getAllRankingRows(staff.id),
  ]);

  const tones = campaignToneMap(campaigns.map((c) => c.slug));
  const campaignTones: Record<string, Tone> = Object.fromEntries(tones);

  return (
    <PainelBoard
      rows={rows}
      campaigns={campaigns}
      disciplines={disciplines}
      campaignTones={campaignTones}
      initialFilters={initialFilters}
      canWrite={canWrite(staff)}
    />
  );
}

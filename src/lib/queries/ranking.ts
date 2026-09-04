import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaigns, disciplines } from "@/lib/db/schema";
import { formatCoverage } from "@/lib/scoring";
import {
  applyRankingFilters,
  type RankingFilters,
} from "@/lib/ranking-sort";
import {
  getScoredApplications,
  type ScoredApplication,
} from "./scored-applications";

export {
  applyRankingFilters,
  englishRank,
  SORT_KEYS,
  SORTERS,
  STATUS_ORDER,
  type RankingFilters,
} from "@/lib/ranking-sort";

export type RankingRow = ScoredApplication & {
  /** "3/4" — o consolidado nunca aparece sem ela. */
  coverageLabel: string;
};

/** Todas as candidaturas pontuadas, sem filtro — o Painel filtra no cliente. */
export async function getAllRankingRows(
  staffUserId: string,
): Promise<RankingRow[]> {
  const { rows } = await getScoredApplications(staffUserId);
  return rows.map((row) => ({
    ...row,
    coverageLabel: formatCoverage(row.coverage, row.totalDimensions),
  }));
}

export async function getRankingRows(
  filters: RankingFilters,
  staffUserId: string,
): Promise<RankingRow[]> {
  const rows = await getAllRankingRows(staffUserId);
  return applyRankingFilters(rows, filters);
}

export async function getRankingFiltersData() {
  const [allCampaigns, allDisciplines] = await Promise.all([
    db
      .select({ slug: campaigns.slug, name: campaigns.name })
      .from(campaigns)
      .orderBy(asc(campaigns.name)),
    db
      .select({ slug: disciplines.slug, name: disciplines.name })
      .from(disciplines)
      .orderBy(asc(disciplines.name)),
  ]);
  return { campaigns: allCampaigns, disciplines: allDisciplines };
}

export async function getRankingNeighborIds(
  candidateId: string,
  filters: RankingFilters,
  staffUserId: string,
): Promise<{ prevId: string | null; nextId: string | null }> {
  const rows = await getRankingRows(filters, staffUserId);
  const idx = rows.findIndex((r) => r.candidateId === candidateId);
  if (idx === -1) return { prevId: null, nextId: null };
  return {
    prevId: idx > 0 ? rows[idx - 1].candidateId : null,
    nextId: idx < rows.length - 1 ? rows[idx + 1].candidateId : null,
  };
}

import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaigns, disciplines } from "@/lib/db/schema";
import { formatCoverage } from "@/lib/scoring";
import { normalizeSearch, SORTERS, sortRows } from "@/lib/ranking-sort";
import {
  getScoredApplications,
  type ScoredApplication,
} from "./scored-applications";

export {
  englishRank,
  SORT_KEYS,
  SORTERS,
  STATUS_ORDER,
} from "@/lib/ranking-sort";

export type RankingFilters = {
  campaign?: string;
  discipline?: string;
  search?: string;
  sort?: string;
  order?: string;
};

export type RankingRow = ScoredApplication & {
  /** "3/4" — o consolidado nunca aparece sem ela. */
  coverageLabel: string;
};

export async function getRankingRows(
  filters: RankingFilters,
  staffUserId: string,
): Promise<RankingRow[]> {
  const { rows } = await getScoredApplications(staffUserId);

  const term = filters.search ? normalizeSearch(filters.search) : null;
  const filtered = rows.filter((row) => {
    if (filters.campaign && row.campaignSlug !== filters.campaign) return false;
    if (filters.discipline && row.disciplineSlug !== filters.discipline) {
      return false;
    }
    if (!term) return true;
    // Busca sem acento: "matematica" tem que achar "Matemática".
    const haystack = normalizeSearch(
      [row.candidateName, row.email ?? "", row.disciplineName ?? ""].join(" "),
    );
    return haystack.includes(term);
  });

  const withCoverage: RankingRow[] = filtered.map((row) => ({
    ...row,
    coverageLabel: formatCoverage(row.coverage, row.totalDimensions),
  }));

  const column = SORTERS[filters.sort ?? "score"] ?? SORTERS.score;
  const descending = (filters.order ?? "desc") !== "asc";

  return sortRows(withCoverage, column, descending);
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

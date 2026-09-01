import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  applications,
  campaigns,
  candidates,
  disciplines,
} from "@/lib/db/schema";
import { formatCoverage } from "@/lib/scoring";
import { buildDimensionScoresForApplication } from "./scoring-data";

export type RankingFilters = {
  campaign?: string;
  discipline?: string;
  search?: string;
  sort?: string;
  order?: string;
};

export type RankingRow = {
  applicationId: string;
  candidateId: string;
  candidateName: string;
  email: string | null;
  disciplineName: string | null;
  campaignName: string | null;
  selectiveStatus: string;
  consolidated: number | null;
  coverage: string;
  appliedAt: Date | null;
};

export async function getRankingRows(
  filters: RankingFilters,
  staffUserId: string,
): Promise<RankingRow[]> {
  const conditions = [];

  if (filters.campaign) {
    conditions.push(eq(campaigns.slug, filters.campaign));
  }
  if (filters.discipline) {
    conditions.push(eq(disciplines.slug, filters.discipline));
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(candidates.fullName, term),
        ilike(candidates.email, term),
        ilike(disciplines.name, term),
      )!,
    );
  }

  const rows = await db
    .select({
      applicationId: applications.id,
      candidateId: candidates.id,
      candidateName: candidates.fullName,
      email: candidates.email,
      disciplineName: disciplines.name,
      campaignName: campaigns.name,
      selectiveStatus: applications.selectiveStatus,
      appliedAt: applications.appliedAt,
    })
    .from(applications)
    .innerJoin(candidates, eq(candidates.id, applications.candidateId))
    .leftJoin(disciplines, eq(disciplines.id, applications.disciplineId))
    .leftJoin(campaigns, eq(campaigns.id, applications.campaignId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(applications.appliedAt));

  const withScores: RankingRow[] = [];
  for (const row of rows) {
    const result = await buildDimensionScoresForApplication(row.applicationId, {
      staffUserId,
    });
    withScores.push({
      ...row,
      consolidated: result.consolidated,
      coverage: formatCoverage(result.coverage, result.totalDimensions),
    });
  }

  const sort = filters.sort ?? "score";
  const order = filters.order ?? "desc";

  withScores.sort((a, b) => {
    let cmp = 0;
    if (sort === "name") {
      cmp = a.candidateName.localeCompare(b.candidateName, "pt-BR");
    } else if (sort === "date") {
      const da = a.appliedAt?.getTime() ?? 0;
      const db = b.appliedAt?.getTime() ?? 0;
      cmp = da - db;
    } else {
      const sa = a.consolidated ?? -1;
      const sb = b.consolidated ?? -1;
      cmp = sa - sb;
    }
    return order === "asc" ? cmp : -cmp;
  });

  return withScores;
}

export async function getRankingFiltersData() {
  const [allCampaigns, allDisciplines] = await Promise.all([
    db.select({ slug: campaigns.slug, name: campaigns.name }).from(campaigns),
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

import { NextResponse } from "next/server";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { getStaffUser } from "@/lib/auth/staff";
import { db } from "@/lib/db";
import {
  applications,
  campaigns,
  candidates,
  disciplines,
} from "@/lib/db/schema";

export type SearchResult = {
  id: string;
  name: string;
  sub: string;
  quickNote: string | null;
};

/**
 * Busca global.
 *
 * Route Handler, não server action: actions são POST e serializam, o que é
 * errado para busca a cada tecla.
 */
export async function GET(request: Request) {
  const staff = await getStaffUser();
  if (!staff) {
    return NextResponse.json({ results: [] }, { status: 401 });
  }

  const term = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (term.length < 2) {
    const [{ total } = { total: 0 }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(candidates);
    return NextResponse.json({ results: [], total });
  }

  const like = `%${term}%`;
  const rows = await db
    .select({
      id: candidates.id,
      name: candidates.fullName,
      quickNote: candidates.highlightedNote,
      city: candidates.city,
      disciplineName: disciplines.name,
      campaignName: campaigns.name,
    })
    .from(candidates)
    .leftJoin(applications, eq(applications.candidateId, candidates.id))
    .leftJoin(disciplines, eq(disciplines.id, applications.disciplineId))
    .leftJoin(campaigns, eq(campaigns.id, applications.campaignId))
    .where(
      and(
        or(
          ilike(candidates.fullName, like),
          ilike(candidates.email, like),
          ilike(candidates.externalRef, like),
        ),
      ),
    )
    .limit(40);

  // Um candidato com 3 candidaturas volta 3 vezes no join; a busca é de pessoa.
  const seen = new Set<string>();
  const results: SearchResult[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    results.push({
      id: row.id,
      name: row.name,
      sub: [row.disciplineName, row.campaignName ?? row.city]
        .filter(Boolean)
        .join(" · "),
      quickNote: row.quickNote,
    });
    if (results.length >= 20) break;
  }

  return NextResponse.json({ results, truncated: rows.length > results.length });
}

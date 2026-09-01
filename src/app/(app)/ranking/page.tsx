import Link from "next/link";
import { Suspense } from "react";
import { RankingFilters } from "@/components/ranking/ranking-filters";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth/staff";
import { selectiveStatusLabels, labelFor } from "@/lib/labels";
import {
  getRankingFiltersData,
  getRankingRows,
  type RankingFilters as RankingFiltersType,
} from "@/lib/queries/ranking";
import { formatScore } from "@/lib/scoring";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RankingPage({ searchParams }: PageProps) {
  const staff = await requireStaff();
  const params = await searchParams;
  const filters: RankingFiltersType = {
    campaign: typeof params.campaign === "string" ? params.campaign : undefined,
    discipline:
      typeof params.discipline === "string" ? params.discipline : undefined,
    search: typeof params.search === "string" ? params.search : undefined,
    sort: typeof params.sort === "string" ? params.sort : "score",
    order: typeof params.order === "string" ? params.order : "desc",
  };

  const [{ campaigns, disciplines }, rows] = await Promise.all([
    getRankingFiltersData(),
    getRankingRows(filters, staff.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--liceu-navy)]">
            Ranking
          </h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} candidatura{rows.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/comparar"
          className="text-sm font-medium text-[var(--liceu-navy)] hover:underline"
        >
          Comparar candidatos
        </Link>
      </div>

      <Suspense fallback={<Skeleton className="h-20 w-full" />}>
        <RankingFilters campaigns={campaigns} disciplines={disciplines} />
      </Suspense>

      <div className="liceu-card overflow-hidden">
        <table className="liceu-table w-full">
          <thead>
            <tr>
              <th>Candidato</th>
              <th>Disciplina</th>
              <th>Campanha</th>
              <th className="text-right">Nota</th>
              <th className="text-right">Cobertura</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  Nenhum candidato encontrado.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.applicationId}>
                  <td>
                    <Link
                      href={`/candidatos/${row.candidateId}?fromRanking=1&${new URLSearchParams(filters as Record<string, string>).toString()}`}
                      className="font-medium text-[var(--liceu-navy)] hover:underline"
                    >
                      {row.candidateName}
                    </Link>
                    {row.email && (
                      <p className="text-xs text-muted-foreground">{row.email}</p>
                    )}
                  </td>
                  <td>{row.disciplineName ?? "—"}</td>
                  <td>{row.campaignName ?? "—"}</td>
                  <td className="text-right tabular-nums font-medium">
                    {formatScore(row.consolidated)}
                  </td>
                  <td className="text-right tabular-nums text-muted-foreground">
                    {row.coverage}
                  </td>
                  <td>
                    <Badge variant="outline">
                      {labelFor(selectiveStatusLabels, row.selectiveStatus)}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

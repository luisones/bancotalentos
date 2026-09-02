import { Suspense } from "react";
import { Cell, DataGrid, DataGridRow } from "@/components/liceu/data-grid";
import { QuickNoteLine } from "@/components/liceu/quick-note";
import { ScoreWithCoverage } from "@/components/liceu/score-with-coverage";
import { EmptyState } from "@/components/liceu/states";
import { StateBadge } from "@/components/liceu/chip";
import { PageHeader } from "@/components/layout/page-header";
import { RankingFilters } from "@/components/ranking/ranking-filters";
import { Skeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth/staff";
import {
  labelFor,
  operationalStatusLabels,
  selectiveStatusLabels,
} from "@/lib/labels";
import {
  getRankingFiltersData,
  getRankingRows,
  type RankingFilters as Filters,
} from "@/lib/queries/ranking";
import type { Tone } from "@/lib/tone";

const COLUMNS = [
  { key: "cand", label: "Candidato", width: "minmax(240px,1fr)" },
  { key: "disc", label: "Disciplina", width: "minmax(140px,0.6fr)" },
  { key: "camp", label: "Campanha", width: "minmax(140px,0.6fr)" },
  { key: "score", label: "Resultado", width: "120px", align: "end" as const, numeric: true },
  { key: "etapa", label: "Etapa", width: "minmax(150px,0.5fr)" },
  { key: "sit", label: "Situação", width: "130px", align: "end" as const },
];

/** Semântica por desfecho. Etapa operacional NUNCA recebe cor semântica. */
function selectiveTone(status: string): Tone {
  if (status === "avancar" || status === "selecionado") return "positive";
  if (status === "em_duvida") return "gold";
  if (status === "nao_avancar" || status === "nao_selecionado") return "alert";
  return "navy";
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const staff = await requireStaff();
  const params = await searchParams;
  const str = (k: string) =>
    typeof params[k] === "string" ? (params[k] as string) : undefined;

  const filters: Filters = {
    campaign: str("campaign"),
    discipline: str("discipline"),
    search: str("search"),
    sort: str("sort") ?? "score",
    order: str("order") ?? "desc",
  };

  const [{ campaigns, disciplines }, rows] = await Promise.all([
    getRankingFiltersData(),
    getRankingRows(filters, staff.id),
  ]);

  const query = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => Boolean(v)) as [string, string][],
  );
  query.set("fromRanking", "1");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumb={[{ label: "Ranking" }]}
        title="Ranking de candidaturas"
        sub={`${rows.length} candidatura${rows.length === 1 ? "" : "s"} sob os filtros atuais`}
      />

      <Suspense fallback={<Skeleton className="h-[124px] w-full" />}>
        <RankingFilters campaigns={campaigns} disciplines={disciplines} />
      </Suspense>

      <div className="rounded-panel border border-rule-strong bg-card p-2 pt-3">
        <DataGrid
          columns={COLUMNS}
          empty={
            <EmptyState
              title="Nenhuma candidatura encontrada."
              hint="Nenhum registro atende aos filtros atuais. Remova um filtro para ampliar a busca."
            />
          }
        >
          {rows.length > 0
            ? rows.map((row) => (
                <DataGridRow
                  key={row.applicationId}
                  href={`/candidatos/${row.candidateId}?${query.toString()}`}
                  cells={[
                    <Cell key="cand">
                      <span className="text-row block font-semibold text-navy">
                        {row.candidateName}
                      </span>
                      {row.email && (
                        <span className="text-meta block truncate text-subtle">
                          {row.email}
                        </span>
                      )}
                      {/* A nota rápida vive aqui: é onde ela mais paga —
                          varrer a lista e ler o contexto sem abrir nada. */}
                      <QuickNoteLine note={row.quickNote} />
                    </Cell>,
                    <Cell key="disc" muted stackLabel="Disciplina">
                      {row.disciplineName ?? "—"}
                    </Cell>,
                    <Cell key="camp" muted stackLabel="Campanha">
                      {row.campaignName ?? "Sem campanha"}
                    </Cell>,
                    <Cell key="score" align="end" stackLabel="Resultado">
                      <ScoreWithCoverage
                        size="cell"
                        consolidated={row.consolidated}
                        coverage={row.coverageCount}
                        totalDimensions={row.totalDimensions}
                      />
                    </Cell>,
                    <Cell key="etapa" muted stackLabel="Etapa">
                      {labelFor(operationalStatusLabels, row.operationalStatus)}
                    </Cell>,
                    <Cell key="sit" align="end" stackLabel="Situação">
                      <StateBadge tone={selectiveTone(row.selectiveStatus)}>
                        {labelFor(selectiveStatusLabels, row.selectiveStatus)}
                      </StateBadge>
                    </Cell>,
                  ]}
                />
              ))
            : null}
        </DataGrid>
      </div>

      <p className="text-meta text-subtle">
        O resultado consolidado pondera apenas as dimensões presentes.{" "}
        <strong className="font-semibold">
          Dimensão ausente não conta como zero
        </strong>{" "}
        — por isso ele sempre vem acompanhado da cobertura.
      </p>
    </div>
  );
}

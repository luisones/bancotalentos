import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Cell, DataGrid, DataGridRow } from "@/components/liceu/data-grid";
import { QuickNoteLine } from "@/components/liceu/quick-note";
import { ScoreWithCoverage } from "@/components/liceu/score-with-coverage";
import { EmptyState } from "@/components/liceu/states";
import { StateBadge } from "@/components/liceu/chip";
import { PainelFilters } from "@/components/painel/painel-filters";
import { Skeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth/staff";
import { campaignToneMap, shortCampaignName } from "@/lib/campaign-color";
import { candidateStatusLabels, labelFor } from "@/lib/labels";
import {
  getRankingFiltersData,
  getRankingRows,
  type RankingFilters,
  type RankingRow,
} from "@/lib/queries/ranking";
import { SORT_KEYS } from "@/lib/ranking-sort";
import { formatScore } from "@/lib/scoring";
import { statusTone } from "@/lib/status";
import type { Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";

const COLUMNS = [
  { key: "cand", label: "Candidato", width: "minmax(196px,1.4fr)", sortKey: "name" },
  { key: "score", label: "Resultado", width: "104px", align: "end" as const, numeric: true, sortKey: "score" },
  { key: "at", label: "Aula-teste", width: "96px", align: "end" as const, numeric: true, sortKey: "aula_teste", hideOnStack: true },
  { key: "did", label: "Didática", width: "108px", align: "end" as const, numeric: true, sortKey: "didatica" },
  { key: "cont", label: "Conteúdo", width: "108px", align: "end" as const, numeric: true, sortKey: "conteudo" },
  { key: "vid", label: "Vídeo", width: "72px", align: "end" as const, numeric: true, sortKey: "video", hideOnStack: true },
  { key: "eng", label: "Inglês", width: "88px", sortKey: "ingles", hideOnStack: true },
  { key: "sa", label: "Santo André", width: "104px", align: "end" as const, numeric: true, sortKey: "santo_andre" },
  { key: "scs", label: "São Caetano", width: "104px", align: "end" as const, numeric: true, sortKey: "sao_caetano" },
  { key: "status", label: "Status", width: "124px", align: "end" as const, sortKey: "status" },
];

/** Um formatador só para as 1.400 distâncias da tabela. Ver `formatScore`. */
const kmFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

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
  const filters: RankingFilters = {
    campaign: str("campaign"),
    discipline: str("discipline"),
    search: str("search"),
    // Chave desconhecida na URL não pode derrubar a página nem ordenar por nada.
    sort: sort && SORT_KEYS.includes(sort) ? sort : "score",
    order: str("order") === "asc" ? "asc" : "desc",
  };

  const [{ campaigns, disciplines }, rows] = await Promise.all([
    getRankingFiltersData(),
    getRankingRows(filters, staff.id),
  ]);

  const campaignTones = campaignToneMap(campaigns.map((c) => c.slug));

  /**
   * Reescreve a URL trocando só o que mudou.
   *
   * A ordenação padrão fica FORA da query: sem isso, "Limpar filtros" produzia
   * `/?sort=score&order=desc`, que parece um filtro ativo e não é.
   */
  const hrefFor = (patch: Record<string, string | undefined>) => {
    const merged = { ...filters, ...patch };
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (!value) continue;
      if (key === "sort" && value === "score" && merged.order !== "asc") continue;
      if (key === "order" && merged.sort === "score" && value === "desc") continue;
      next.set(key, value);
    }
    return next.size > 0 ? `/?${next}` : "/";
  };

  // O contexto do Painel viaja com o link para o perfil, para o prev/próximo de
  // lá andar exatamente nesta lista.
  const rowQuery = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => Boolean(v)) as [string, string][],
  );
  rowQuery.set("fromRanking", "1");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        // Raiz do app: um breadcrumb "Painel" acima de um título "Painel" diz
        // a mesma coisa duas vezes e não leva a lugar nenhum.
        breadcrumb={[]}
        title="Painel"
        sub={`${rows.length} candidatura${rows.length === 1 ? "" : "s"} — clique no cabeçalho de qualquer coluna para reordenar`}
      />

      <Suspense fallback={<Skeleton className="h-[132px] w-full" />}>
        <PainelFilters
          campaigns={campaigns}
          disciplines={disciplines}
          campaignTones={campaignTones}
          active={filters}
          hrefFor={hrefFor}
        />
      </Suspense>

      <div className="rounded-panel border border-rule-strong bg-card p-2">
        <DataGrid
          columns={COLUMNS}
          stickyHeader
          sort={{
            key: filters.sort!,
            order: filters.order as "asc" | "desc",
            hrefFor: (key, order) => hrefFor({ sort: key, order }),
          }}
          empty={
            <EmptyState
              title="Nenhuma candidatura encontrada."
              hint="Nenhum registro atende aos filtros atuais. Remova um filtro para ampliar a busca."
            />
          }
        >
          {rows.length > 0
            ? rows.map((row) => (
                <PainelRow
                  key={row.applicationId}
                  row={row}
                  tone={campaignTones.get(row.campaignSlug ?? "") ?? "neutral"}
                  href={`/candidatos/${row.candidateId}?${rowQuery}`}
                />
              ))
            : null}
        </DataGrid>
      </div>

      <p className="text-meta text-subtle">
        O Resultado pondera Didática, Conteúdo, Aula-teste e Vídeo, e o número ao
        lado dele diz sobre quantos dos quatro ele foi calculado.{" "}
        <strong className="font-semibold">
          Dimensão ausente não conta como zero
        </strong>{" "}
        — e uma coluna vazia fica no fim da ordenação nas duas direções.
      </p>
    </div>
  );
}

function PainelRow({
  row,
  href,
  tone,
}: {
  row: RankingRow;
  href: string;
  tone: Tone;
}) {
  return (
    <DataGridRow
      href={href}
      cells={[
        <Cell key="cand">
          <div className="flex items-baseline gap-2">
            <span className="text-row min-w-0 truncate font-semibold text-navy">
              {row.candidateName}
            </span>
            {row.starred && (
              <span
                aria-label="Destaque da equipe"
                title="Destaque da equipe"
                className="shrink-0 text-gold-text"
              >
                ★
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-meta truncate text-subtle">
              {row.disciplineName ?? "Sem disciplina"}
            </span>
            <CampaignChip name={row.campaignName} tone={tone} />
          </div>
          <QuickNoteLine note={row.quickNote} />
        </Cell>,

        <Cell key="score" align="end" stackLabel="Resultado">
          <ScoreWithCoverage
            size="cell"
            consolidated={row.consolidated}
            coverage={row.coverage}
            totalDimensions={row.totalDimensions}
          />
        </Cell>,

        <Cell key="at" align="end" numeric hideOnStack>
          <Score value={row.scores.aula_teste ?? null} />
        </Cell>,

        <Cell key="did" align="end" stackLabel="Didática">
          <GroupScore
            value={row.scores.didatica ?? null}
            parts={[
              ["DO", row.scores.didatica_objetiva ?? null],
              ["DD", row.scores.didatica_dissertativa ?? null],
            ]}
          />
        </Cell>,

        <Cell key="cont" align="end" stackLabel="Conteúdo">
          <GroupScore
            value={row.scores.conteudo ?? null}
            parts={[
              ["CD", row.scores.conteudo_dissertativa ?? null],
              ["CO", row.scores.conteudo_objetiva ?? null],
            ]}
          />
        </Cell>,

        <Cell key="vid" align="end" numeric hideOnStack>
          <Score value={row.scores.video ?? null} />
        </Cell>,

        <Cell key="eng" hideOnStack>
          <EnglishLevel level={row.englishLevel} />
        </Cell>,

        <Cell key="sa" align="end" numeric stackLabel="Santo André">
          <Distance km={row.kmSantoAndre} mode={row.distanceMode} precision={row.distancePrecision} />
        </Cell>,

        <Cell key="scs" align="end" numeric stackLabel="São Caetano">
          <Distance km={row.kmSaoCaetano} mode={row.distanceMode} precision={row.distancePrecision} />
        </Cell>,

        <Cell key="status" align="end" stackLabel="Status">
          <StateBadge tone={statusTone(row.status)}>
            {labelFor(candidateStatusLabels, row.status)}
          </StateBadge>
        </Cell>,
      ]}
    />
  );
}

function CampaignChip({ name, tone }: { name: string | null; tone: Tone }) {
  if (!name) return null;
  return (
    <span
      className={cn(
        "text-micro rounded-chip border px-1.5 py-px font-semibold uppercase tracking-micro",
        {
          navy: "border-info-border bg-info-bg text-info",
          gold: "border-gold-border bg-gold-bg text-gold-text",
          neutral: "border-neutral-border bg-neutral-bg text-neutral-fg",
          alert: "border-alert-border bg-alert-bg text-alert",
          positive: "border-positive-border bg-positive-bg text-positive",
        }[tone],
      )}
    >
      {shortCampaignName(name)}
    </span>
  );
}

function Score({ value }: { value: number | null }) {
  return (
    <span
      className={cn(
        "text-row font-semibold",
        value === null ? "text-faint" : "text-ink",
      )}
    >
      {formatScore(value)}
    </span>
  );
}

/**
 * Média do grupo com as partes embaixo.
 *
 * As duas partes vão em colunas de largura fixa, e não separadas por um ponto
 * médio: com o ponto, "DO 8,2 · DD 8,0" e "DO 10,0 · DD 7,5" desalinhavam a
 * cada linha, e o `—` de uma parte ausente colava no separador ("CD —· CO").
 * Em grade, DO e DD ficam sempre na mesma posição e a coluna se lê para baixo.
 *
 * A média em cima é PONDERADA (em Conteúdo a dissertativa vale 2). É por isso
 * que ela pode não ser o meio dos dois números de baixo.
 */
function GroupScore({
  value,
  parts,
}: {
  value: number | null;
  parts: Array<[string, number | null]>;
}) {
  return (
    // `block`, e não `inline-flex`: um flex encolhido pela largura do número
    // fazia o `w-full` da grade de baixo valer ~30px, e as duas partes
    // colavam ("DO 8,2DD 8,0").
    <span className="block text-right">
      <span
        className={cn(
          "text-row block font-semibold",
          value === null ? "text-faint" : "text-ink",
        )}
      >
        {formatScore(value)}
      </span>
      <span className="text-micro inline-grid grid-cols-2 gap-x-2 tabular-nums">
        {parts.map(([label, part]) => (
          <span
            key={label}
            className={cn(
              "whitespace-nowrap text-right",
              part === null ? "text-faint" : "text-subtle",
            )}
          >
            {label} {formatScore(part)}
          </span>
        ))}
      </span>
    </span>
  );
}

const ENGLISH_STEPS = 3;

/** Três degraus preenchidos, para comparar níveis de relance na coluna. */
function EnglishLevel({ level }: { level: string | null }) {
  const rank = level ? { A: 1, B: 2, C: 3 }[level.trim().charAt(0).toUpperCase()] : undefined;
  if (!rank) return <span className="text-faint">—</span>;

  return (
    <span className="inline-flex items-center gap-1.5" title={level ?? undefined}>
      <span aria-hidden className="flex gap-0.5">
        {Array.from({ length: ENGLISH_STEPS }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-3 w-1 rounded-bar",
              i < rank ? "bg-navy" : "bg-ground",
            )}
          />
        ))}
      </span>
      <span className="text-meta text-ink-3">
        {level?.trim().slice(0, 5)}
      </span>
    </span>
  );
}

/**
 * Distância até a unidade.
 *
 * `≈` marca a que veio de aproximação — centroide de bairro ou de cidade, ou
 * linha reta porque o roteador não respondeu. Sem CEP é `—`, nunca 0 km.
 */
function Distance({
  km,
  mode,
  precision,
}: {
  km: number | null;
  mode: string | null;
  precision: string | null;
}) {
  if (km === null) {
    return (
      <span className="text-faint" title="Sem CEP cadastrado">
        —
      </span>
    );
  }

  const approximate = mode !== "rodoviaria" || precision !== "rua";
  const detail = [
    mode === "rodoviaria" ? "distância rodoviária" : "linha reta",
    precision === "rua"
      ? "a partir do logradouro do CEP"
      : `a partir do centro do ${precision === "bairro" ? "bairro" : "município"}`,
  ].join(", ");

  return (
    <span className="text-cell text-ink" title={detail}>
      {approximate && <span className="text-subtle">≈ </span>}
      {kmFormat.format(km)} km
    </span>
  );
}

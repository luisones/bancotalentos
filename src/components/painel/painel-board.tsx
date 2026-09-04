"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Cell, DataGrid, DataGridRow } from "@/components/liceu/data-grid";
import { QuickNoteLine } from "@/components/liceu/quick-note";
import { ScoreWithCoverage } from "@/components/liceu/score-with-coverage";
import { EmptyState } from "@/components/liceu/states";
import { StateBadge } from "@/components/liceu/chip";
import { shortCampaignName } from "@/lib/campaign-color";
import { candidateStatusLabels, labelFor } from "@/lib/labels";
import type { RankingRow } from "@/lib/queries/ranking";
import {
  applyRankingFilters,
  painelHref,
  SORT_KEYS,
  type RankingFilters,
} from "@/lib/ranking-sort";
import { formatScore } from "@/lib/scoring";
import { statusTone } from "@/lib/status";
import type { Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import {
  PainelFilters,
  type FilterOption,
} from "./painel-filters";

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

function filtersFromSearch(search: string): RankingFilters {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const sort = params.get("sort") ?? undefined;
  return {
    campaign: params.get("campaign") ?? undefined,
    discipline: params.get("discipline") ?? undefined,
    search: params.get("search") ?? undefined,
    sort: sort && SORT_KEYS.includes(sort) ? sort : "score",
    order: params.get("order") === "asc" ? "asc" : "desc",
  };
}

/**
 * Island do Painel: recebe o banco pontuado UMA vez e filtra/ordena no
 * cliente. A URL acompanha via `history.pushState` — compartilhável, sem RSC.
 */
export function PainelBoard({
  rows: rawRows,
  campaigns,
  disciplines,
  campaignTones,
  initialFilters,
}: {
  rows: RankingRow[];
  campaigns: FilterOption[];
  disciplines: FilterOption[];
  campaignTones: Record<string, Tone>;
  initialFilters: RankingFilters;
}) {
  // Dates vêm serializadas do RSC; a ordenação por data precisa de getTime().
  const rows = useMemo(
    () =>
      rawRows.map((row) => ({
        ...row,
        appliedAt:
          row.appliedAt == null
            ? null
            : row.appliedAt instanceof Date
              ? row.appliedAt
              : new Date(row.appliedAt),
      })),
    [rawRows],
  );

  const [filters, setFilters] = useState<RankingFilters>(() => ({
    campaign: initialFilters.campaign,
    discipline: initialFilters.discipline,
    search: initialFilters.search,
    sort:
      initialFilters.sort && SORT_KEYS.includes(initialFilters.sort)
        ? initialFilters.sort
        : "score",
    order: initialFilters.order === "asc" ? "asc" : "desc",
  }));

  useEffect(() => {
    function onPopState() {
      setFilters(filtersFromSearch(window.location.search));
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const syncUrl = useCallback((next: RankingFilters) => {
    window.history.pushState(null, "", painelHref(next));
  }, []);

  const patchFilters = useCallback(
    (patch: Partial<RankingFilters>) => {
      setFilters((prev) => {
        const next: RankingFilters = { ...prev };
        for (const key of Object.keys(patch) as Array<keyof RankingFilters>) {
          const value = patch[key];
          if (value === undefined || value === "") delete next[key];
          else next[key] = value;
        }
        if (!next.sort) next.sort = "score";
        if (!next.order) next.order = "desc";
        syncUrl(next);
        return next;
      });
    },
    [syncUrl],
  );

  const visible = useMemo(
    () => applyRankingFilters(rows, filters),
    [rows, filters],
  );

  const rowQuery = useMemo(() => {
    const q = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => Boolean(v)) as [
        string,
        string,
      ][],
    );
    q.set("fromRanking", "1");
    return q.toString();
  }, [filters]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumb={[]}
        title="Painel"
        sub={`${visible.length} candidatura${visible.length === 1 ? "" : "s"} — clique no cabeçalho de qualquer coluna para reordenar`}
      />

      <PainelFilters
        campaigns={campaigns}
        disciplines={disciplines}
        campaignTones={campaignTones}
        active={filters}
        onChange={patchFilters}
      />

      <div className="rounded-panel border border-rule-strong bg-card p-2">
        <DataGrid
          columns={COLUMNS}
          stickyHeader
          sort={{
            key: filters.sort ?? "score",
            order: (filters.order as "asc" | "desc") ?? "desc",
            onSort: (key, order) => patchFilters({ sort: key, order }),
          }}
          empty={
            <EmptyState
              title="Nenhuma candidatura encontrada."
              hint="Nenhum registro atende aos filtros atuais. Remova um filtro para ampliar a busca."
            />
          }
        >
          {visible.length > 0
            ? visible.map((row) => (
                <PainelRow
                  key={row.applicationId}
                  row={row}
                  tone={campaignTones[row.campaignSlug ?? ""] ?? "neutral"}
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
          <Distance
            km={row.kmSantoAndre}
            mode={row.distanceMode}
            precision={row.distancePrecision}
          />
        </Cell>,

        <Cell key="scs" align="end" numeric stackLabel="São Caetano">
          <Distance
            km={row.kmSaoCaetano}
            mode={row.distanceMode}
            precision={row.distancePrecision}
          />
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

function GroupScore({
  value,
  parts,
}: {
  value: number | null;
  parts: Array<[string, number | null]>;
}) {
  return (
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

function EnglishLevel({ level }: { level: string | null }) {
  const rank = level
    ? { A: 1, B: 2, C: 3 }[level.trim().charAt(0).toUpperCase()]
    : undefined;
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
      <span className="text-meta text-ink-3">{level?.trim().slice(0, 5)}</span>
    </span>
  );
}

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

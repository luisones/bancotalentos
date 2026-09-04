"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Cell, DataGrid, DataGridRow } from "@/components/liceu/data-grid";
import { ScoreWithCoverage } from "@/components/liceu/score-with-coverage";
import { EmptyState } from "@/components/liceu/states";
import { shortCampaignName } from "@/lib/campaign-color";
import type { RankingRow } from "@/lib/queries/ranking";
import {
  applyRankingFilters,
  painelHref,
  parseRankingFilters,
  rankingSearchParams,
  type RankingFilters,
} from "@/lib/ranking-sort";
import { formatScore } from "@/lib/scoring";
import type { Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import {
  CurriculoCell,
  DidaticaCell,
  DistanceCell,
  GroupScoreValue,
  LessonTestCell,
  QuickNoteCell,
  QuickNoteLineButton,
  ScoreValue,
  StatusCell,
  VideoCell,
} from "./painel-cells";
import { PainelFilters, type FilterOption } from "./painel-filters";

/*
  Colunas justas ao conteúdo, alinhadas ao centro. A nota rápida vem logo
  depois do Resultado — é o comentário da equipe sobre aquele número. O
  minWidth (~1.080px) é o piso do scroll horizontal no painel, não um
  alvo de tela cheia.
*/
const COLUMNS = [
  { key: "cand", label: "Candidato", width: "minmax(168px,1.15fr)", sortKey: "name" },
  { key: "score", label: "Resultado", width: "72px", align: "center" as const, numeric: true, sortKey: "score" },
  { key: "note", label: "Nota", width: "36px", align: "center" as const },
  { key: "at", label: "Aula-teste", width: "72px", align: "center" as const, numeric: true, sortKey: "aula_teste" },
  { key: "did", label: "Didática", width: "88px", align: "center" as const, numeric: true, sortKey: "didatica" },
  { key: "cont", label: "Conteúdo", width: "88px", align: "center" as const, numeric: true, sortKey: "conteudo" },
  { key: "vid", label: "Vídeo", width: "64px", align: "center" as const, numeric: true, sortKey: "video" },
  { key: "cv", label: "Currículo", width: "64px", align: "center" as const },
  { key: "eng", label: "Inglês", width: "44px", align: "center" as const, sortKey: "ingles" },
  {
    key: "sa",
    label: "S. André",
    title: "Santo André",
    width: "64px",
    align: "center" as const,
    numeric: true,
    sortKey: "santo_andre",
  },
  {
    key: "scs",
    label: "S. Caetano",
    title: "São Caetano",
    width: "72px",
    align: "center" as const,
    numeric: true,
    sortKey: "sao_caetano",
  },
  { key: "status", label: "Status", width: "7.5rem", align: "center" as const, sortKey: "status" },
];

/**
 * Island do Painel: recebe o banco pontuado UMA vez e filtra/ordena no
 * cliente. A URL acompanha via `history.pushState` — compartilhável, sem RSC.
 *
 * Status e nota rápida são escritos AQUI e aplicados por cima das linhas antes
 * de filtrar: o valor gravado é exatamente o que se escolheu, então dá para
 * mostrá-lo na hora e deixar a ordenação por Status acompanhar sem recarregar.
 *
 * Nota de dimensão é outra história. Aula-teste e vídeo agregam entre
 * avaliadores no servidor, e o cliente não tem como calcular o número novo —
 * chutá-lo mostraria a nota de uma pessoa onde deveria estar a média. Por isso
 * ali é `router.refresh()`: uma volta ao servidor, só quando alguém de fato
 * lança nota, em troca de nunca exibir um número inventado.
 */
export function PainelBoard({
  rows: rawRows,
  campaigns,
  disciplines,
  campaignTones,
  initialFilters,
  canWrite,
}: {
  rows: RankingRow[];
  campaigns: FilterOption[];
  disciplines: FilterOption[];
  campaignTones: Record<string, Tone>;
  initialFilters: RankingFilters;
  canWrite: boolean;
}) {
  const router = useRouter();

  // Dates vêm serializadas do RSC; a ordenação por data precisa de getTime().
  const baseRows = useMemo(
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

  /**
   * O que foi escrito nesta aba, por cima do que o servidor mandou.
   *
   * `source` guarda o payload que gerou o overlay. Quando o servidor manda um
   * payload novo — outra aba gravou, ou o `router.refresh()` de uma nota
   * voltou — o overlay é descartado no próprio render. Ajustar estado durante o
   * render é como o React recomenda reagir a mudança de prop; num efeito, isto
   * seria uma segunda passada de renderização a cada payload.
   *
   * O descarte é por IDENTIDADE do payload, sem saber qual é mais novo: qual
   * escrita, qual leitura. Isso tem um custo conhecido — trocar um status
   * enquanto um `router.refresh()` de outra linha está em vôo faz o badge
   * voltar ao valor antigo por um instante, até a revalidação da própria
   * escrita chegar.
   *
   * A alternativa seria manter o overlay até o servidor concordar com ele. Foi
   * recusada: aí a nossa escrita ficaria na tela mesmo depois de um colega
   * trocar aquele status, e este projeto prefere piscar a mostrar um valor que
   * o servidor já superou.
   */
  const [overlay, setOverlay] = useState<{
    source: RankingRow[];
    status: Record<string, string>;
    quickNote: Record<string, string | null>;
  }>(() => ({ source: rawRows, status: {}, quickNote: {} }));

  if (overlay.source !== rawRows) {
    setOverlay({ source: rawRows, status: {}, quickNote: {} });
  }

  const rows = useMemo(
    () =>
      baseRows.map((row) => {
        const status = overlay.status[row.applicationId];
        const quickNote = overlay.quickNote[row.candidateId];
        if (status === undefined && quickNote === undefined) return row;
        return {
          ...row,
          ...(status === undefined ? {} : { status }),
          ...(quickNote === undefined ? {} : { quickNote }),
        };
      }),
    [baseRows, overlay],
  );

  const [filters, setFilters] = useState<RankingFilters>(initialFilters);

  useEffect(() => {
    function onPopState() {
      setFilters(parseRankingFilters(window.location.search));
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  /**
   * A URL acompanha os filtros — num efeito, não dentro do updater.
   *
   * O `pushState` ficava dentro do `setFilters(prev => …)`, ou seja, rodava
   * DURANTE o render, e o Router do Next reage a ele atualizando o próprio
   * estado: "Cannot update a component (Router) while rendering a different
   * component (PainelBoard)" a cada clique de filtro.
   *
   * A comparação com a URL atual é o que evita empilhar histórico à toa: na
   * montagem os filtros vêm da própria URL, e no `popstate` também — nos dois
   * casos o href calculado é igual ao que já está na barra.
   */
  useEffect(() => {
    const href = painelHref(filters);
    if (href !== `${window.location.pathname}${window.location.search}`) {
      window.history.pushState(null, "", href);
    }
  }, [filters]);

  const patchFilters = useCallback((patch: Partial<RankingFilters>) => {
    setFilters((prev) => {
      const next: RankingFilters = { ...prev, ...patch };
      for (const key of Object.keys(patch) as Array<keyof RankingFilters>) {
        const value = next[key];
        if (
          value === undefined ||
          value === "" ||
          (Array.isArray(value) && value.length === 0)
        ) {
          delete next[key];
        }
      }
      if (!next.sort) next.sort = "score";
      if (!next.order) next.order = "desc";
      return next;
    });
  }, []);

  const visible = useMemo(
    () => applyRankingFilters(rows, filters),
    [rows, filters],
  );

  const rowQuery = useMemo(() => {
    const q = rankingSearchParams(filters);
    q.set("fromRanking", "1");
    return q.toString();
  }, [filters]);

  const onScoreSaved = useCallback(() => router.refresh(), [router]);

  return (
    <div className="flex flex-col gap-3 md:h-[calc(100dvh-var(--spacing-header)-7.5rem)]">
      <PageHeader
        className="shrink-0 py-3"
        breadcrumb={[]}
        title="Painel"
        sub={`${visible.length} candidatura${visible.length === 1 ? "" : "s"} — clique no cabeçalho de qualquer coluna para reordenar`}
      />

      <div className="shrink-0">
        <PainelFilters
          campaigns={campaigns}
          disciplines={disciplines}
          campaignTones={campaignTones}
          active={filters}
          onChange={patchFilters}
        />
      </div>

      <div className="min-h-0 min-w-0 flex-1 max-md:flex-none">
        <div className="flex h-full min-h-0 min-w-0 flex-col rounded-panel border border-rule-strong bg-card p-2 max-md:h-auto">
          <DataGrid
            columns={COLUMNS}
            minWidth={1080}
            compact
            stickyHeader="pane"
            className="min-h-0 flex-1"
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
                  canWrite={canWrite}
                  onStatusChanged={(status) =>
                    setOverlay((prev) => ({
                      ...prev,
                      status: { ...prev.status, [row.applicationId]: status },
                    }))
                  }
                  onQuickNoteChanged={(note) =>
                    setOverlay((prev) => ({
                      ...prev,
                      quickNote: { ...prev.quickNote, [row.candidateId]: note },
                    }))
                  }
                  onScoreSaved={onScoreSaved}
                />
              ))
            : null}
        </DataGrid>
        </div>
      </div>

      <p className="text-meta shrink-0 text-subtle">
        O Resultado pondera Didática, Conteúdo, Aula-teste e Vídeo, e o número ao
        lado dele diz sobre quantos dos quatro ele foi calculado — dimensão
        ausente não conta como zero.
      </p>
    </div>
  );
}

type RowHandlers = {
  canWrite: boolean;
  onStatusChanged: (status: string) => void;
  onQuickNoteChanged: (note: string | null) => void;
  onScoreSaved: () => void;
};

/**
 * Uma linha.
 *
 * A linha INTEIRA deixou de ser um link. Com seis células que abrem um painel
 * próprio, envolver tudo num <a> punha botão dentro de link — HTML inválido — e
 * o Radix perdia o foco ao fechar um popover ancorado num elemento que o
 * navegador quer navegar. O perfil continua a um clique: abre pelo nome e pelas
 * células que não têm nada a resolver na lista (Resultado, Conteúdo, Inglês).
 */
function PainelRow({
  row,
  href,
  tone,
  canWrite,
  onStatusChanged,
  onQuickNoteChanged,
  onScoreSaved,
}: {
  row: RankingRow;
  href: string;
  tone: Tone;
} & RowHandlers) {
  const didaticaParts: Array<[string, number | null]> = [
    ["didatica_objetiva", row.scores.didatica_objetiva ?? null],
    ["didatica_dissertativa", row.scores.didatica_dissertativa ?? null],
  ];
  const conteudoParts: Array<[string, number | null]> = [
    ["conteudo_dissertativa", row.scores.conteudo_dissertativa ?? null],
    ["conteudo_objetiva", row.scores.conteudo_objetiva ?? null],
  ];

  const status = (
    <StatusCell
      applicationId={row.applicationId}
      candidateId={row.candidateId}
      status={row.status}
      canWrite={canWrite}
      onChanged={onStatusChanged}
    />
  );

  const lessonTest = (
    <LessonTestCell
      applicationId={row.applicationId}
      candidateName={row.candidateName}
      score={row.scores.aula_teste ?? null}
      canWrite={canWrite}
      onScoreSaved={onScoreSaved}
    />
  );

  const video = (
    <VideoCell
      applicationId={row.applicationId}
      score={row.scores.video ?? null}
      hasVideo={row.hasVideo}
      canWrite={canWrite}
      onScoreSaved={onScoreSaved}
    />
  );

  const quickNoteEditor = (
    <QuickNoteCell
      candidateId={row.candidateId}
      note={row.quickNote}
      canWrite={canWrite}
      onChanged={onQuickNoteChanged}
    />
  );

  return (
    <DataGridRow
      className="group hover:bg-row-hover"
      stacked={
        <StackedRecord
          row={row}
          href={href}
          tone={tone}
          status={status}
          lessonTest={lessonTest}
          video={video}
          quickNoteEditor={quickNoteEditor}
          didaticaParts={didaticaParts}
          conteudoParts={conteudoParts}
        />
      }
      cells={[
        <Cell key="cand">
          <div className="flex items-baseline gap-2">
            <Link
              href={href}
              className="text-row min-w-0 truncate font-semibold text-navy hover:text-gold-text hover:underline"
            >
              {row.candidateName}
            </Link>
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
            {/* A disciplina completa, mesmo quando o filtro é o grupo: quem
                lê a linha precisa saber se é Literatura ou Produção de Texto. */}
            <span className="text-meta truncate text-subtle">
              {row.disciplineName ?? "Sem disciplina"}
            </span>
            <CampaignChip name={row.campaignName} tone={tone} />
          </div>
          <QuickNoteLineButton note={row.quickNote} />
        </Cell>,

        <Cell key="score" align="center">
          <Link href={href} className="hover:underline">
            <ScoreWithCoverage
              size="cell"
              consolidated={row.consolidated}
              coverage={row.coverage}
              totalDimensions={row.totalDimensions}
            />
          </Link>
        </Cell>,

        <Cell key="note" align="center" interactive>
          {quickNoteEditor}
        </Cell>,

        <Cell key="at" align="center" numeric interactive>
          {lessonTest}
        </Cell>,

        <Cell key="did" align="center" numeric interactive>
          <DidaticaCell
            applicationId={row.applicationId}
            candidateId={row.candidateId}
            score={row.scores.didatica ?? null}
            parts={didaticaParts}
            canWrite={canWrite}
            onScoreSaved={onScoreSaved}
          />
        </Cell>,

        <Cell key="cont" align="center" numeric>
          <Link href={href}>
            <GroupScoreValue
              value={row.scores.conteudo ?? null}
              parts={conteudoParts}
            />
          </Link>
        </Cell>,

        <Cell key="vid" align="center" numeric interactive>
          {video}
        </Cell>,

        <Cell key="cv" align="center" interactive>
          <CurriculoCell
            applicationId={row.applicationId}
            hasCurriculo={row.hasCurriculo}
          />
        </Cell>,

        <Cell key="eng" align="center">
          <Link href={href}>
            <EnglishLevel level={row.englishLevel} />
          </Link>
        </Cell>,

        <Cell key="sa" align="center" numeric interactive>
          <DistanceCell
            km={row.kmSantoAndre}
            lat={row.lat}
            lng={row.lng}
            kmSantoAndre={row.kmSantoAndre}
            kmSaoCaetano={row.kmSaoCaetano}
            mode={row.distanceMode}
            precision={row.distancePrecision}
          />
        </Cell>,

        <Cell key="scs" align="center" numeric interactive>
          <DistanceCell
            km={row.kmSaoCaetano}
            lat={row.lat}
            lng={row.lng}
            kmSantoAndre={row.kmSantoAndre}
            kmSaoCaetano={row.kmSaoCaetano}
            mode={row.distanceMode}
            precision={row.distancePrecision}
          />
        </Cell>,

        <Cell key="status" align="center" interactive>
          {status}
        </Cell>,
      ]}
    />
  );
}

/**
 * O registro no celular.
 *
 * O empilhamento automático punha as doze células numa coluna, cada uma com
 * "RÓTULO valor" e metade da largura vazia: doze linhas para dizer o que cabe
 * em quatro. Aqui a nota vira uma tira horizontal — que é como um número curto
 * quer ser lido — e as duas distâncias dividem uma linha.
 */
function StackedRecord({
  row,
  href,
  tone,
  status,
  lessonTest,
  video,
  quickNoteEditor,
  didaticaParts,
  conteudoParts,
}: {
  row: RankingRow;
  href: string;
  tone: Tone;
  status: React.ReactNode;
  lessonTest: React.ReactNode;
  video: React.ReactNode;
  quickNoteEditor: React.ReactNode;
  didaticaParts: Array<[string, number | null]>;
  conteudoParts: Array<[string, number | null]>;
}) {
  return (
    <div className="flex flex-col gap-1.5 py-0.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <Link
              href={href}
              className="text-row min-w-0 truncate font-semibold text-navy"
            >
              {row.candidateName}
            </Link>
            {row.starred && (
              <span
                aria-label="Destaque da equipe"
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
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {status}
          {quickNoteEditor}
        </div>
      </div>

      <QuickNoteLineButton note={row.quickNote} />

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-rule-weak pt-1.5">
        <Link href={href} className="flex items-baseline gap-1">
          <span className="text-micro uppercase tracking-micro text-label">
            Res
          </span>
          <ScoreWithCoverage
            size="cell"
            consolidated={row.consolidated}
            coverage={row.coverage}
            totalDimensions={row.totalDimensions}
          />
        </Link>
        <StackedScore label="AT">{lessonTest}</StackedScore>
        <StackedScore label="Did">
          <ScoreValue value={row.scores.didatica ?? null} />
        </StackedScore>
        <StackedScore label="Cont">
          <ScoreValue value={row.scores.conteudo ?? null} />
        </StackedScore>
        <StackedScore label="Víd">{video}</StackedScore>
        <StackedScore label="CV">
          <CurriculoCell
            applicationId={row.applicationId}
            hasCurriculo={row.hasCurriculo}
          />
        </StackedScore>
      </div>

      {/* As partes só no celular quando existem: repetir "Obj. — Dis. —" em
          quem não fez nada nenhuma delas é linha gasta. */}
      {(row.scores.didatica != null || row.scores.conteudo != null) && (
        <p className="text-micro flex flex-wrap gap-x-3 text-subtle tabular-nums">
          {[...didaticaParts, ...conteudoParts]
            .filter(([, value]) => value !== null)
            .map(([code, value]) => (
              <span key={code}>
                {code.startsWith("didatica") ? "Did" : "Cont"}{" "}
                {code.endsWith("objetiva") ? "obj." : "dis."}{" "}
                <strong className="font-semibold text-ink-3">
                  {formatScore(value)}
                </strong>
              </span>
            ))}
        </p>
      )}

      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <StackedFact label="Sto. André">
          <DistanceCell
            km={row.kmSantoAndre}
            lat={row.lat}
            lng={row.lng}
            kmSantoAndre={row.kmSantoAndre}
            kmSaoCaetano={row.kmSaoCaetano}
            mode={row.distanceMode}
            precision={row.distancePrecision}
          />
        </StackedFact>
        <StackedFact label="S. Caetano">
          <DistanceCell
            km={row.kmSaoCaetano}
            lat={row.lat}
            lng={row.lng}
            kmSantoAndre={row.kmSantoAndre}
            kmSaoCaetano={row.kmSaoCaetano}
            mode={row.distanceMode}
            precision={row.distancePrecision}
          />
        </StackedFact>
        {row.englishLevel && (
          <StackedFact label="Inglês">
            <EnglishLevel level={row.englishLevel} />
          </StackedFact>
        )}
      </div>
    </div>
  );
}

function StackedScore({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-micro uppercase tracking-micro text-label">
        {label}
      </span>
      {children}
    </span>
  );
}

function StackedFact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-micro uppercase tracking-micro text-label">
        {label}
      </span>
      {children}
    </span>
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

const ENGLISH_STEPS = 3;

function EnglishLevel({ level }: { level: string | null }) {
  const rank = level
    ? { A: 1, B: 2, C: 3 }[level.trim().charAt(0).toUpperCase()]
    : undefined;
  if (!rank) return <span className="text-faint">—</span>;

  return (
    <span
      className="inline-flex items-center"
      title={level ?? undefined}
      aria-label={`Inglês ${level}`}
    >
      <span aria-hidden className="flex gap-0.5">
        {Array.from({ length: ENGLISH_STEPS }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-3.5 w-1 rounded-bar",
              i < rank ? "bg-navy" : "bg-rule-strong",
            )}
          />
        ))}
      </span>
    </span>
  );
}

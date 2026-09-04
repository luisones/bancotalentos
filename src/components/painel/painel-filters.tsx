"use client";

import { MicroHeader } from "@/components/liceu/surface";
import { shortCampaignName } from "@/lib/campaign-color";
import { disciplineAbbr } from "@/lib/discipline-abbr";
import {
  disciplineFilterOptions,
  disciplineGroupSlug,
} from "@/lib/discipline-group";
import {
  DISTANCE_MAX_KM,
  toggleIncluded,
  type DistanceUnit,
  type EnglishLetter,
  type HasScoreKey,
  type RankingFilters,
} from "@/lib/ranking-sort";
import { toneTinted, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { SearchField } from "./search-field";

export type FilterOption = { slug: string; name: string };

const HAS_SCORE_OPTIONS: { key: HasScoreKey; label: string }[] = [
  { key: "didatica", label: "Didática" },
  { key: "conteudo", label: "Conteúdo" },
  { key: "aula_teste", label: "Aula-teste" },
  { key: "video", label: "Vídeo" },
];

const ENGLISH_OPTIONS: {
  key: EnglishLetter;
  label: string;
  title: string;
}[] = [
  { key: "A", label: "A1–A2", title: "A1–A2 (básico)" },
  { key: "B", label: "B1–B2", title: "B1–B2 (intermediário)" },
  { key: "C", label: "C1–C2", title: "C1–C2 (avançado/fluente)" },
];

const DISTANCE_UNIT_OPTIONS: {
  key: DistanceUnit;
  label: string;
  title: string;
}[] = [
  { key: "santo_andre", label: "S. André", title: "Santo André" },
  { key: "sao_caetano", label: "S. Caetano", title: "São Caetano" },
];

/**
 * Filtros de um clique — estado local no Painel (sem RSC / Neon).
 *
 * Antes eram links que trocavam a URL e re-pontuavam o banco. Agora `onChange`
 * atualiza o island; a URL acompanha via pushState.
 */
export function PainelFilters({
  campaigns,
  disciplines,
  campaignTones,
  active,
  onChange,
}: {
  campaigns: FilterOption[];
  disciplines: FilterOption[];
  campaignTones: Record<string, Tone>;
  active: RankingFilters;
  onChange: (patch: Partial<RankingFilters>) => void;
}) {
  const hasFilters = Boolean(
    active.campaign ||
      active.discipline ||
      active.search ||
      active.has?.length ||
      active.ingles?.length ||
      (active.unit && active.maxKm),
  );

  return (
    <div className="rounded-panel border border-rule-strong bg-card px-4 py-3">
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2.5">
          <FilterRow label="Campanha">
            <Pill
              active={!active.campaign}
              onClick={() => onChange({ campaign: undefined })}
            >
              Todas
            </Pill>
            {campaigns.map((c) => (
              <Pill
                key={c.slug}
                active={active.campaign === c.slug}
                tone={campaignTones[c.slug]}
                onClick={() => onChange({ campaign: c.slug })}
              >
                {shortCampaignName(c.name)}
              </Pill>
            ))}
          </FilterRow>

          <div className="flex items-center gap-3">
            {hasFilters && (
              <button
                type="button"
                onClick={() =>
                  onChange({
                    campaign: undefined,
                    discipline: undefined,
                    search: undefined,
                    has: undefined,
                    ingles: undefined,
                    unit: undefined,
                    maxKm: undefined,
                  })
                }
                className="text-note whitespace-nowrap font-semibold text-gold-text hover:underline"
              >
                Limpar filtros
              </button>
            )}
            <SearchField
              value={active.search ?? ""}
              onChange={(search) =>
                onChange({ search: search || undefined })
              }
            />
          </div>
        </div>

        <FilterRow label="Disciplina">
          <Pill
            active={!active.discipline}
            onClick={() => onChange({ discipline: undefined })}
          >
            Todas
          </Pill>
          {/* As duas variantes de Português entram como uma pílula só: quem
              filtra por área quer os 91 candidatos, não 63 de um lado e 28 do
              outro. O nome completo continua na linha de cada candidato. */}
          {disciplineFilterOptions(disciplines).map((d) => (
            <Pill
              key={d.slug}
              // Comparação por grupo: um link antigo com
              // `discipline=portugues-literatura` acende a pílula "Português"
              // em vez de nenhuma.
              active={
                disciplineGroupSlug(active.discipline ?? null) === d.slug
              }
              title={d.name}
              onClick={() => onChange({ discipline: d.slug })}
            >
              {disciplineAbbr(d.slug, d.name)}
            </Pill>
          ))}
        </FilterRow>

        <FilterRow label="Com nota">
          {HAS_SCORE_OPTIONS.map((item) => (
            <Pill
              key={item.key}
              active={Boolean(active.has?.includes(item.key))}
              title={`Só quem tem nota de ${item.label}`}
              onClick={() =>
                onChange({ has: toggleIncluded(active.has, item.key) })
              }
            >
              {item.label}
            </Pill>
          ))}
        </FilterRow>

        <FilterRow label="Inglês">
          {ENGLISH_OPTIONS.map((item) => (
            <Pill
              key={item.key}
              active={Boolean(active.ingles?.includes(item.key))}
              title={item.title}
              onClick={() =>
                onChange({ ingles: toggleIncluded(active.ingles, item.key) })
              }
            >
              {item.label}
            </Pill>
          ))}
        </FilterRow>

        <FilterRow label="Distância">
          {DISTANCE_UNIT_OPTIONS.map((item) => (
            <Pill
              key={item.key}
              active={active.unit === item.key}
              title={item.title}
              onClick={() =>
                onChange(
                  active.unit === item.key
                    ? { unit: undefined, maxKm: undefined }
                    : { unit: item.key },
                )
              }
            >
              {item.label}
            </Pill>
          ))}
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span aria-hidden className="text-note text-subtle">
              até
            </span>
            {DISTANCE_MAX_KM.map((km) => (
              <Pill
                key={km}
                active={active.maxKm === km}
                title={
                  active.unit
                    ? `Até ${km} km de ${
                        DISTANCE_UNIT_OPTIONS.find((u) => u.key === active.unit)
                          ?.title
                      }`
                    : `Até ${km} km da unidade`
                }
                onClick={() =>
                  onChange({
                    maxKm: active.maxKm === km ? undefined : km,
                  })
                }
              >
                {km} km
              </Pill>
            ))}
          </span>
        </FilterRow>
      </div>
    </div>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5"
    >
      <MicroHeader className="mb-0 w-[5rem] shrink-0 whitespace-nowrap border-0 pb-0">
        {label}
      </MicroHeader>
      <div className="flex min-w-0 flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Pill({
  active,
  tone,
  title,
  onClick,
  children,
}: {
  active: boolean;
  tone?: Tone;
  title?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      aria-label={title}
      className={cn(
        "text-note rounded-chip border px-2.5 py-[3px] transition-colors",
        active
          ? "border-navy bg-navy font-semibold text-white"
          : tone
            ? cn(toneTinted[tone], "hover:border-navy")
            : "border-chip-border bg-chip-bg text-ink-3 hover:border-navy hover:text-navy",
      )}
    >
      {children}
    </button>
  );
}

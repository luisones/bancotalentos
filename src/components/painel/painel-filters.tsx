import Link from "next/link";
import { MicroHeader } from "@/components/liceu/surface";
import { campaignTone, shortCampaignName } from "@/lib/campaign-color";
import { toneTinted, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { SearchField } from "./search-field";

export type FilterOption = { slug: string; name: string };

/**
 * Filtros de um clique.
 *
 * Antes eram três `<select>` numa grade de quatro colunas, montando
 * `URLSearchParams` no cliente com `startTransition`. Um `<select>` custa dois
 * cliques e esconde as opções; e "ordenar por" saiu daqui — agora é o próprio
 * cabeçalho da tabela.
 *
 * O que sobra são links: Server Component, sem JS, e o estado ativo é a URL.
 * Só a busca continua sendo cliente, porque digitar exige estado local.
 */
export function PainelFilters({
  campaigns,
  disciplines,
  active,
  hrefFor,
}: {
  campaigns: FilterOption[];
  disciplines: FilterOption[];
  active: { campaign?: string; discipline?: string; search?: string };
  /** Monta a URL trocando UM filtro e preservando o resto. */
  hrefFor: (patch: Record<string, string | undefined>) => string;
}) {
  const hasFilters = Boolean(
    active.campaign || active.discipline || active.search,
  );

  return (
    <div className="rounded-panel border border-rule-strong bg-card">
      <div className="flex flex-col gap-3 px-4 py-3">
        <FilterRow label="Campanha">
          <Pill href={hrefFor({ campaign: undefined })} active={!active.campaign}>
            Todas
          </Pill>
          {campaigns.map((c) => (
            <Pill
              key={c.slug}
              href={hrefFor({ campaign: c.slug })}
              active={active.campaign === c.slug}
              tone={campaignTone(c.slug)}
            >
              {shortCampaignName(c.name)}
            </Pill>
          ))}
        </FilterRow>

        <FilterRow label="Disciplina">
          <Pill
            href={hrefFor({ discipline: undefined })}
            active={!active.discipline}
          >
            Todas
          </Pill>
          {disciplines.map((d) => (
            <Pill
              key={d.slug}
              href={hrefFor({ discipline: d.slug })}
              active={active.discipline === d.slug}
            >
              {d.name}
            </Pill>
          ))}
        </FilterRow>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-4 py-2.5">
        <SearchField initial={active.search ?? ""} />
        {hasFilters && (
          <Link
            href={hrefFor({
              campaign: undefined,
              discipline: undefined,
              search: undefined,
            })}
            className="text-note font-semibold text-gold-text hover:underline"
          >
            Limpar filtros
          </Link>
        )}
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
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
      <MicroHeader className="mb-0 w-[72px] shrink-0 border-0 pb-0">
        {label}
      </MicroHeader>
      <div className="flex min-w-0 flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Pill({
  href,
  active,
  tone,
  children,
}: {
  href: string;
  active: boolean;
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
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
    </Link>
  );
}

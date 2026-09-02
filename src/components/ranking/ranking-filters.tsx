"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MicroHeader } from "@/components/liceu/surface";

type FilterOption = { slug: string; name: string };

const SORTS = [
  { value: "score-desc", label: "Maior resultado" },
  { value: "score-asc", label: "Menor resultado" },
  { value: "name-asc", label: "Nome A–Z" },
  { value: "name-desc", label: "Nome Z–A" },
  { value: "date-desc", label: "Inscrição mais recente" },
  { value: "date-asc", label: "Inscrição mais antiga" },
];

export function RankingFilters({
  campaigns,
  disciplines,
}: {
  campaigns: FilterOption[];
  disciplines: FilterOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const campaign = searchParams.get("campaign") ?? "";
  const discipline = searchParams.get("discipline") ?? "";
  const search = searchParams.get("search") ?? "";
  const sort = searchParams.get("sort") ?? "score";
  const order = searchParams.get("order") ?? "desc";

  // O botão "Filtrar" lia o input por document.querySelector no seletor do
  // placeholder. Agora o campo tem estado próprio; a sincronia com a URL vem
  // da `key` no <SearchField>, que remonta o campo quando o termo muda —
  // em vez de um setState dentro de efeito.

  const update = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      startTransition(() => router.push(`/ranking?${params.toString()}`));
    },
    [router, searchParams],
  );

  const active = [
    campaign && {
      key: "campaign",
      label: campaigns.find((c) => c.slug === campaign)?.name ?? campaign,
    },
    discipline && {
      key: "discipline",
      label: disciplines.find((d) => d.slug === discipline)?.name ?? discipline,
    },
    search && { key: "search", label: `“${search}”` },
  ].filter((f): f is { key: string; label: string } => Boolean(f));

  return (
    <div className="rounded-panel border border-rule-strong bg-card">
      <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <MicroHeader className="mb-0 border-0 pb-0">Campanha</MicroHeader>
          <Select
            value={campaign || "all"}
            onValueChange={(v) => update({ campaign: v === "all" ? "" : v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as campanhas</SelectItem>
              {campaigns.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <MicroHeader className="mb-0 border-0 pb-0">Disciplina</MicroHeader>
          <Select
            value={discipline || "all"}
            onValueChange={(v) => update({ discipline: v === "all" ? "" : v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as disciplinas</SelectItem>
              {disciplines.map((d) => (
                <SelectItem key={d.slug} value={d.slug}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <MicroHeader className="mb-0 border-0 pb-0">Ordenar por</MicroHeader>
          <Select
            value={`${sort}-${order}`}
            onValueChange={(v) => {
              const idx = v.lastIndexOf("-");
              update({ sort: v.slice(0, idx), order: v.slice(idx + 1) });
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <MicroHeader className="mb-0 border-0 pb-0">Buscar</MicroHeader>
          <SearchField
            key={search}
            initial={search}
            isPending={isPending}
            onSubmit={(value) => update({ search: value })}
          />
        </div>
      </div>

      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-rule px-4 py-2.5">
          <span className="text-tag text-label">Filtros ativos</span>
          {active.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => update({ [f.key]: "" })}
              className="text-note inline-flex cursor-pointer items-center gap-1.5 rounded-chip border border-chip-border bg-chip-bg px-2.5 py-[3px] text-ink-3 hover:border-alert-border hover:text-alert"
            >
              {f.label}
              <X className="size-3" aria-hidden />
              <span className="sr-only">Remover filtro</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              update({ campaign: "", discipline: "", search: "" })
            }
            className="text-note cursor-pointer font-semibold text-gold-text hover:underline"
          >
            Limpar tudo
          </button>
        </div>
      )}
    </div>
  );
}

/** Campo de busca. Remontado por `key` quando o termo da URL muda. */
function SearchField({
  initial,
  isPending,
  onSubmit,
}: {
  initial: string;
  isPending: boolean;
  onSubmit: (value: string) => void;
}) {
  const [term, setTerm] = useState(initial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(term);
      }}
      className="flex gap-2"
    >
      <Input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Nome, e-mail ou disciplina"
        aria-label="Buscar candidato"
        className="min-w-0 flex-1"
      />
      <Button type="submit" size="icon" disabled={isPending}>
        <Search className="size-3.5" />
        <span className="sr-only">Filtrar</span>
      </Button>
    </form>
  );
}

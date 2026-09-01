"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FilterOption = { slug: string; name: string };

type RankingFiltersProps = {
  campaigns: FilterOption[];
  disciplines: FilterOption[];
};

export function RankingFilters({ campaigns, disciplines }: RankingFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const campaign = searchParams.get("campaign") ?? "";
  const discipline = searchParams.get("discipline") ?? "";
  const search = searchParams.get("search") ?? "";
  const sort = searchParams.get("sort") ?? "score";
  const order = searchParams.get("order") ?? "desc";

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      startTransition(() => {
        router.push(`/ranking?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  return (
    <div className="liceu-card flex flex-wrap items-end gap-4 p-4">
      <div className="min-w-[160px] flex-1 space-y-1">
        <label className="text-xs font-medium uppercase tracking-wide text-[var(--liceu-gold-text)]">
          Campanha
        </label>
        <Select
          value={campaign || "all"}
          onValueChange={(v) =>
            updateParams({ campaign: v === "all" ? "" : v })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {campaigns.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[160px] flex-1 space-y-1">
        <label className="text-xs font-medium uppercase tracking-wide text-[var(--liceu-gold-text)]">
          Disciplina
        </label>
        <Select
          value={discipline || "all"}
          onValueChange={(v) =>
            updateParams({ discipline: v === "all" ? "" : v })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {disciplines.map((d) => (
              <SelectItem key={d.slug} value={d.slug}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[200px] flex-1 space-y-1">
        <label className="text-xs font-medium uppercase tracking-wide text-[var(--liceu-gold-text)]">
          Buscar
        </label>
        <Input
          placeholder="Nome ou e-mail..."
          defaultValue={search}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParams({ search: (e.target as HTMLInputElement).value });
            }
          }}
        />
      </div>

      <div className="min-w-[140px] space-y-1">
        <label className="text-xs font-medium uppercase tracking-wide text-[var(--liceu-gold-text)]">
          Ordenar
        </label>
        <Select
          value={`${sort}-${order}`}
          onValueChange={(v) => {
            const [s, o] = v.split("-");
            updateParams({ sort: s, order: o });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="score-desc">Nota (maior)</SelectItem>
            <SelectItem value="score-asc">Nota (menor)</SelectItem>
            <SelectItem value="name-asc">Nome (A–Z)</SelectItem>
            <SelectItem value="name-desc">Nome (Z–A)</SelectItem>
            <SelectItem value="date-desc">Data (recente)</SelectItem>
            <SelectItem value="date-asc">Data (antiga)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="outline"
        disabled={isPending}
        onClick={() => {
          const input = document.querySelector<HTMLInputElement>(
            'input[placeholder="Nome ou e-mail..."]',
          );
          updateParams({ search: input?.value ?? "" });
        }}
      >
        {isPending ? "Filtrando..." : "Filtrar"}
      </Button>
    </div>
  );
}

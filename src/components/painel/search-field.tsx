"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Único pedaço de cliente do Painel.
 *
 * Digitar exige estado local; filtrar por campanha ou disciplina não — aquilo
 * são links. A busca zera as demais chaves de paginação/ordem? Não: preserva
 * tudo e troca só `search`, para o resultado continuar na ordem escolhida.
 */
export function SearchField({ initial }: { initial: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [term, setTerm] = useState(initial);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const next = new URLSearchParams(params.toString());
        const value = term.trim();
        if (value) next.set("search", value);
        else next.delete("search");
        startTransition(() => {
          router.push(next.size > 0 ? `/?${next}` : "/");
        });
      }}
      className="flex min-w-0 flex-1 gap-2 sm:max-w-sm"
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
        <span className="sr-only">Buscar</span>
      </Button>
    </form>
  );
}

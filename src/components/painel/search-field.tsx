"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Busca do Painel — estado controlado pelo island.
 *
 * Filtra a cada tecla em memória; não há round-trip ao Neon.
 */
export function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 gap-2 sm:max-w-sm">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Nome, e-mail ou disciplina"
        aria-label="Buscar candidato"
        className="min-w-0 flex-1"
      />
      <Button type="button" size="icon" tabIndex={-1} aria-hidden>
        <Search className="size-3.5" />
        <span className="sr-only">Buscar</span>
      </Button>
    </div>
  );
}

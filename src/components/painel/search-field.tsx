"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Busca do Painel — estado controlado pelo island.
 *
 * Filtra a cada tecla em memória; não há round-trip ao Neon. Havia um botão de
 * lupa ao lado, decorativo (`tabIndex={-1} aria-hidden`), e ele fazia o campo
 * parecer um formulário à espera de ser submetido — a filtragem instantânea que
 * já existia passava por não existir. Agora a lupa é ícone dentro do campo:
 * diz o que o campo é, sem prometer um clique.
 *
 * Filtra por NOME. Antes varria nome + e-mail + disciplina, e digitar "mat"
 * trazia os 63 candidatos de Matemática antes de qualquer Mateus.
 */
export function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative min-w-0 flex-1 sm:max-w-64">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-subtle"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Filtrar por nome"
        aria-label="Filtrar candidatos por nome"
        className="text-note h-8 min-w-0 pl-8"
      />
    </div>
  );
}

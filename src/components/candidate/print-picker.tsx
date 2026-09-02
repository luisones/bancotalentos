"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PRINT_SECTIONS, type PrintSectionId } from "@/lib/candidate/print";

/**
 * Montar impressão: escolher o que entra no documento.
 *
 * O estado vive na URL, então o documento é linkável e o preview é o próprio
 * documento — não há um segundo layout para manter em sincronia.
 */
export function PrintPicker({
  candidateId,
  selected,
  assinaturas,
  backHref,
}: {
  candidateId: string;
  selected: PrintSectionId[];
  assinaturas: boolean;
  backHref: string;
}) {
  const router = useRouter();
  const [set, setSet] = useState(new Set<PrintSectionId>(selected));
  const [sign, setSign] = useState(assinaturas);

  function apply(next: Set<PrintSectionId>, nextSign: boolean) {
    const q = new URLSearchParams();
    q.set("secoes", [...next].join(","));
    if (nextSign) q.set("assinaturas", "1");
    router.replace(`/candidatos/${candidateId}/impressao?${q.toString()}`, {
      scroll: false,
    });
  }

  return (
    <div
      data-print-hidden
      className="rounded-panel border border-rule-strong bg-card"
    >
      <div className="border-b border-rule px-[18px] py-[11px]">
        <p className="font-heading text-eyebrow font-bold uppercase tracking-eyebrow text-gold-text">
          Montar impressão
        </p>
        <p className="text-dense mt-0.5 text-muted-foreground">
          Selecione o que entra no documento. O que estiver sob avaliação cega
          não revelada é sempre omitido.
        </p>
      </div>

      <div className="grid gap-x-8 gap-y-1.5 px-[18px] py-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRINT_SECTIONS.map((s) => (
          <label
            key={s.id}
            className="text-cell flex cursor-pointer items-center gap-2.5 py-1"
          >
            <Checkbox
              checked={set.has(s.id)}
              onCheckedChange={(v) => {
                const next = new Set(set);
                if (v) next.add(s.id);
                else next.delete(s.id);
                setSet(next);
                apply(next, sign);
              }}
            />
            {s.label}
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-[18px] py-3">
        <label className="text-cell flex cursor-pointer items-center gap-2.5">
          <Checkbox
            checked={sign}
            onCheckedChange={(v) => {
              setSign(Boolean(v));
              apply(set, Boolean(v));
            }}
          />
          Incluir campos de assinatura
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <span data-numeric className="text-meta text-subtle">
            {set.size} de {PRINT_SECTIONS.length} seções
          </span>
          <Button variant="ghost" size="sm" onClick={() => router.push(backHref)}>
            Voltar à ficha
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="size-3.5" />
            Imprimir / Salvar PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

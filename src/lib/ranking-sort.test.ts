import { describe, expect, it } from "vitest";
import {
  englishRank,
  sortRows,
  STATUS_ORDER,
  type SortableRow,
} from "./ranking-sort";

/** Só os campos que a ordenação lê; o resto do row não participa. */
function row(name: string, consolidated: number | null): SortableRow {
  return { candidateName: name, consolidated } as SortableRow;
}

describe("ordenação do Painel", () => {
  it("mantém o ausente no fim NAS DUAS direções", () => {
    const rows = [
      row("sem nota", null),
      row("alta", 9),
      row("baixa", 3),
      row("outra sem nota", null),
    ];
    const column = {
      kind: "number" as const,
      pick: (r: SortableRow) => r.consolidated,
    };

    // Decrescente: a maior primeiro, os sem nota no fim.
    expect(sortRows(rows, column, true).map((r) => r.candidateName)).toEqual([
      "alta",
      "baixa",
      "sem nota",
      "outra sem nota",
    ]);

    // Crescente: a menor primeiro — e os sem nota CONTINUAM no fim. Inverter a
    // direção não pode promover quem não tem nota ao topo.
    expect(sortRows(rows, column, false).map((r) => r.candidateName)).toEqual([
      "baixa",
      "alta",
      "sem nota",
      "outra sem nota",
    ]);
  });

  it("ordena texto com as regras do pt-BR", () => {
    const rows = [row("Ávila", 1), row("Bastos", 1), row("Alves", 1)];
    const column = {
      kind: "text" as const,
      pick: (r: SortableRow) => r.candidateName,
    };
    expect(sortRows(rows, column, false).map((r) => r.candidateName)).toEqual([
      "Alves",
      "Ávila",
      "Bastos",
    ]);
  });

  it("classifica o nível de inglês pelo prefixo do rótulo", () => {
    expect(englishRank("A1-A2 (básico)")).toBe(1);
    expect(englishRank("B1-B2 (intermediário)")).toBe(2);
    expect(englishRank("C1-C2 (avançado/fluente)")).toBe(3);
    expect(englishRank(null)).toBeNull();
    // Rótulo que ninguém previu não vira 0 — vira ausência, e vai para o fim.
    expect(englishRank("nativo")).toBeNull();
  });

  it("ordena status pelo funil, não pelo alfabeto", () => {
    expect(STATUS_ORDER.novo).toBeLessThan(STATUS_ORDER.em_avaliacao);
    expect(STATUS_ORDER.em_duvida).toBeLessThan(STATUS_ORDER.avancar);
    expect(STATUS_ORDER.avancar).toBeLessThan(STATUS_ORDER.selecionado);
  });
});

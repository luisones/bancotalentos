import { describe, expect, it } from "vitest";
import {
  applyRankingFilters,
  englishRank,
  painelHref,
  sortRows,
  STATUS_ORDER,
  type SortableRow,
} from "./ranking-sort";

/** Só os campos que a ordenação lê; o resto do row não participa. */
function row(name: string, consolidated: number | null): SortableRow {
  return { candidateName: name, consolidated } as SortableRow;
}

type FilterRow = SortableRow & {
  campaignSlug: string | null;
  disciplineSlug: string | null;
  email: string | null;
};

function filterRow(
  name: string,
  opts: {
    score?: number | null;
    campaign?: string | null;
    discipline?: string | null;
    email?: string | null;
  } = {},
): FilterRow {
  return {
    candidateName: name,
    consolidated: opts.score ?? null,
    campaignSlug: opts.campaign ?? null,
    disciplineSlug: opts.discipline ?? null,
    email: opts.email ?? null,
    disciplineName: opts.discipline ?? null,
    appliedAt: null,
    englishLevel: null,
    kmSantoAndre: null,
    kmSaoCaetano: null,
    status: "novo",
    scores: {},
  };
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

    expect(sortRows(rows, column, true).map((r) => r.candidateName)).toEqual([
      "alta",
      "baixa",
      "sem nota",
      "outra sem nota",
    ]);

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
    expect(englishRank("nativo")).toBeNull();
  });

  it("ordena status pelo funil, não pelo alfabeto", () => {
    expect(STATUS_ORDER.novo).toBeLessThan(STATUS_ORDER.em_avaliacao);
    expect(STATUS_ORDER.em_duvida).toBeLessThan(STATUS_ORDER.avancar);
    expect(STATUS_ORDER.avancar).toBeLessThan(STATUS_ORDER.selecionado);
  });
});

describe("filtro do Painel", () => {
  const bank = [
    filterRow("Ana Matemática", {
      score: 9,
      campaign: "2026-scs",
      discipline: "matematica",
      email: "ana@x.com",
    }),
    filterRow("Bruno História", {
      score: 7,
      campaign: "2025-efaf",
      discipline: "historia",
    }),
    filterRow("Carla Sem Nota", {
      score: null,
      campaign: "2026-scs",
      discipline: "matematica",
    }),
  ];

  it("filtra por campanha e disciplina sem tocar no Neon", () => {
    const rows = applyRankingFilters(bank, {
      campaign: "2026-scs",
      discipline: "matematica",
    });
    expect(rows.map((r) => r.candidateName)).toEqual([
      "Ana Matemática",
      "Carla Sem Nota",
    ]);
  });

  it("busca sem acento: matematica acha Matemática", () => {
    const rows = applyRankingFilters(bank, { search: "matematica" });
    expect(rows.map((r) => r.candidateName)).toEqual(["Ana Matemática"]);
  });

  // A busca é por NOME. Varria também disciplina e e-mail, e o efeito era que
  // "mat" trazia os 63 candidatos de Matemática antes de qualquer Mateus — a
  // disciplina já tem pílula de um clique ao lado.
  it("busca ignora disciplina e e-mail", () => {
    expect(
      applyRankingFilters(bank, { search: "historia" }).map(
        (r) => r.candidateName,
      ),
    ).toEqual(["Bruno História"]);

    expect(applyRankingFilters(bank, { search: "ana@x.com" })).toEqual([]);
  });

  it("uma pílula de grupo traz as duas variantes de Português", () => {
    const portugues = [
      filterRow("Dora Texto", {
        score: 8,
        discipline: "portugues-producao-e-interpretacao-de-texto",
      }),
      filterRow("Elis Literatura", {
        score: 6,
        discipline: "portugues-literatura",
      }),
      filterRow("Fábio História", { score: 7, discipline: "historia" }),
    ];

    expect(
      applyRankingFilters(portugues, { discipline: "grupo-portugues" }).map(
        (r) => r.candidateName,
      ),
    ).toEqual(["Dora Texto", "Elis Literatura"]);

    // Link antigo, com o slug de uma das variantes, passa a trazer o grupo.
    expect(
      applyRankingFilters(portugues, {
        discipline: "portugues-literatura",
      }).map((r) => r.candidateName),
    ).toEqual(["Dora Texto", "Elis Literatura"]);
  });

  it("ordena por score com ausente no fim", () => {
    const rows = applyRankingFilters(bank, {
      campaign: "2026-scs",
      sort: "score",
      order: "desc",
    });
    expect(rows.map((r) => r.candidateName)).toEqual([
      "Ana Matemática",
      "Carla Sem Nota",
    ]);
  });

  it("painelHref omite a ordenação padrão", () => {
    expect(painelHref({ sort: "score", order: "desc" })).toBe("/");
    expect(painelHref({ sort: "name", order: "asc" })).toBe(
      "/?sort=name&order=asc",
    );
    expect(painelHref({ campaign: "2026-scs" })).toBe("/?campaign=2026-scs");
  });
});

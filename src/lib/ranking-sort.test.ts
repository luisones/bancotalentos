import { describe, expect, it } from "vitest";
import {
  applyRankingFilters,
  englishRank,
  painelHref,
  parseRankingFilters,
  sortRows,
  STATUS_ORDER,
  toggleIncluded,
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
    english?: string | null;
    kmSA?: number | null;
    kmSCS?: number | null;
    scores?: Record<string, number | null>;
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
    englishLevel: opts.english ?? null,
    kmSantoAndre: opts.kmSA ?? null,
    kmSaoCaetano: opts.kmSCS ?? null,
    status: "novo",
    scores: opts.scores ?? {},
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

  it("com nota exige TODAS as dimensões marcadas", () => {
    const scored = [
      filterRow("Só didática", { scores: { didatica: 8 } }),
      filterRow("Didática e vídeo", {
        scores: { didatica: 7, video: 6 },
      }),
      filterRow("Nota zero de vídeo", { scores: { video: 0 } }),
      filterRow("Nada", { scores: {} }),
    ];

    expect(
      applyRankingFilters(scored, { has: ["didatica"] }).map(
        (r) => r.candidateName,
      ),
    ).toEqual(["Só didática", "Didática e vídeo"]);

    expect(
      applyRankingFilters(scored, { has: ["didatica", "video"] }).map(
        (r) => r.candidateName,
      ),
    ).toEqual(["Didática e vídeo"]);

    // Zero é nota. Ausência é que não entra.
    expect(
      applyRankingFilters(scored, { has: ["video"] }).map(
        (r) => r.candidateName,
      ),
    ).toEqual(["Didática e vídeo", "Nota zero de vídeo"]);
  });

  it("inglês combina os níveis marcados (OU) pelo prefixo", () => {
    const levels = [
      filterRow("Ana A", { english: "A1-A2 (básico)", score: 9 }),
      filterRow("Bia B", { english: "B1-B2 (intermediário)", score: 8 }),
      filterRow("Caio C", { english: "C1-C2 (avançado/fluente)", score: 7 }),
      filterRow("Dora sem", { english: null, score: 6 }),
    ];

    expect(
      applyRankingFilters(levels, { ingles: ["B"] }).map(
        (r) => r.candidateName,
      ),
    ).toEqual(["Bia B"]);

    expect(
      applyRankingFilters(levels, { ingles: ["B", "C"] }).map(
        (r) => r.candidateName,
      ),
    ).toEqual(["Bia B", "Caio C"]);
  });

  it("distância exige unidade e raio, e ausência não é zero", () => {
    const near = [
      filterRow("Perto SA", { kmSA: 8, kmSCS: 25, score: 9 }),
      filterRow("Longe SA", { kmSA: 40, kmSCS: 12, score: 8 }),
      filterRow("Sem CEP", { score: 7 }),
    ];

    expect(
      applyRankingFilters(near, { unit: "santo_andre", maxKm: 20 }).map(
        (r) => r.candidateName,
      ),
    ).toEqual(["Perto SA"]);

    expect(
      applyRankingFilters(near, { unit: "sao_caetano", maxKm: 20 }).map(
        (r) => r.candidateName,
      ),
    ).toEqual(["Longe SA"]);

    // Unidade sem raio não filtra — o clique ainda está pela metade.
    expect(
      applyRankingFilters(near, { unit: "santo_andre" }).map(
        (r) => r.candidateName,
      ),
    ).toEqual(["Perto SA", "Longe SA", "Sem CEP"]);
  });

  it("serializa e relê os filtros novos na URL", () => {
    const href = painelHref({
      has: ["video", "didatica"],
      ingles: ["C", "A"],
      unit: "sao_caetano",
      maxKm: 30,
    });
    expect(href).toBe(
      `/?${new URLSearchParams({
        has: "didatica,video",
        ingles: "A,C",
        unit: "sao_caetano",
        maxKm: "30",
      })}`,
    );
    expect(parseRankingFilters(href)).toMatchObject({
      has: ["didatica", "video"],
      ingles: ["A", "C"],
      unit: "sao_caetano",
      maxKm: 30,
      sort: "score",
      order: "desc",
    });
  });

  it("toggleIncluded esvazia a lista em vez de deixar []", () => {
    expect(toggleIncluded(["didatica"], "didatica")).toBeUndefined();
    expect(toggleIncluded(undefined, "video")).toEqual(["video"]);
  });
});

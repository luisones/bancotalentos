/**
 * Ordenação do Painel — lógica pura, sem banco.
 *
 * Vive fora de `queries/ranking.ts` de propósito: aquele módulo abre a conexão
 * no import, e a regra mais importante daqui (o que não existe fica no fim) é
 * exatamente a que precisa de teste unitário barato.
 */

/** Só o que a ordenação lê. `RankingRow` satisfaz este formato. */
export type SortableRow = {
  candidateName: string;
  disciplineName: string | null;
  appliedAt: Date | null;
  consolidated: number | null;
  englishLevel: string | null;
  kmSantoAndre: number | null;
  kmSaoCaetano: number | null;
  status: string;
  scores: Record<string, number | null>;
};

/** Ordem do funil, para a coluna Status ordenar por progresso e não por alfabeto. */
export const STATUS_ORDER: Record<string, number> = {
  novo: 0,
  em_avaliacao: 1,
  a_contatar: 2,
  aula_teste_agendada: 3,
  em_duvida: 4,
  manter_no_banco: 5,
  nao_avancar: 6,
  avancar: 7,
  selecionado: 8,
};

/**
 * A1-A2 < B1-B2 < C1-C2. O rótulo vem do formulário, então casamos pelo
 * prefixo; rótulo que ninguém previu vira ausência, não zero.
 */
export function englishRank(level: string | null): number | null {
  if (!level) return null;
  const first = level.trim().charAt(0).toUpperCase();
  if (first === "A") return 1;
  if (first === "B") return 2;
  if (first === "C") return 3;
  return null;
}

export type ColumnSort<T extends SortableRow> =
  | { kind: "text"; pick: (row: T) => string | null }
  | { kind: "number"; pick: (row: T) => number | null };

/**
 * Como cada coluna se ordena. `pick` devolve `null` quando o dado não existe.
 */
export const SORTERS: Record<string, ColumnSort<SortableRow>> = {
  name: { kind: "text", pick: (r) => r.candidateName },
  discipline: { kind: "text", pick: (r) => r.disciplineName },
  date: { kind: "number", pick: (r) => r.appliedAt?.getTime() ?? null },
  score: { kind: "number", pick: (r) => r.consolidated },
  aula_teste: { kind: "number", pick: (r) => r.scores.aula_teste ?? null },
  didatica: { kind: "number", pick: (r) => r.scores.didatica ?? null },
  conteudo: { kind: "number", pick: (r) => r.scores.conteudo ?? null },
  video: { kind: "number", pick: (r) => r.scores.video ?? null },
  ingles: { kind: "number", pick: (r) => englishRank(r.englishLevel) },
  santo_andre: { kind: "number", pick: (r) => r.kmSantoAndre },
  sao_caetano: { kind: "number", pick: (r) => r.kmSaoCaetano },
  status: { kind: "number", pick: (r) => STATUS_ORDER[r.status] ?? null },
};

export const SORT_KEYS = Object.keys(SORTERS);

/**
 * Ordena separando o presente do ausente.
 *
 * O ausente vai SEMPRE para o fim, nas duas direções — nota que não existe não
 * é nota baixa, e distância desconhecida não é distância zero. Codificar essa
 * regra dentro do valor de retorno do comparador é onde ela costuma quebrar
 * quando a direção inverte.
 */
export function sortRows<T extends SortableRow>(
  rows: T[],
  column: ColumnSort<SortableRow>,
  descending: boolean,
): T[] {
  const present: Array<{ row: T; value: string | number }> = [];
  const missing: T[] = [];

  for (const row of rows) {
    const value = column.pick(row);
    if (value === null || value === "") missing.push(row);
    else present.push({ row, value });
  }

  present.sort((a, b) => {
    const cmp =
      column.kind === "text"
        ? String(a.value).localeCompare(String(b.value), "pt-BR")
        : (a.value as number) - (b.value as number);
    return descending ? -cmp : cmp;
  });

  return [...present.map((p) => p.row), ...missing];
}

/** Remove acento e caixa: "matematica" tem que achar "Matemática". */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Filtros que o Painel e o prev/próximo do perfil compartilham. */
export type RankingFilters = {
  campaign?: string;
  discipline?: string;
  search?: string;
  sort?: string;
  order?: string;
};

/**
 * Filtra e ordena em memória — a mesma lógica no servidor (SSR/vizinhos) e no
 * cliente (clique no cabeçalho sem round-trip ao Neon).
 */
export function applyRankingFilters<
  T extends SortableRow & {
    campaignSlug: string | null;
    disciplineSlug: string | null;
    email: string | null;
  },
>(rows: T[], filters: RankingFilters): T[] {
  const term = filters.search ? normalizeSearch(filters.search) : null;
  const filtered = rows.filter((row) => {
    if (filters.campaign && row.campaignSlug !== filters.campaign) return false;
    if (filters.discipline && row.disciplineSlug !== filters.discipline) {
      return false;
    }
    if (!term) return true;
    const haystack = normalizeSearch(
      [row.candidateName, row.email ?? "", row.disciplineName ?? ""].join(" "),
    );
    return haystack.includes(term);
  });

  const column = SORTERS[filters.sort ?? "score"] ?? SORTERS.score;
  const descending = (filters.order ?? "desc") !== "asc";
  return sortRows(filtered, column, descending);
}

/**
 * Monta a query do Painel. Ordenação padrão (`score` desc) fica FORA da URL —
 * senão "Limpar filtros" parece um filtro ativo.
 */
export function painelHref(filters: RankingFilters): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (!value) continue;
    if (key === "sort" && value === "score" && filters.order !== "asc") continue;
    if (key === "order" && filters.sort === "score" && value === "desc") continue;
    next.set(key, value);
  }
  return next.size > 0 ? `/?${next}` : "/";
}

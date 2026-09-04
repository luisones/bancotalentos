/**
 * Ordenação do Painel — lógica pura, sem banco.
 *
 * Vive fora de `queries/ranking.ts` de propósito: aquele módulo abre a conexão
 * no import, e a regra mais importante daqui (o que não existe fica no fim) é
 * exatamente a que precisa de teste unitário barato.
 */

import { disciplineGroupSlug } from "./discipline-group";

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

export const ENGLISH_LETTERS = ["A", "B", "C"] as const;
export type EnglishLetter = (typeof ENGLISH_LETTERS)[number];

/**
 * A1-A2 < B1-B2 < C1-C2. O rótulo vem do formulário, então casamos pelo
 * prefixo; rótulo que ninguém previu vira ausência, não zero.
 */
export function englishRank(level: string | null): number | null {
  const letter = englishLetter(level);
  if (letter === "A") return 1;
  if (letter === "B") return 2;
  if (letter === "C") return 3;
  return null;
}

export function englishLetter(level: string | null): EnglishLetter | null {
  if (!level) return null;
  const first = level.trim().charAt(0).toUpperCase();
  if (first === "A" || first === "B" || first === "C") return first;
  return null;
}

/** Os quatro itens do Resultado — ter nota é `score != null`, nunca zero. */
export const HAS_SCORE_KEYS = [
  "didatica",
  "conteudo",
  "aula_teste",
  "video",
] as const;
export type HasScoreKey = (typeof HAS_SCORE_KEYS)[number];

export const DISTANCE_UNITS = ["santo_andre", "sao_caetano"] as const;
export type DistanceUnit = (typeof DISTANCE_UNITS)[number];

export const DISTANCE_MAX_KM = [10, 20, 30, 50] as const;

/** Liga/desliga um item numa lista de filtro. Lista vazia vira ausência. */
export function toggleIncluded<T extends string>(
  list: T[] | undefined,
  item: T,
): T[] | undefined {
  const next = list?.includes(item)
    ? list.filter((value) => value !== item)
    : [...(list ?? []), item];
  return next.length ? next : undefined;
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
  /** Quem TEM nota nessas dimensões — várias pílulas = interseção (E). */
  has?: HasScoreKey[];
  /** Nível de inglês pelo prefixo A/B/C — várias pílulas = união (OU). */
  ingles?: EnglishLetter[];
  unit?: DistanceUnit;
  /** Só filtra junto com `unit`. Distância desconhecida não entra. */
  maxKm?: number;
};

/**
 * Filtra e ordena em memória — a mesma lógica no servidor (SSR/vizinhos) e no
 * cliente (clique no cabeçalho sem round-trip ao Neon).
 *
 * A busca é POR NOME. Antes varria nome + e-mail + disciplina, e o resultado é
 * que digitar "mat" trazia os 63 candidatos de Matemática antes de qualquer
 * pessoa chamada Mateus — o filtro de disciplina já é uma pílula de um clique
 * ao lado, e fazer o campo de texto competir com ela só atrapalhava quem estava
 * procurando uma pessoa.
 *
 * A disciplina compara pelo GRUPO (`discipline-group.ts`), então a pílula
 * "Português" traz as duas variantes.
 *
 * "Com nota" é interseção: Didática e Vídeo marcados exige as duas. Inglês é
 * união: B e C traz quem é B ou C. Distância precisa de unidade E raio;
 * CEP ausente não é 0 km — sai da lista.
 */
export function applyRankingFilters<
  T extends SortableRow & {
    campaignSlug: string | null;
    disciplineSlug: string | null;
    email: string | null;
  },
>(rows: T[], filters: RankingFilters): T[] {
  const term = filters.search ? normalizeSearch(filters.search) : null;
  const has = filters.has;
  const ingles = filters.ingles;
  const filtered = rows.filter((row) => {
    if (filters.campaign && row.campaignSlug !== filters.campaign) return false;
    if (
      filters.discipline &&
      disciplineGroupSlug(row.disciplineSlug) !==
        disciplineGroupSlug(filters.discipline)
    ) {
      return false;
    }
    if (has?.length) {
      for (const key of has) {
        if (row.scores[key] == null) return false;
      }
    }
    if (ingles?.length) {
      const letter = englishLetter(row.englishLevel);
      if (!letter || !ingles.includes(letter)) return false;
    }
    if (filters.unit && filters.maxKm != null) {
      const km =
        filters.unit === "santo_andre" ? row.kmSantoAndre : row.kmSaoCaetano;
      if (km == null || km > filters.maxKm) return false;
    }
    if (!term) return true;
    return normalizeSearch(row.candidateName).includes(term);
  });

  const column = SORTERS[filters.sort ?? "score"] ?? SORTERS.score;
  const descending = (filters.order ?? "desc") !== "asc";
  return sortRows(filtered, column, descending);
}

/**
 * Serializa os filtros. Ordenação padrão (`score` desc) fica FORA da URL —
 * senão "Limpar filtros" parece um filtro ativo.
 */
export function rankingSearchParams(filters: RankingFilters): URLSearchParams {
  const next = new URLSearchParams();
  if (filters.campaign) next.set("campaign", filters.campaign);
  if (filters.discipline) next.set("discipline", filters.discipline);
  if (filters.search) next.set("search", filters.search);
  if (filters.has?.length) {
    next.set(
      "has",
      HAS_SCORE_KEYS.filter((key) => filters.has!.includes(key)).join(","),
    );
  }
  if (filters.ingles?.length) {
    next.set(
      "ingles",
      ENGLISH_LETTERS.filter((letter) => filters.ingles!.includes(letter)).join(
        ",",
      ),
    );
  }
  if (filters.unit) next.set("unit", filters.unit);
  if (filters.maxKm != null && filters.maxKm > 0) {
    next.set("maxKm", String(filters.maxKm));
  }
  const sort = filters.sort ?? "score";
  const order = filters.order ?? "desc";
  if (!(sort === "score" && order !== "asc")) next.set("sort", sort);
  if (!(sort === "score" && order === "desc")) next.set("order", order);
  return next;
}

export function painelHref(filters: RankingFilters): string {
  const next = rankingSearchParams(filters);
  return next.size > 0 ? `/?${next}` : "/";
}

export function parseRankingFilters(
  input: string | URLSearchParams,
): RankingFilters {
  const params =
    typeof input === "string" ? paramsFromSearch(input) : input;
  const sort = params.get("sort") ?? undefined;
  const maxKm = parseMaxKm(params.get("maxKm"));
  const unit = parseOne(params.get("unit"), DISTANCE_UNITS);
  return {
    campaign: emptyToUndef(params.get("campaign")),
    discipline: emptyToUndef(params.get("discipline")),
    search: emptyToUndef(params.get("search")),
    sort: sort && SORT_KEYS.includes(sort) ? sort : "score",
    order: params.get("order") === "asc" ? "asc" : "desc",
    has: parseCsv(params.get("has"), HAS_SCORE_KEYS),
    ingles: parseCsv(params.get("ingles"), ENGLISH_LETTERS),
    unit,
    maxKm,
  };
}

export function parseRankingFiltersFromRecord(
  record: Record<string, string | string[] | undefined>,
): RankingFilters {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string" && value) params.set(key, value);
    else if (Array.isArray(value) && value.length) {
      params.set(key, value.filter(Boolean).join(","));
    }
  }
  return parseRankingFilters(params);
}

function paramsFromSearch(search: string): URLSearchParams {
  if (search.startsWith("/")) {
    const q = search.indexOf("?");
    return new URLSearchParams(q >= 0 ? search.slice(q + 1) : "");
  }
  return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
}

function emptyToUndef(value: string | null): string | undefined {
  return value ? value : undefined;
}

function parseOne<T extends string>(
  raw: string | null,
  allowed: readonly T[],
): T | undefined {
  if (!raw) return undefined;
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : undefined;
}

function parseCsv<T extends string>(
  raw: string | null,
  allowed: readonly T[],
): T[] | undefined {
  if (!raw) return undefined;
  const allowedSet = new Set<string>(allowed);
  const out: T[] = [];
  for (const part of raw.split(",")) {
    const value = part.trim();
    if (!allowedSet.has(value) || out.includes(value as T)) continue;
    out.push(value as T);
  }
  const ordered = allowed.filter((item) => out.includes(item));
  return ordered.length ? [...ordered] : undefined;
}

function parseMaxKm(raw: string | null): number | undefined {
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  const n = Number(raw);
  if (n < 1 || n > 500) return undefined;
  return n;
}

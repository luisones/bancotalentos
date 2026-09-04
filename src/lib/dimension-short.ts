/**
 * Rótulo curto de uma parte de grupo, para a interface.
 *
 * `AT DO DD CD CO VD` são os códigos do banco (`dimensions.short_code`) e
 * continuam lá — são a chave que casa a planilha de importação com a dimensão.
 * Mas ninguém lê "DD" e pensa "didática dissertativa": dentro de um cartão que
 * já se chama "Didática", a parte só precisa dizer se é a objetiva ou a
 * dissertativa.
 *
 * Por isso o mapa é por CÓDIGO DE DIMENSÃO e não por short code: o contexto
 * (o título do cartão ou da coluna) carrega a metade que falta.
 */
const PART_SHORT: Record<string, string> = {
  didatica_objetiva: "Obj.",
  didatica_dissertativa: "Dis.",
  conteudo_objetiva: "Obj.",
  conteudo_dissertativa: "Dis.",
};

/** Rótulo completo da parte, para `title` e leitor de tela. */
const PART_LONG: Record<string, string> = {
  didatica_objetiva: "Didática objetiva",
  didatica_dissertativa: "Didática dissertativa",
  conteudo_objetiva: "Conteúdo objetiva",
  conteudo_dissertativa: "Conteúdo dissertativa",
};

export function partShortLabel(code: string): string {
  return PART_SHORT[code] ?? code;
}

export function partLongLabel(code: string): string {
  return PART_LONG[code] ?? code;
}

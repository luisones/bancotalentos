/**
 * Sigla curta de disciplina, para os chips de filtro do Painel.
 *
 * "Português (Produção e Interpretação de Texto)" ocupa sozinho meia linha de
 * filtro; com quinze disciplinas a fila quebrava em três linhas e empurrava a
 * tabela para fora da primeira tela. A sigla cabe numa linha e o nome completo
 * continua acessível no `title` do chip.
 *
 * O mapa é por slug (estável no banco) e não por nome, e as duas famílias que
 * se repetem — Português e Polivalente — ganham um qualificador em vez de
 * colidirem em "POR" e "POLI".
 *
 * `grupo-portugues` não é disciplina: é o slug do grupo de `discipline-group.ts`,
 * que o filtro usa no lugar das duas variantes. Ele fica "POR" limpo justamente
 * porque, colapsadas, elas deixam de colidir.
 */
const ABBR: Record<string, string> = {
  historia: "HIS",
  biologia: "BIO",
  "grupo-portugues": "POR",
  "portugues-producao-e-interpretacao-de-texto": "POR TEX",
  matematica: "MAT",
  geografia: "GEO",
  quimica: "QUI",
  "filosofia-sociologia": "FIL SOC",
  fisica: "FIS",
  "portugues-literatura": "POR LIT",
  "polivalente-anos-iniciais": "POLI AI",
  "polivalente-educacao-infantil": "POLI EI",
  "educacao-fisica": "EDF",
  ingles: "ING",
  arte: "ART",
  espanhol: "ESP",
};

/**
 * Disciplina nova (ou renomeada) que ainda não está no mapa: as três primeiras
 * letras da primeira palavra significativa, em maiúsculas e sem acento. É
 * palpite, mas legível — e melhor do que despejar o nome inteiro no chip.
 */
function fallbackAbbr(name: string): string {
  const word = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)[0];
  if (!word) return name;
  return word.slice(0, 3).toUpperCase();
}

export function disciplineAbbr(slug: string, name: string): string {
  return ABBR[slug] ?? fallbackAbbr(name);
}

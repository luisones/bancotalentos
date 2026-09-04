/**
 * Agrupamento de disciplinas para FILTRO e para CONTAGEM.
 *
 * Português entrou no banco em duas disciplinas — "Português (Produção e
 * Interpretação de Texto)" e "Português (Literatura)" — porque a inscrição
 * pergunta a vaga, não a área. Para quem filtra e para quem conta posição, isso
 * são 63 + 28 candidatos concorrendo pelo mesmo tipo de vaga, e separá-los faz
 * duas listas curtas onde deveria haver uma: "1º de 28" é uma colocação mais
 * lisonjeira do que "1º de 91" sem que nada no mundo real justifique.
 *
 * O agrupamento é DERIVADO do slug, sem migração e sem coluna nova: a
 * disciplina de cada candidatura continua sendo a real, e é ela que aparece no
 * perfil e sob o nome no Painel. O grupo só existe onde se filtra e se conta.
 *
 * Um grupo com um membro só não existe — `disciplineGroupSlug` devolve o
 * próprio slug. Assim o resto do código não precisa saber se há grupo ou não.
 */

export type DisciplineGroup = {
  /** Slug do grupo. Nunca colide com slug de disciplina real. */
  slug: string;
  label: string;
  members: string[];
};

export const DISCIPLINE_GROUPS: DisciplineGroup[] = [
  {
    slug: "grupo-portugues",
    label: "Português",
    members: [
      "portugues-producao-e-interpretacao-de-texto",
      "portugues-literatura",
    ],
  },
];

const GROUP_BY_MEMBER = new Map<string, DisciplineGroup>();
for (const group of DISCIPLINE_GROUPS) {
  for (const member of group.members) GROUP_BY_MEMBER.set(member, group);
}

const GROUP_BY_SLUG = new Map(DISCIPLINE_GROUPS.map((g) => [g.slug, g]));

/** O grupo a que a disciplina pertence, ou `null` se ela é sozinha. */
export function disciplineGroupOf(
  slug: string | null,
): DisciplineGroup | null {
  if (!slug) return null;
  return GROUP_BY_MEMBER.get(slug) ?? null;
}

/**
 * A chave pela qual a disciplina é filtrada e contada: o grupo quando há um,
 * o próprio slug quando não há.
 */
export function disciplineGroupSlug(slug: string | null): string | null {
  if (!slug) return null;
  return GROUP_BY_MEMBER.get(slug)?.slug ?? slug;
}

/** `true` quando o valor é slug de grupo, e não de disciplina. */
export function isDisciplineGroupSlug(slug: string): boolean {
  return GROUP_BY_SLUG.has(slug);
}

/**
 * A lista de pílulas do filtro, com cada grupo colapsado numa opção.
 *
 * A ordem de entrada é preservada, e o grupo ocupa a posição do seu primeiro
 * membro — a lista vem ordenada por nome do banco, então "Português" cai onde o
 * leitor já espera encontrá-lo.
 */
export function disciplineFilterOptions<T extends { slug: string; name: string }>(
  disciplines: T[],
): Array<{ slug: string; name: string }> {
  const out: Array<{ slug: string; name: string }> = [];
  const seenGroups = new Set<string>();

  for (const discipline of disciplines) {
    const group = GROUP_BY_MEMBER.get(discipline.slug);
    if (!group) {
      out.push({ slug: discipline.slug, name: discipline.name });
      continue;
    }
    if (seenGroups.has(group.slug)) continue;
    seenGroups.add(group.slug);
    out.push({ slug: group.slug, name: group.label });
  }

  return out;
}

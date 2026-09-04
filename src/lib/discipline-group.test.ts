import { describe, expect, it } from "vitest";
import {
  disciplineFilterOptions,
  disciplineGroupOf,
  disciplineGroupSlug,
  isDisciplineGroupSlug,
} from "./discipline-group";

/** Como o banco devolve a lista, ordenada por nome. */
const DISCIPLINES = [
  { slug: "arte", name: "Arte" },
  { slug: "historia", name: "História" },
  {
    slug: "portugues-producao-e-interpretacao-de-texto",
    name: "Português (Produção e Interpretação de Texto)",
  },
  { slug: "portugues-literatura", name: "Português (Literatura)" },
  { slug: "quimica", name: "Química" },
];

describe("agrupamento de disciplina", () => {
  it("as duas variantes de Português caem no mesmo grupo", () => {
    expect(disciplineGroupSlug("portugues-literatura")).toBe("grupo-portugues");
    expect(
      disciplineGroupSlug("portugues-producao-e-interpretacao-de-texto"),
    ).toBe("grupo-portugues");
  });

  it("disciplina sozinha é o próprio grupo", () => {
    // Assim quem filtra e quem conta não precisa saber se há grupo ou não.
    expect(disciplineGroupSlug("historia")).toBe("historia");
    expect(disciplineGroupOf("historia")).toBeNull();
  });

  it("ausência de disciplina não vira grupo", () => {
    expect(disciplineGroupSlug(null)).toBeNull();
    expect(disciplineGroupOf(null)).toBeNull();
  });

  it("o slug do grupo é reconhecível e não colide com disciplina", () => {
    expect(isDisciplineGroupSlug("grupo-portugues")).toBe(true);
    expect(isDisciplineGroupSlug("portugues-literatura")).toBe(false);
    expect(DISCIPLINES.some((d) => d.slug === "grupo-portugues")).toBe(false);
  });

  it("o filtro colapsa o grupo na posição do primeiro membro", () => {
    expect(disciplineFilterOptions(DISCIPLINES)).toEqual([
      { slug: "arte", name: "Arte" },
      { slug: "historia", name: "História" },
      { slug: "grupo-portugues", name: "Português" },
      { slug: "quimica", name: "Química" },
    ]);
  });

  it("uma lista sem membros do grupo passa intacta", () => {
    const sem = [{ slug: "fisica", name: "Física" }];
    expect(disciplineFilterOptions(sem)).toEqual(sem);
  });
});

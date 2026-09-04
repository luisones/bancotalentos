import { describe, expect, it } from "vitest";
import {
  assembleDimensionScores,
  average,
  computeAprDisF,
  computeAprObj,
  computeConsolidated,
  computeFinalCont,
  computeQnF,
  foldGroups,
  groupScore,
  normalizeScore,
} from "./scoring";

const CONTEUDO = {
  code: "conteudo",
  members: ["conteudo_objetiva", "conteudo_dissertativa"],
};
const DIDATICA = {
  code: "didatica",
  members: ["didatica_objetiva", "didatica_dissertativa"],
};
/** O 1/2 herdado da planilha de 2025. */
const MEMBER_WEIGHTS = {
  conteudo_objetiva: 1,
  conteudo_dissertativa: 2,
  didatica_objetiva: 1,
  didatica_dissertativa: 1,
};

describe("scoring", () => {
  it("normalizes 0-30 to 0-10", () => {
    expect(normalizeScore(15, 30)).toBe(5);
    expect(normalizeScore(24.175, 30)).toBeCloseTo(8.058, 2);
  });

  it("computes Apr Dis F", () => {
    expect(computeAprDisF(2.4, 7.425, 11.425, 24.3)).toBeCloseTo(3.7958, 3);
  });

  it("computes Apr Obj from practices", () => {
    expect(computeAprObj(120.43)).toBeCloseTo(7.084, 2);
  });

  it("computes FINAL CONT", () => {
    expect(computeFinalCont(9, 5.5)).toBeCloseTo(6.6667, 3);
  });

  it("computes QnF ensemble with renormalization", () => {
    const all = computeQnF({ L: 2, G: 4, A: 9, O: 7 });
    expect(all).toBeCloseTo(4.4, 1);
    const withoutL = computeQnF({ G: 11, A: 15, O: 12 });
    expect(withoutL).toBeCloseTo(12.75, 2);
    expect(computeQnF({ L: 0, G: 10, A: 10, O: 10 })).toBeCloseTo(5, 2);
    expect(computeQnF({})).toBeNull();
  });

  it("averages lesson-test scores per evaluator then across evaluators", () => {
    const evaluatorA = average([8, 10, 6, 9]);
    const evaluatorB = average([7, 9, 8, 10]);
    expect(average([evaluatorA!, evaluatorB!])).toBeCloseTo(8.375, 3);
  });

  it("renormalizes weights when dimensions missing", () => {
    const result = computeConsolidated(
      [
        { code: "prova_conteudo", score: 9 },
        { code: "video", score: 8 },
      ],
      {
        prova_conteudo: 0.2,
        didatica_humana: 0.15,
        video: 0.1,
        curriculo: 0.1,
        entrevista: 0.2,
        aula_teste: 0.25,
      },
    );
    expect(result.consolidated).toBeCloseTo(8.6667, 2);
    expect(result.coverage).toBe(2);
  });

  it("average ignores empty", () => {
    expect(average([8, 9, 7])).toBe(8);
    expect(average([])).toBeNull();
  });

  it("uses imported scores when there are no evaluations", () => {
    const result = assembleDimensionScores({
      dimensionCodes: ["prova_conteudo", "video", "entrevista"],
      weights: { prova_conteudo: 0.5, video: 0.3, entrevista: 0.2 },
      evals: [],
      imported: [
        { dimensionCode: "prova_conteudo", score: 8 },
        { dimensionCode: "video", score: 6 },
      ],
      lessonTestScore: null,
    });
    expect(result.consolidated).toBeCloseTo((8 * 0.5 + 6 * 0.3) / 0.8, 5);
    expect(result.coverage).toBe(2);
    expect(
      result.dimensionScores.find((d) => d.code === "entrevista")?.score,
    ).toBeNull();
  });

  it("prefers live evaluations over imported scores", () => {
    const result = assembleDimensionScores({
      dimensionCodes: ["prova_conteudo"],
      weights: { prova_conteudo: 1 },
      evals: [
        {
          dimensionCode: "prova_conteudo",
          scoreRaw: 9,
          scaleMax: 10,
          evaluatorStaffId: "a",
          blindPeekedAt: null,
        },
      ],
      imported: [{ dimensionCode: "prova_conteudo", score: 2 }],
      lessonTestScore: null,
    });
    expect(result.consolidated).toBe(9);
  });

  it("uses lesson-test average for aula_teste", () => {
    const result = assembleDimensionScores({
      dimensionCodes: ["aula_teste", "video"],
      weights: { aula_teste: 0.5, video: 0.5 },
      evals: [],
      imported: [{ dimensionCode: "aula_teste", score: 1 }],
      lessonTestScore: 8,
    });
    expect(result.dimensionScores.find((d) => d.code === "aula_teste")?.score).toBe(
      8,
    );
  });

  // Esta é a razão pela qual a aula-teste se lança POR CRITÉRIOS e não por uma
  // nota 0–10 na dimensão: existindo critérios, a média deles vence a linha de
  // `evaluations`. O campo de nota única aceitava um número que o cálculo
  // ignorava em silêncio. Se este teste inverter, o formulário de critérios
  // deixa de ser a fonte da nota e a interface passa a mentir.
  it("lesson-test average beats a live evaluation on aula_teste", () => {
    const result = assembleDimensionScores({
      dimensionCodes: ["aula_teste", "video"],
      weights: { aula_teste: 0.5, video: 0.5 },
      evals: [
        {
          dimensionCode: "aula_teste",
          scoreRaw: 3,
          scaleMax: 10,
          evaluatorStaffId: "staff-1",
          blindPeekedAt: null,
        },
      ],
      imported: [],
      lessonTestScore: 8.5,
      forceReveal: true,
    });
    expect(
      result.dimensionScores.find((d) => d.code === "aula_teste")?.score,
    ).toBe(8.5);
  });

  it("group score with 1/2 weights reproduces FINAL CONT exactly", () => {
    // A fórmula da planilha de 2025 vira configuração, não constante. Se este
    // teste quebrar, a nota histórica de 68 candidaturas mudou de significado.
    for (const [obj, disc] of [
      [9, 5.5],
      [6.5, 1.7],
      [7, 8.25],
      [8.5, 1.9],
    ]) {
      expect(
        groupScore(
          [
            { code: "conteudo_objetiva", score: obj },
            { code: "conteudo_dissertativa", score: disc },
          ],
          MEMBER_WEIGHTS,
        ),
      ).toBeCloseTo(computeFinalCont(obj, disc), 10);
    }
  });

  it("group score with a single part is that part, never an average with zero", () => {
    expect(
      groupScore(
        [
          { code: "conteudo_objetiva", score: 8 },
          { code: "conteudo_dissertativa", score: null },
        ],
        MEMBER_WEIGHTS,
      ),
    ).toBe(8);
    // Mesmo sendo a parte de peso 2 a que sobrou: renormalizar sobre o que
    // existe significa que o peso da ausente sai do denominador.
    expect(
      groupScore(
        [
          { code: "conteudo_objetiva", score: null },
          { code: "conteudo_dissertativa", score: 6 },
        ],
        MEMBER_WEIGHTS,
      ),
    ).toBe(6);
  });

  it("group score with no parts is null", () => {
    expect(
      groupScore(
        [
          { code: "conteudo_objetiva", score: null },
          { code: "conteudo_dissertativa", score: null },
        ],
        MEMBER_WEIGHTS,
      ),
    ).toBeNull();
    expect(groupScore([], MEMBER_WEIGHTS)).toBeNull();
  });

  it("folds groups and keeps ungrouped dimensions loose", () => {
    const { items, groupScores } = foldGroups(
      [
        { code: "conteudo_objetiva", score: 9 },
        { code: "conteudo_dissertativa", score: 5.5 },
        { code: "didatica_objetiva", score: 7 },
        { code: "didatica_dissertativa", score: null },
        { code: "aula_teste", score: 8 },
        { code: "video", score: null },
      ],
      [CONTEUDO, DIDATICA],
      MEMBER_WEIGHTS,
    );

    expect(items.map((i) => i.code)).toEqual([
      "conteudo",
      "didatica",
      "aula_teste",
      "video",
    ]);
    expect(groupScores.find((g) => g.code === "conteudo")?.score).toBeCloseTo(
      6.6667,
      3,
    );
    expect(groupScores.find((g) => g.code === "didatica")?.score).toBe(7);
  });

  it("consolidates over groups, so didática does not weigh double", () => {
    const result = assembleDimensionScores({
      dimensionCodes: [
        "conteudo_objetiva",
        "conteudo_dissertativa",
        "didatica_objetiva",
        "didatica_dissertativa",
        "aula_teste",
        "video",
      ],
      groups: [CONTEUDO, DIDATICA],
      memberWeights: MEMBER_WEIGHTS,
      weights: { conteudo: 0.3, didatica: 0.3, aula_teste: 0.3, video: 0.1 },
      evals: [],
      imported: [
        { dimensionCode: "conteudo_objetiva", score: 9 },
        { dimensionCode: "conteudo_dissertativa", score: 5.5 },
        { dimensionCode: "didatica_objetiva", score: 7 },
      ],
      lessonTestScore: null,
    });

    // Conteúdo = (9 + 2*5.5)/3 = 6.6667 · Didática = 7 (só a objetiva).
    // Renormalizado sobre 0.3 + 0.3, porque aula-teste e vídeo não existem.
    expect(result.consolidated).toBeCloseTo((6.66667 * 0.3 + 7 * 0.3) / 0.6, 4);
    expect(result.coverage).toBe(2);
    expect(result.totalDimensions).toBe(4);
    // As folhas continuam disponíveis para o detalhe da página do professor.
    expect(result.dimensionScores).toHaveLength(6);
  });

  it("hides peer evaluations until the staff member has scored", () => {
    const result = assembleDimensionScores({
      dimensionCodes: ["video"],
      weights: { video: 1 },
      evals: [
        {
          dimensionCode: "video",
          scoreRaw: 10,
          scaleMax: 10,
          evaluatorStaffId: "peer",
          blindPeekedAt: null,
        },
      ],
      imported: [{ dimensionCode: "video", score: 4 }],
      lessonTestScore: null,
      staffUserId: "me",
    });
    expect(result.dimensionScores[0]?.score).toBe(4);
  });
});

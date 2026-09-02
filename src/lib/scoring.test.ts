import { describe, expect, it } from "vitest";
import {
  assembleDimensionScores,
  average,
  computeAprDisF,
  computeAprObj,
  computeConsolidated,
  computeFinalCont,
  normalizeScore,
} from "./scoring";

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

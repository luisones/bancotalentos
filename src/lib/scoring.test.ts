import { describe, expect, it } from "vitest";
import {
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
});

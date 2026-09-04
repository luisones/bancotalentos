import { describe, expect, it } from "vitest";
import { QUICK_NOTE_MAX } from "../../src/lib/candidate/quick-note";
import {
  collectObsQuickNotes,
  normalizeObsText,
} from "./obs-quick-notes";

describe("normalizeObsText", () => {
  it("colapsa espaço e recusa vazio", () => {
    expect(normalizeObsText("  Já veio   em 2025  ")).toBe("Já veio em 2025");
    expect(normalizeObsText("   ")).toBeNull();
  });

  it("recusa o que não cabe na nota rápida, sem truncar", () => {
    expect(normalizeObsText("x".repeat(QUICK_NOTE_MAX))).toHaveLength(
      QUICK_NOTE_MAX,
    );
    expect(normalizeObsText("x".repeat(QUICK_NOTE_MAX + 1))).toBeNull();
  });
});

describe("collectObsQuickNotes", () => {
  it("agrupa por pessoa_id mesmo sem candidatura_id", () => {
    const { byPessoa, skippedEmpty, skippedLong } = collectObsQuickNotes([
      { pessoa_id: "PES-2026-001", texto_original: "NÃO COMPARECEU" },
      { pessoa_id: "PES-2026-002", texto_original: "  " },
      { pessoa_id: "PES-2026-003", texto_original: "x".repeat(QUICK_NOTE_MAX + 1) },
    ]);
    expect(byPessoa.get("PES-2026-001")).toBe("NÃO COMPARECEU");
    expect(byPessoa.has("PES-2026-002")).toBe(false);
    expect(byPessoa.has("PES-2026-003")).toBe(false);
    expect(skippedEmpty).toBe(1);
    expect(skippedLong).toBe(1);
  });

  it("não duplica o mesmo texto e junta textos distintos se couberem", () => {
    const { byPessoa, skippedJoinOverflow } = collectObsQuickNotes([
      { pessoa_id: "PES-2026-010", texto_original: "Ex-aluno" },
      { pessoa_id: "PES-2026-010", texto_original: "Ex-aluno" },
      { pessoa_id: "PES-2026-011", texto_original: "A" },
      { pessoa_id: "PES-2026-011", texto_original: "B" },
    ]);
    expect(byPessoa.get("PES-2026-010")).toBe("Ex-aluno");
    expect(byPessoa.get("PES-2026-011")).toBe("A · B");
    expect(skippedJoinOverflow).toBe(0);
  });

  it("se a junção estourar o limite, fica com o primeiro texto", () => {
    const a = "a".repeat(70);
    const b = "b".repeat(70);
    const { byPessoa, skippedJoinOverflow } = collectObsQuickNotes([
      { pessoa_id: "PES-2026-012", texto_original: a },
      { pessoa_id: "PES-2026-012", texto_original: b },
    ]);
    expect(byPessoa.get("PES-2026-012")).toBe(a);
    expect(skippedJoinOverflow).toBe(1);
  });
});

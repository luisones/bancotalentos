export function normalizeScore(score: number, scaleMax: number): number {
  if (scaleMax <= 0) return 0;
  return (score / scaleMax) * 10;
}

export function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export type DimensionScore = {
  code: string;
  score: number | null;
  evaluatorCount?: number;
};

export type ConsolidatedResult = {
  consolidated: number | null;
  coverage: number;
  totalDimensions: number;
  /** As folhas: uma entrada por dimensão do catálogo. */
  dimensionScores: DimensionScore[];
  /** Os grupos (Didática, Conteúdo). Vazio quando não há agrupamento. */
  groupScores: DimensionScore[];
};

/**
 * Um grupo de dimensões que entram no Resultado como um número só.
 * `didatica` = objetiva + dissertativa; `conteudo` idem.
 */
export type DimensionGroup = { code: string; members: string[] };

export function computeConsolidated(
  dimensionScores: DimensionScore[],
  weights: Record<string, number>,
): ConsolidatedResult {
  const totalDimensions = Object.keys(weights).length;
  const available = dimensionScores.filter((d) => d.score !== null);

  if (available.length === 0) {
    return {
      consolidated: null,
      coverage: 0,
      totalDimensions,
      dimensionScores,
      groupScores: [],
    };
  }

  let weightSum = 0;
  let weightedSum = 0;

  for (const dim of available) {
    const w = weights[dim.code] ?? 0;
    if (w <= 0) continue;
    weightSum += w;
    weightedSum += (dim.score as number) * w;
  }

  const consolidated = weightSum > 0 ? weightedSum / weightSum : null;

  return {
    consolidated,
    coverage: available.length,
    totalDimensions,
    dimensionScores,
    groupScores: [],
  };
}

/**
 * Média PONDERADA das partes PRESENTES, renormalizada sobre elas.
 *
 * É a mesma regra de `computeConsolidated`, um nível abaixo: parte ausente não
 * vira zero, ela sai do denominador. Com uma parte só, o resultado é a própria
 * nota — que é o que faz "fez só a objetiva" não ser uma punição.
 *
 * Com `{ conteudo_objetiva: 1, conteudo_dissertativa: 2 }` e as duas presentes,
 * o resultado é exatamente `(OBJ + 2*DISC)/3` — a fórmula FINAL CONT da
 * planilha de 2025, agora como configuração editável em /admin/pesos e não como
 * constante enterrada no código.
 */
export function groupScore(
  members: DimensionScore[],
  memberWeights: Record<string, number>,
): number | null {
  let weightSum = 0;
  let weightedSum = 0;

  for (const member of members) {
    if (member.score === null) continue;
    // Peso ausente vale 1: um catálogo sem configuração de partes degrada para
    // média simples em vez de zerar o grupo inteiro.
    const w = memberWeights[member.code] ?? 1;
    if (w <= 0) continue;
    weightSum += w;
    weightedSum += member.score * w;
  }

  return weightSum > 0 ? weightedSum / weightSum : null;
}

/**
 * Dobra as folhas nos itens que o Resultado pondera: um número por grupo, mais
 * as dimensões que não pertencem a grupo nenhum (aula-teste, vídeo).
 */
export function foldGroups(
  dimensionScores: DimensionScore[],
  groups: DimensionGroup[],
  memberWeights: Record<string, number>,
): { items: DimensionScore[]; groupScores: DimensionScore[] } {
  const byCode = new Map(dimensionScores.map((d) => [d.code, d]));
  const grouped = new Set(groups.flatMap((g) => g.members));

  const groupScores: DimensionScore[] = groups.map((group) => {
    const members = group.members
      .map((code) => byCode.get(code))
      .filter((d): d is DimensionScore => d !== undefined);
    return {
      code: group.code,
      score: groupScore(members, memberWeights),
      evaluatorCount: members.reduce(
        (sum, m) => sum + (m.evaluatorCount ?? 0),
        0,
      ),
    };
  });

  const loose = dimensionScores.filter((d) => !grouped.has(d.code));
  return { items: [...groupScores, ...loose], groupScores };
}

/** Planilha formulas for validation during ingest */
export function computeAprDisF(q1f: number, q2f: number, q3f: number, q4f: number) {
  return (10 * (q1f + q2f + q3f + q4f)) / 120;
}

export function computeAprObj(practiceSum: number) {
  return (10 * practiceSum) / 170;
}

export function computeFinalCont(obj: number, disc: number) {
  return (obj + 2 * disc) / 3;
}

const LLM_WEIGHTS: Record<string, number> = {
  L: 0.5,
  G: 0.15,
  A: 0.175,
  O: 0.175,
};

/** Ensemble QnF: renormalized over present LLM providers (scale 0–30). */
export function computeQnF(
  scores: Partial<Record<"L" | "G" | "A" | "O", number | null>>,
): number | null {
  let weightSum = 0;
  let weightedSum = 0;
  for (const provider of ["L", "G", "A", "O"] as const) {
    const score = scores[provider];
    if (score === null || score === undefined) continue;
    const w = LLM_WEIGHTS[provider];
    weightSum += w;
    weightedSum += w * score;
  }
  if (weightSum === 0) return null;
  return weightedSum / weightSum;
}

export function formatScore(value: number | null, digits = 1): string {
  if (value === null || Number.isNaN(value)) return "—";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatCoverage(coverage: number, total: number): string {
  return `${coverage}/${total}`;
}

export function formatCoveragePercent(coverage: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((coverage / total) * 100)}%`;
}

export type ScoreEvalInput = {
  dimensionCode: string;
  scoreRaw: string | number;
  scaleMax: string | number;
  evaluatorStaffId: string;
  blindPeekedAt: Date | null;
};

export type ScoreImportedInput = {
  dimensionCode: string;
  score: string | number;
};

export type AssembleScoresInput = {
  dimensionCodes: string[];
  /** Pesos do que o Resultado pondera: grupos e dimensões sem grupo. */
  weights: Record<string, number>;
  /** Grupos do catálogo. Ausente = nenhum agrupamento, comportamento antigo. */
  groups?: DimensionGroup[];
  /** Pesos das partes DENTRO de cada grupo. Ausente = média simples. */
  memberWeights?: Record<string, number>;
  evals: ScoreEvalInput[];
  imported: ScoreImportedInput[];
  /**
   * Nota de dimensão recalculada a partir de override humano por pergunta.
   * Vence o importado, perde para a avaliação lançada direto na dimensão.
   */
  overridden?: Record<string, number>;
  lessonTestScore: number | null;
  staffUserId?: string;
  forceReveal?: boolean;
  /** Códigos de dimensão que o usuário revelou nesta candidatura. */
  peekedDimensionCodes?: ReadonlySet<string>;
};

/**
 * O avaliador vê as notas dos colegas se já registrou a própria, ou se
 * revelou explicitamente (peek auditado).
 *
 * O `hasPeeked` anterior lia `blindPeekedAt` nas linhas do PRÓPRIO avaliador,
 * o que exigia ele já ter uma avaliação — e nesse caso `hasOwn` já era
 * verdadeiro. Era código morto: quem não avaliou nunca conseguia revelar.
 * Agora o peek vem de `blind_peeks`, registro próprio e independente.
 */
export function canSeePeerEvaluations(
  evals: Pick<ScoreEvalInput, "evaluatorStaffId">[],
  staffUserId: string,
  /** Dimensões que este usuário revelou nesta candidatura. */
  peekedDimensionCodes?: ReadonlySet<string>,
  dimensionCode?: string,
): boolean {
  const hasOwn = evals.some((e) => e.evaluatorStaffId === staffUserId);
  if (hasOwn) return true;
  if (!peekedDimensionCodes) return false;
  // Sem dimensão informada, basta ter revelado qualquer uma.
  return dimensionCode
    ? peekedDimensionCodes.has(dimensionCode)
    : peekedDimensionCodes.size > 0;
}

/**
 * Consolidado puro: avaliação individual > importado; dimensão ausente não vira
 * zero. As folhas são dobradas nos grupos antes de ponderar, então o Resultado
 * pondera Didática, Conteúdo, Aula-teste e Vídeo — e não seis notas soltas, o
 * que faria didática pesar o dobro de aula-teste só por ter duas partes.
 */
export function assembleDimensionScores(
  input: AssembleScoresInput,
): ConsolidatedResult {
  const staffUserId = input.staffUserId;
  const alwaysReveal = input.forceReveal || !staffUserId;

  const dimensionScores: DimensionScore[] = input.dimensionCodes.map((code) => {
    const dimEvals = input.evals.filter((e) => e.dimensionCode === code);
    // A cegueira é POR DIMENSÃO: avaliar uma não revela as outras.
    const revealPeers =
      alwaysReveal ||
      canSeePeerEvaluations(dimEvals, staffUserId!, input.peekedDimensionCodes, code);
    const visibleEvals = revealPeers
      ? dimEvals
      : dimEvals.filter((e) => e.evaluatorStaffId === staffUserId);
    const evalScores = visibleEvals.map((e) =>
      normalizeScore(Number(e.scoreRaw), Number(e.scaleMax)),
    );

    const imp = input.imported.find((i) => i.dimensionCode === code);

    const overridden = input.overridden?.[code];

    let score: number | null = null;
    if (code === "aula_teste" && input.lessonTestScore !== null) {
      score = input.lessonTestScore;
    } else if (evalScores.length > 0) {
      score = average(evalScores);
    } else if (overridden !== undefined) {
      // Override por pergunta é julgamento humano: vale mais que o número
      // importado da planilha, e menos que uma nota lançada na dimensão.
      score = overridden;
    } else if (imp) {
      score = Number(imp.score);
    }

    return { code, score, evaluatorCount: dimEvals.length };
  });

  const groups = input.groups ?? [];
  if (groups.length === 0) {
    return computeConsolidated(dimensionScores, input.weights);
  }

  const { items, groupScores } = foldGroups(
    dimensionScores,
    groups,
    input.memberWeights ?? {},
  );
  const result = computeConsolidated(items, input.weights);

  // O consolidado e a cobertura vêm dos ITENS ponderados; as folhas seguem
  // junto porque é delas que a página do professor precisa para detalhar.
  return { ...result, dimensionScores, groupScores };
}

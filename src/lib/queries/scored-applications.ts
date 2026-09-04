import { cache } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  applications,
  campaigns,
  candidates,
  cepDistances,
  cepLocations,
  disciplines,
} from "@/lib/db/schema";
import {
  assembleScoresForApplications,
  prefetchScoringData,
  type ScoringCatalog,
} from "./scoring-data";

/**
 * Uma candidatura com tudo o que o Painel e a página do professor precisam
 * saber sobre ela, já pontuada.
 */
export type ScoredApplication = {
  applicationId: string;
  candidateId: string;
  candidateName: string;
  email: string | null;
  phone: string | null;
  englishLevel: string | null;
  quickNote: string | null;
  starred: boolean;
  status: string;
  disciplineId: string | null;
  disciplineName: string | null;
  disciplineSlug: string | null;
  campaignId: string | null;
  campaignName: string | null;
  campaignSlug: string | null;
  appliedAt: Date | null;

  postalCode: string | null;
  kmSantoAndre: number | null;
  kmSaoCaetano: number | null;
  /** `rodoviaria` | `linha_reta` | null */
  distanceMode: string | null;
  /** `rua` | `bairro` | `cidade` | null */
  distancePrecision: string | null;

  consolidated: number | null;
  coverage: number;
  totalDimensions: number;
  /** Notas por código: as folhas (`didatica_objetiva`…) e os grupos (`didatica`). */
  scores: Record<string, number | null>;
};

export type ScoredIndex = {
  rows: ScoredApplication[];
  byApplicationId: Map<string, ScoredApplication>;
  catalog: ScoringCatalog;
};

/**
 * Pontua TODAS as candidaturas uma vez por request.
 *
 * Antes, `getRankingRows` varria e pontuava o banco inteiro, e
 * `getRankingNeighborIds` repetia a varredura completa só para descobrir o
 * vizinho anterior e o próximo. Com as posições por disciplina (na campanha e
 * no banco) isso viraria quatro varreduras na mesma renderização.
 *
 * `cache` do React deduplica dentro de um request; a chave é o avaliador,
 * porque a avaliação cega esconde nota de colega e portanto muda o
 * consolidado de quem está olhando.
 */
export const getScoredApplications = cache(
  async (staffUserId: string): Promise<ScoredIndex> => {
    // As duas metades não dependem uma da outra: a pontuação é de TODAS as
    // candidaturas, não das que esta consulta devolve. Em série custavam a soma
    // de dois round-trips ao banco.
    const [base, [catalog, inputs]] = await Promise.all([
      db
        .select({
          applicationId: applications.id,
          candidateId: candidates.id,
          candidateName: candidates.fullName,
          email: candidates.email,
          phone: candidates.phone,
          englishLevel: candidates.englishLevel,
          quickNote: candidates.highlightedNote,
          starred: candidates.starred,
          status: applications.status,
          disciplineId: applications.disciplineId,
          disciplineName: disciplines.name,
          disciplineSlug: disciplines.slug,
          campaignId: applications.campaignId,
          campaignName: campaigns.name,
          campaignSlug: campaigns.slug,
          appliedAt: applications.appliedAt,
          postalCode: candidates.postalCode,
          kmSantoAndre: cepDistances.kmSantoAndre,
          kmSaoCaetano: cepDistances.kmSaoCaetano,
          distanceMode: cepDistances.mode,
          distancePrecision: cepLocations.precision,
        })
        .from(applications)
        .innerJoin(candidates, eq(candidates.id, applications.candidateId))
        .leftJoin(disciplines, eq(disciplines.id, applications.disciplineId))
        .leftJoin(campaigns, eq(campaigns.id, applications.campaignId))
        // A distância é sempre lida do cache. Nenhuma chamada externa aqui.
        .leftJoin(cepDistances, eq(cepDistances.cep, candidates.postalCode))
        .leftJoin(cepLocations, eq(cepLocations.cep, candidates.postalCode))
        .orderBy(asc(candidates.fullName)),
      prefetchScoringData(),
    ]);

    const ids = base.map((r) => r.applicationId);
    const scoresByApp = assembleScoresForApplications(ids, catalog, inputs, {
      staffUserId,
    });

    const rows: ScoredApplication[] = base.map((row) => {
      const result = scoresByApp.get(row.applicationId);
      const scores: Record<string, number | null> = {};
      for (const dim of result?.dimensionScores ?? []) scores[dim.code] = dim.score;
      for (const grp of result?.groupScores ?? []) scores[grp.code] = grp.score;

      return {
        ...row,
        kmSantoAndre: numberOrNull(row.kmSantoAndre),
        kmSaoCaetano: numberOrNull(row.kmSaoCaetano),
        consolidated: result?.consolidated ?? null,
        coverage: result?.coverage ?? 0,
        totalDimensions: result?.totalDimensions ?? 0,
        scores,
      };
    });

    return {
      rows,
      byApplicationId: new Map(rows.map((r) => [r.applicationId, r])),
      catalog,
    };
  },
);

function numberOrNull(value: string | null): number | null {
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export type Position = { position: number; total: number };

export type DisciplinePositions = {
  /** Entre os concorrentes da mesma disciplina NA MESMA campanha. */
  campaign: Position | null;
  /** Entre os da mesma disciplina em TODAS as campanhas. */
  bank: Position | null;
};

/**
 * Posição da candidatura entre os concorrentes da disciplina.
 *
 * Candidatura sem consolidado fica FORA da contagem — ela não é a última, ela
 * ainda não tem posição. Contá-la inflaria o denominador e daria a quem foi
 * avaliado uma colocação melhor do que a real.
 */
export async function getDisciplinePositions(
  applicationId: string,
  staffUserId: string,
): Promise<DisciplinePositions> {
  const { rows, byApplicationId } = await getScoredApplications(staffUserId);
  const target = byApplicationId.get(applicationId);
  if (!target || target.consolidated === null || !target.disciplineId) {
    return { campaign: null, bank: null };
  }

  const rank = (pool: ScoredApplication[]): Position | null => {
    const scored = pool
      .filter((r) => r.consolidated !== null)
      .sort((a, b) => b.consolidated! - a.consolidated!);
    const index = scored.findIndex((r) => r.applicationId === applicationId);
    if (index === -1) return null;
    return { position: index + 1, total: scored.length };
  };

  const sameDiscipline = rows.filter(
    (r) => r.disciplineId === target.disciplineId,
  );

  return {
    campaign: rank(
      sameDiscipline.filter((r) => r.campaignId === target.campaignId),
    ),
    bank: rank(sameDiscipline),
  };
}

/** `2º de 12` — a forma como a posição aparece na interface. */
export function formatPosition(position: Position | null): string | null {
  if (!position) return null;
  return `${position.position}º de ${position.total}`;
}

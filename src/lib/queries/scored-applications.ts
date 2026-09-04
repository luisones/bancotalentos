import { cache } from "react";
import { disciplineGroupSlug } from "@/lib/discipline-group";
import {
  getCachedApplicationBase,
  getCachedScoringPayload,
} from "./cached-data";
import {
  assembleScoresForApplications,
  foldScoreInputsFromPayload,
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
  /** Coordenada do CEP, para o mini-mapa. `null` quando não há CEP geocodificado. */
  lat: number | null;
  lng: number | null;
  /** Há documento que abre. A URL fica no redirecionador, fora do payload. */
  hasCurriculo: boolean;
  hasVideo: boolean;

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
 * Lista e insumos de nota vêm do Data Cache (tags `application-list` /
 * `scoring-data`). O consolidado cego depende do avaliador e monta em memória.
 *
 * `cache` do React deduplica dentro de um request (Painel + perfil + vizinhos).
 */
export const getScoredApplications = cache(
  async (staffUserId: string): Promise<ScoredIndex> => {
    const [base, payload] = await Promise.all([
      getCachedApplicationBase(),
      getCachedScoringPayload(),
    ]);

    const catalog = payload.catalog;
    const inputs = foldScoreInputsFromPayload(payload);
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
        applicationId: row.applicationId,
        candidateId: row.candidateId,
        candidateName: row.candidateName,
        email: row.email,
        phone: row.phone,
        englishLevel: row.englishLevel,
        quickNote: row.quickNote,
        starred: row.starred,
        status: row.status,
        disciplineId: row.disciplineId,
        disciplineName: row.disciplineName,
        disciplineSlug: row.disciplineSlug,
        campaignId: row.campaignId,
        campaignName: row.campaignName,
        campaignSlug: row.campaignSlug,
        appliedAt: row.appliedAt ? new Date(row.appliedAt) : null,
        postalCode: row.postalCode,
        kmSantoAndre: numberOrNull(row.kmSantoAndre),
        kmSaoCaetano: numberOrNull(row.kmSaoCaetano),
        distanceMode: row.distanceMode,
        distancePrecision: row.distancePrecision,
        lat: numberOrNull(row.lat),
        lng: numberOrNull(row.lng),
        hasCurriculo: row.hasCurriculo,
        hasVideo: row.hasVideo,
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
 *
 * A comparação é pelo GRUPO de disciplina (`discipline-group.ts`), não pela
 * disciplina crua: as duas variantes de Português concorrem pelo mesmo tipo de
 * vaga, e separá-las produzia "1º de 28" onde a realidade é "1º de 91".
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

  const targetGroup = disciplineGroupSlug(target.disciplineSlug);

  const rank = (pool: ScoredApplication[]): Position | null => {
    const scored = pool
      .filter((r) => r.consolidated !== null)
      .sort((a, b) => b.consolidated! - a.consolidated!);
    const index = scored.findIndex((r) => r.applicationId === applicationId);
    if (index === -1) return null;
    return { position: index + 1, total: scored.length };
  };

  const sameDiscipline = rows.filter(
    (r) => disciplineGroupSlug(r.disciplineSlug) === targetGroup,
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

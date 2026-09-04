import { unstable_cache } from "next/cache";
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
import { loadFullScoringPayload } from "./scoring-data";

/** Cache tags — CRM invalida a lista; avaliação/pesos invalidam scores. */
export const APPLICATION_LIST_TAG = "application-list";
export const SCORING_DATA_TAG = "scoring-data";

export type ApplicationBaseRow = {
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
  /** ISO string — Data Cache não guarda Date. */
  appliedAt: string | null;
  postalCode: string | null;
  kmSantoAndre: string | null;
  kmSaoCaetano: string | null;
  distanceMode: string | null;
  distancePrecision: string | null;
};

async function fetchApplicationBase(): Promise<ApplicationBaseRow[]> {
  const rows = await db
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
    .leftJoin(cepDistances, eq(cepDistances.cep, candidates.postalCode))
    .leftJoin(cepLocations, eq(cepLocations.cep, candidates.postalCode))
    .orderBy(asc(candidates.fullName));

  return rows.map((r) => ({
    ...r,
    appliedAt: r.appliedAt ? r.appliedAt.toISOString() : null,
  }));
}

function isMissingIncrementalCache(err: unknown): boolean {
  return (
    err instanceof Error && err.message.includes("incrementalCache missing")
  );
}

/**
 * Lista de candidaturas + CEP. Status/estrela/recado mudam aqui — não as notas.
 *
 * Fora do runtime Next (scripts/bench), cai no fetch direto: `unstable_cache`
 * exige o Incremental Cache do servidor.
 */
const cachedApplicationBase = unstable_cache(
  fetchApplicationBase,
  ["application-base-v1"],
  { tags: [APPLICATION_LIST_TAG], revalidate: 3600 },
);

export async function getCachedApplicationBase(): Promise<ApplicationBaseRow[]> {
  try {
    return await cachedApplicationBase();
  } catch (err) {
    if (isMissingIncrementalCache(err)) return fetchApplicationBase();
    throw err;
  }
}

const cachedScoringPayload = unstable_cache(
  loadFullScoringPayload,
  ["scoring-payload-v1"],
  { tags: [SCORING_DATA_TAG], revalidate: 3600 },
);

export async function getCachedScoringPayload() {
  try {
    return await cachedScoringPayload();
  } catch (err) {
    if (isMissingIncrementalCache(err)) return loadFullScoringPayload();
    throw err;
  }
}

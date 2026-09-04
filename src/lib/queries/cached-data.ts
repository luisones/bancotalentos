import { unstable_cache } from "next/cache";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  applications,
  campaigns,
  candidates,
  cepDistances,
  cepLocations,
  disciplines,
  documents,
} from "@/lib/db/schema";
import { isOpenableUrl } from "@/lib/candidate/document-url";
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
  /** Coordenada do CEP, para o mini-mapa. 569 de 707 candidaturas têm. */
  lat: string | null;
  lng: string | null;
  /**
   * Se HÁ documento que abre — não a URL.
   *
   * O endereço fica no redirecionador (`/api/documento/...`): 707 × 2 URLs
   * seriam ~110KB a mais no payload do Painel para links raramente clicados.
   */
  hasCurriculo: boolean;
  hasVideo: boolean;
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
      lat: cepLocations.lat,
      lng: cepLocations.lng,
    })
    .from(applications)
    .innerJoin(candidates, eq(candidates.id, applications.candidateId))
    .leftJoin(disciplines, eq(disciplines.id, applications.disciplineId))
    .leftJoin(campaigns, eq(campaigns.id, applications.campaignId))
    .leftJoin(cepDistances, eq(cepDistances.cep, candidates.postalCode))
    .leftJoin(cepLocations, eq(cepLocations.cep, candidates.postalCode))
    .orderBy(asc(candidates.fullName));

  // Currículo e vídeo numa consulta própria, e não em dois LEFT JOIN: o join
  // multiplicaria as 707 linhas por documento e obrigaria a deduplicar depois.
  // São no máximo dois documentos por candidatura, um de cada tipo.
  const docs = await db
    .select({
      applicationId: documents.applicationId,
      type: documents.type,
      url: documents.url,
    })
    .from(documents)
    .where(inArray(documents.type, ["curriculo", "video"]));

  const openable = new Set<string>();
  for (const doc of docs) {
    if (isOpenableUrl(doc.url)) openable.add(`${doc.applicationId}:${doc.type}`);
  }

  return rows.map((r) => ({
    ...r,
    appliedAt: r.appliedAt ? r.appliedAt.toISOString() : null,
    hasCurriculo: openable.has(`${r.applicationId}:curriculo`),
    hasVideo: openable.has(`${r.applicationId}:video`),
  }));
}

/**
 * A URL de um documento, resolvida sob demanda pelo redirecionador.
 *
 * Fora do Data Cache de propósito: é um registro só, lido no clique, e cachear
 * 1.400 endereços para servir um deles não paga.
 */
export async function findDocumentUrl(
  applicationId: string,
  type: "curriculo" | "video",
): Promise<string | null> {
  const [doc] = await db
    .select({ url: documents.url })
    .from(documents)
    .where(
      and(
        eq(documents.applicationId, applicationId),
        eq(documents.type, type),
      ),
    )
    .limit(1);

  return isOpenableUrl(doc?.url) ? doc!.url : null;
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
  ["application-base-v5"],
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

import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  applications,
  campaigns,
  candidates,
  disciplines,
} from "@/lib/db/schema";

export type DashboardStats = {
  candidateCount: number;
  applicationCount: number;
  pendingCount: number;
};

export type CampaignCard = {
  id: string;
  name: string;
  slug: string;
  status: string;
  applicationCount: number;
};

export type Pendencia = {
  applicationId: string;
  candidateId: string;
  candidateName: string;
  disciplineName: string | null;
  operationalStatus: string;
  selectiveStatus: string;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const [candidateResult, applicationResult, pendingResult] = await Promise.all(
    [
      db.select({ value: count() }).from(candidates),
      db.select({ value: count() }).from(applications),
      db
        .select({ value: count() })
        .from(applications)
        .where(
          sql`${applications.operationalStatus} IN ('novo', 'avaliacao_pendente', 'aguardando_contato')`,
        ),
    ],
  );

  return {
    candidateCount: candidateResult[0]?.value ?? 0,
    applicationCount: applicationResult[0]?.value ?? 0,
    pendingCount: pendingResult[0]?.value ?? 0,
  };
}

export async function getCampaignCards(): Promise<CampaignCard[]> {
  return db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      slug: campaigns.slug,
      status: campaigns.status,
      applicationCount: count(applications.id),
    })
    .from(campaigns)
    .leftJoin(applications, eq(applications.campaignId, campaigns.id))
    .groupBy(campaigns.id)
    .orderBy(desc(campaigns.createdAt));
}

export async function getPendencias(limit = 10): Promise<Pendencia[]> {
  const rows = await db
    .select({
      applicationId: applications.id,
      candidateId: candidates.id,
      candidateName: candidates.fullName,
      disciplineName: disciplines.name,
      operationalStatus: applications.operationalStatus,
      selectiveStatus: applications.selectiveStatus,
    })
    .from(applications)
    .innerJoin(candidates, eq(candidates.id, applications.candidateId))
    .leftJoin(disciplines, eq(disciplines.id, applications.disciplineId))
    .where(
      sql`${applications.operationalStatus} IN ('novo', 'avaliacao_pendente', 'aguardando_contato', 'entrevista_a_agendar', 'aula_teste_a_agendar')`,
    )
    .orderBy(desc(applications.createdAt))
    .limit(limit);

  return rows;
}

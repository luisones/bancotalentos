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
  const [candidateResult] = await db.select({ value: count() }).from(candidates);
  const [applicationResult] = await db
    .select({ value: count() })
    .from(applications);
  const [pendingResult] = await db
    .select({ value: count() })
    .from(applications)
    .where(
      sql`${applications.operationalStatus} IN ('novo', 'avaliacao_pendente', 'aguardando_contato')`,
    );

  return {
    candidateCount: candidateResult?.value ?? 0,
    applicationCount: applicationResult?.value ?? 0,
    pendingCount: pendingResult?.value ?? 0,
  };
}

export async function getCampaignCards(): Promise<CampaignCard[]> {
  const allCampaigns = await db
    .select()
    .from(campaigns)
    .orderBy(desc(campaigns.createdAt));

  const cards: CampaignCard[] = [];
  for (const campaign of allCampaigns) {
    const [appCount] = await db
      .select({ value: count() })
      .from(applications)
      .where(eq(applications.campaignId, campaign.id));
    cards.push({
      id: campaign.id,
      name: campaign.name,
      slug: campaign.slug,
      status: campaign.status,
      applicationCount: appCount?.value ?? 0,
    });
  }
  return cards;
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

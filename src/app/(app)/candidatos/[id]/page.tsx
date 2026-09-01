import { notFound } from "next/navigation";
import { ProfileTabs } from "@/components/candidate/profile-tabs";
import { canWrite, requireStaff } from "@/lib/auth/staff";
import { getCandidateProfile } from "@/lib/queries/candidate";
import {
  getRankingNeighborIds,
  type RankingFilters,
} from "@/lib/queries/ranking";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CandidateProfilePage({
  params,
  searchParams,
}: PageProps) {
  const staff = await requireStaff();
  const { id } = await params;
  const query = await searchParams;

  const profile = await getCandidateProfile(id, staff.id);
  if (!profile) notFound();

  const rankingFilters: RankingFilters = {
    campaign: typeof query.campaign === "string" ? query.campaign : undefined,
    discipline:
      typeof query.discipline === "string" ? query.discipline : undefined,
    search: typeof query.search === "string" ? query.search : undefined,
    sort: typeof query.sort === "string" ? query.sort : "score",
    order: typeof query.order === "string" ? query.order : "desc",
  };

  const rankingQuery = new URLSearchParams(
    Object.fromEntries(
      Object.entries(rankingFilters).filter(([, v]) => v !== undefined),
    ) as Record<string, string>,
  ).toString();

  const neighbors =
    query.fromRanking === "1"
      ? await getRankingNeighborIds(id, rankingFilters, staff.id)
      : { prevId: null, nextId: null };

  const primaryAppId = profile.primaryApp?.id;
  const primaryDocs = primaryAppId
    ? profile.documentsByApp[primaryAppId] ?? []
    : [];
  const primaryScores = primaryAppId
    ? profile.scoresByApp[primaryAppId] ?? null
    : null;
  const primaryEvals = primaryAppId
    ? profile.evalsByApp[primaryAppId] ?? []
    : [];

  return (
    <ProfileTabs
      candidate={profile.candidate}
      primaryApp={profile.primaryApp}
      applications={profile.applications}
      documents={primaryDocs}
      scores={primaryScores}
      evaluations={primaryEvals}
      subjectiveAnswers={profile.subjectiveAnswers}
      schedules={profile.schedules}
      lessonTests={profile.lessonTests}
      practiceScores={profile.practiceScores}
      interests={profile.interests}
      potentials={profile.potentials}
      tags={profile.tags}
      notes={profile.notes}
      contacts={profile.contacts}
      history={profile.history}
      dimensions={profile.dimensions}
      canWrite={canWrite(staff)}
      staffUserId={staff.id}
      prevId={neighbors.prevId}
      nextId={neighbors.nextId}
      rankingQuery={rankingQuery}
    />
  );
}

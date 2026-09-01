import Link from "next/link";
import { requireStaff } from "@/lib/auth/staff";
import { dimensionLabels, labelFor } from "@/lib/labels";
import { getCandidatesByIds } from "@/lib/queries/candidate";
import { buildDimensionScoresForApplication } from "@/lib/queries/scoring-data";
import { db } from "@/lib/db";
import { applications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { formatScore } from "@/lib/scoring";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CompararPage({ searchParams }: PageProps) {
  const staff = await requireStaff();
  const params = await searchParams;
  const idsParam = typeof params.ids === "string" ? params.ids : "";
  const ids = idsParam.split(",").filter(Boolean).slice(0, 5);

  const candidates = await getCandidatesByIds(ids);

  const candidateData = await Promise.all(
    candidates.map(async (c) => {
      const [app] = await db
        .select()
        .from(applications)
        .where(eq(applications.candidateId, c.id))
        .limit(1);
      const scores = app
        ? await buildDimensionScoresForApplication(app.id, {
            staffUserId: staff.id,
          })
        : null;
      return { candidate: c, scores };
    }),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[var(--liceu-navy)]">
          Comparar candidatos
        </h1>
        <p className="text-sm text-muted-foreground">
          Selecione 2 a 5 candidatos via parâmetro{" "}
          <code className="text-xs">?ids=uuid1,uuid2</code> na URL.
        </p>
      </div>

      {candidateData.length < 2 ? (
        <div className="liceu-card p-6 text-center text-muted-foreground">
          <p>Adicione pelo menos 2 IDs de candidatos na URL para comparar.</p>
          <Link
            href="/ranking"
            className="mt-2 inline-block text-sm font-medium text-[var(--liceu-navy)] hover:underline"
          >
            Voltar ao ranking
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="liceu-table w-full min-w-[600px]">
            <thead>
              <tr>
                <th>Dimensão</th>
                {candidateData.map((d) => (
                  <th key={d.candidate.id} className="text-center">
                    <Link
                      href={`/candidatos/${d.candidate.id}`}
                      className="hover:underline"
                    >
                      {d.candidate.fullName}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="font-medium">
                <td>Consolidada</td>
                {candidateData.map((d) => (
                  <td key={d.candidate.id} className="text-center tabular-nums">
                    {formatScore(d.scores?.consolidated ?? null)}
                  </td>
                ))}
              </tr>
              <tr>
                <td>Cobertura</td>
                {candidateData.map((d) => (
                  <td key={d.candidate.id} className="text-center tabular-nums">
                    {d.scores
                      ? `${d.scores.coverage}/${d.scores.totalDimensions}`
                      : "—"}
                  </td>
                ))}
              </tr>
              {candidateData[0]?.scores?.dimensionScores.map((dim) => (
                <tr key={dim.code}>
                  <td>{labelFor(dimensionLabels, dim.code)}</td>
                  {candidateData.map((d) => {
                    const score = d.scores?.dimensionScores.find(
                      (s) => s.code === dim.code,
                    );
                    return (
                      <td
                        key={d.candidate.id}
                        className="text-center tabular-nums"
                      >
                        {formatScore(score?.score ?? null)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

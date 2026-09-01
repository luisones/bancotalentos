import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  labelFor,
  operationalStatusLabels,
  selectiveStatusLabels,
} from "@/lib/labels";
import {
  getCampaignCards,
  getDashboardStats,
  getPendencias,
} from "@/lib/queries/dashboard";

export default async function DashboardPage() {
  const [stats, campaigns, pendencias] = await Promise.all([
    getDashboardStats(),
    getCampaignCards(),
    getPendencias(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[var(--liceu-navy)]">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Visão geral do Banco de Talentos Docentes
        </p>
      </div>

      <div className="liceu-kpi-strip">
        <div className="liceu-kpi">
          <span className="liceu-kpi-label">Candidatos</span>
          <span className="liceu-kpi-value tabular-nums">
            {stats.candidateCount.toLocaleString("pt-BR")}
          </span>
        </div>
        <div className="liceu-kpi">
          <span className="liceu-kpi-label">Candidaturas</span>
          <span className="liceu-kpi-value tabular-nums">
            {stats.applicationCount.toLocaleString("pt-BR")}
          </span>
        </div>
        <div className="liceu-kpi">
          <span className="liceu-kpi-label">Pendentes</span>
          <span className="liceu-kpi-value tabular-nums">
            {stats.pendingCount.toLocaleString("pt-BR")}
          </span>
        </div>
        <div className="liceu-kpi">
          <span className="liceu-kpi-label">Campanhas</span>
          <span className="liceu-kpi-value tabular-nums">
            {campaigns.length.toLocaleString("pt-BR")}
          </span>
        </div>
      </div>

      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold text-[var(--liceu-navy)]">
          Campanhas
        </h2>
        {campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma campanha cadastrada.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c) => (
              <Link
                key={c.id}
                href={`/ranking?campaign=${c.slug}`}
                className="liceu-card block p-4 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-heading font-semibold text-[var(--liceu-navy)]">
                    {c.name}
                  </h3>
                  <Badge variant="outline">{c.status}</Badge>
                </div>
                <p className="mt-2 text-sm tabular-nums text-muted-foreground">
                  {c.applicationCount} candidatura
                  {c.applicationCount !== 1 ? "s" : ""}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-heading text-lg font-semibold text-[var(--liceu-navy)]">
          Pendências
        </h2>
        {pendencias.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma pendência no momento.
          </p>
        ) : (
          <div className="liceu-card overflow-hidden">
            <table className="liceu-table w-full">
              <thead>
                <tr>
                  <th>Candidato</th>
                  <th>Disciplina</th>
                  <th>Status operacional</th>
                  <th>Status seletivo</th>
                </tr>
              </thead>
              <tbody>
                {pendencias.map((p) => (
                  <tr key={p.applicationId}>
                    <td>
                      <Link
                        href={`/candidatos/${p.candidateId}`}
                        className="font-medium text-[var(--liceu-navy)] hover:underline"
                      >
                        {p.candidateName}
                      </Link>
                    </td>
                    <td>{p.disciplineName ?? "—"}</td>
                    <td>
                      {labelFor(operationalStatusLabels, p.operationalStatus)}
                    </td>
                    <td>
                      {labelFor(selectiveStatusLabels, p.selectiveStatus)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

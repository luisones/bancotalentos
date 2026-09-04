import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import type { ProfileViewModel } from "@/lib/types/candidate-profile";
import { ApplicationSwitcher } from "./application-switcher";
import { IdentityCard } from "./identity-card";
import { MaterialsPanel } from "./materials-panel";
import { ScoresPanel } from "./scores-panel";

/**
 * Perfil do candidato.
 *
 * Server Component: recebe o view model já derivado e compõe quatro faixas, na
 * ordem em que a decisão é tomada — quem é, o que fez, quanto tirou, o que a
 * equipe registra. O acordeão de dez seções, a faixa de pontos de atenção, a
 * tira de KPIs e a coluna de apoio saíram: eram sete superfícies para
 * apresentar informação que cabe em quatro.
 *
 * O único JS de cliente é o que escreve: status, estrela, nota rápida, nota de
 * dimensão, override por pergunta e observação. Os detalhes abrem com
 * `<details>`, sem JS nenhum.
 */
export function CandidateProfile({
  vm,
  neighbors,
  rankingQuery,
}: {
  vm: ProfileViewModel;
  neighbors: { prevId: string | null; nextId: string | null };
  rankingQuery: string;
}) {
  const { identity, focused, candidateId } = vm;
  const suffix = rankingQuery ? `?fromRanking=1&${rankingQuery}` : "";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumb={[
          { label: "Painel", href: rankingQuery ? `/?${rankingQuery}` : "/" },
          { label: identity.name },
        ]}
        right={
          <div className="flex items-center gap-4">
            {(neighbors.prevId || neighbors.nextId) && (
              <nav
                aria-label="Navegar no Painel"
                className="text-dense flex items-center gap-3"
              >
                {neighbors.prevId ? (
                  <Link
                    href={`/candidatos/${neighbors.prevId}${suffix}`}
                    className="text-navy hover:text-gold-text"
                  >
                    ← Anterior
                  </Link>
                ) : (
                  <span className="text-subtle">← Anterior</span>
                )}
                {neighbors.nextId ? (
                  <Link
                    href={`/candidatos/${neighbors.nextId}${suffix}`}
                    className="text-navy hover:text-gold-text"
                  >
                    Próximo →
                  </Link>
                ) : (
                  <span className="text-subtle">Próximo →</span>
                )}
              </nav>
            )}
            <Button size="sm" variant="outline" asChild>
              <Link href={`/candidatos/${candidateId}/impressao`}>
                Imprimir…
              </Link>
            </Button>
          </div>
        }
      />

      <IdentityCard vm={vm} />

      <ApplicationSwitcher
        candidateId={candidateId}
        applications={vm.applications}
        focusedId={focused?.applicationId ?? null}
        extraQuery={rankingQuery}
      />

      <ScoresPanel vm={vm} applicationId={focused?.applicationId ?? null} />

      <MaterialsPanel vm={vm} applicationId={focused?.applicationId ?? null} />
    </div>
  );
}

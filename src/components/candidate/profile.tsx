import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import type { ProfileViewModel } from "@/lib/types/candidate-profile";
import { ApplicationSwitcher } from "./application-switcher";
import { IdentityCard } from "./identity-card";
import { InterviewDialog } from "./interview-dialog";
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
      {/*
        Cabeçalho numa faixa só.

        `PageHeader` sem `title` agora põe `right` na linha do breadcrumb: o
        nome do candidato é o h1 do cartão de identidade, então havia uma
        segunda faixa existindo apenas para as ações — breadcrumb sozinho numa
        linha, anterior/próximo e Imprimir noutra, antes do primeiro dado.
      */}
      <PageHeader
        breadcrumb={[
          { label: "Painel", href: rankingQuery ? `/?${rankingQuery}` : "/" },
          { label: identity.name },
        ]}
        right={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
            <InterviewDialog
              candidateId={candidateId}
              applicationId={focused?.applicationId}
              candidateName={identity.name}
              canWrite={vm.viewer.canWrite}
            />
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

      {/* Props explícitas, e não o `vm` inteiro: `ScoresPanel` é client, e
          mandar o view model todo serializaria para o navegador as 19 práticas
          e as observações da equipe, que quem renderiza são outros painéis. */}
      <ScoresPanel
        candidateId={candidateId}
        candidateName={identity.name}
        canWrite={vm.viewer.canWrite}
        scores={{
          consolidated: vm.scores.consolidated,
          display: vm.scores.display,
          coverage: vm.scores.coverage,
          totalDimensions: vm.scores.totalDimensions,
          cards: vm.scores.cards,
          answers: vm.scores.answers,
        }}
        video={{
          videoUrl: vm.materials.videoUrl,
          videoDimensionId: vm.materials.videoDimensionId,
          videoOwn: vm.materials.videoOwn,
        }}
        applicationId={focused?.applicationId ?? null}
      />

      <MaterialsPanel vm={vm} applicationId={focused?.applicationId ?? null} />
    </div>
  );
}

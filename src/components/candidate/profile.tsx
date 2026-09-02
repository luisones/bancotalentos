import Link from "next/link";
import { Kpi, KpiStrip } from "@/components/liceu/kpi-strip";
import {
  ExpandAllControls,
  SectionAccordion,
} from "@/components/liceu/section-accordion";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import type { ProfileViewModel } from "@/lib/types/candidate-profile";
import { ApplicationSwitcher } from "./application-switcher";
import { AttentionBand } from "./attention-band";
import { ContactDialog, NoteDialog, StatusDialog, ClassificationDialog } from "./crm-actions";
import { IdentityCard } from "./identity-card";
import {
  AuditoriaSection,
  AvaliacaoSection,
  CandidaturaSection,
  ContatosSection,
  EtapasSection,
  HistoricoSection,
  MateriaisSection,
  ObservacoesSection,
  PraticasSection,
  RespostasSection,
} from "./profile-sections";
import { SupportColumn } from "./support-column";

/** Ordem de renderização das seções, para Expandir/Recolher tudo. */
const SECTION_IDS = [
  "secao-avaliacao",
  "secao-materiais",
  "secao-respostas",
  "secao-etapas",
  "secao-praticas",
  "secao-candidatura",
  "secao-historico",
  "secao-contatos",
  "secao-observacoes",
  "secao-auditoria",
];

/**
 * Perfil do candidato.
 *
 * Server Component: recebe o view model já derivado e compõe. As 22 props de
 * ProfileTabs viraram uma. O único JS de cliente é a casca do acordeão, os
 * diálogos e a edição de nota — nunca os dados.
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
  const { identity: id, viewer, focused, candidateId } = vm;
  const suffix = rankingQuery ? `?fromRanking=1&${rankingQuery}` : "";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumb={[
          { label: "Ranking", href: `/ranking?${rankingQuery}` },
          ...(focused ? [{ label: focused.label }] : []),
          { label: id.name },
        ]}
        right={
          (neighbors.prevId || neighbors.nextId) && (
            <nav
              aria-label="Navegar no ranking"
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
          )
        }
      />

      <AttentionBand points={vm.attention} />

      <IdentityCard
        eyebrow={id.eyebrow}
        name={id.name}
        quickNote={id.quickNote}
        quickNoteAuthorship={id.quickNoteAuthorship}
        candidateId={candidateId}
        canWrite={viewer.canWrite}
        chips={id.chips}
        selective={{
          label: id.selective.label,
          tone: id.selective.tone,
          action:
            viewer.canWrite && focused ? (
              <StatusDialog
                candidateId={candidateId}
                applicationId={focused.applicationId}
                applicationLabel={focused.label}
                kind="selective"
                current={vm.application.selectiveStatus}
                trigger={
                  <button className="text-tag mt-1 block cursor-pointer font-semibold text-gold-text hover:underline">
                    alterar decisão →
                  </button>
                }
              />
            ) : undefined,
        }}
        operational={{
          label: id.operational.label,
          action:
            viewer.canWrite && focused ? (
              <StatusDialog
                candidateId={candidateId}
                applicationId={focused.applicationId}
                applicationLabel={focused.label}
                kind="operational"
                current={vm.application.operationalStatus}
                trigger={
                  <button className="text-tag mt-1 block cursor-pointer font-semibold text-gold-text hover:underline">
                    avançar etapa →
                  </button>
                }
              />
            ) : undefined,
        }}
        classification={{
          label: id.classification.label,
          action: viewer.canWrite ? (
            <ClassificationDialog
              candidateId={candidateId}
              current={id.classification.raw}
              trigger={
                <button className="text-tag mt-1 block cursor-pointer font-semibold text-gold-text hover:underline">
                  reclassificar →
                </button>
              }
            />
          ) : undefined,
        }}
        contact={
          <div className="flex flex-col gap-0.5">
            {id.email ? (
              <a
                href={`mailto:${id.email}`}
                className="text-cell truncate font-semibold text-navy hover:underline"
              >
                {id.email}
              </a>
            ) : (
              <span className="text-cell text-subtle">Sem e-mail</span>
            )}
            {id.phone ? (
              <span className="text-cell flex items-center gap-2">
                {id.phone}
                {id.whatsappUrl && (
                  <a
                    href={id.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-meta rounded-chip border border-chip-border bg-chip-bg px-1.5 py-px font-semibold text-ink-3 hover:border-positive-border hover:text-positive"
                  >
                    WhatsApp ↗
                  </a>
                )}
              </span>
            ) : (
              <span className="text-cell text-subtle">Sem telefone</span>
            )}
            <Link
              href="#secao-contatos"
              className="text-tag mt-1 font-semibold text-gold-text hover:underline"
            >
              histórico de contatos →
            </Link>
          </div>
        }
        actions={
          <>
            {viewer.canWrite && focused && (
              <Button size="stack" asChild>
                <a href="#secao-avaliacao">
                  {vm.evaluation.ownPending.length > 0
                    ? `Avaliar candidato · ${vm.evaluation.ownPending.length} pendentes`
                    : "Revisar minhas notas"}
                </a>
              </Button>
            )}
            {viewer.canWrite && (
              <>
                <ContactDialog
                  candidateId={candidateId}
                  applicationId={focused?.applicationId}
                  trigger={
                    <Button size="stack" variant="outline">
                      Registrar contato
                    </Button>
                  }
                />
                <NoteDialog
                  candidateId={candidateId}
                  applicationId={focused?.applicationId}
                  trigger={
                    <Button size="stack" variant="outline">
                      Escrever observação
                    </Button>
                  }
                />
              </>
            )}
            <Button size="stack" variant="gold" asChild>
              <Link href={`/candidatos/${candidateId}/impressao`}>
                Montar impressão…
              </Link>
            </Button>
          </>
        }
        footnote={id.footnote ?? undefined}
      />

      <KpiStrip>
        {vm.kpis.map((k) => (
          <Kpi key={k.label} {...k} />
        ))}
      </KpiStrip>

      <p className="text-meta max-w-3xl text-subtle">
        O resultado consolidado pondera apenas as dimensões presentes.{" "}
        <strong className="font-semibold">
          Dimensão ausente não conta como zero
        </strong>{" "}
        — por isso ele sempre vem acompanhado da cobertura.
      </p>

      <ApplicationSwitcher
        candidateId={candidateId}
        applications={vm.applications}
        focusedId={focused?.applicationId ?? null}
        extraQuery={rankingQuery}
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_var(--spacing-rail)]">
        <div className="min-w-0">
          <SectionAccordion
            sections={SECTION_IDS}
            defaultOpen={vm.defaultOpen}
          >
            <ExpandAllControls />
            <AvaliacaoSection vm={vm} />
            <MateriaisSection vm={vm} />
            <RespostasSection vm={vm} />
            <EtapasSection vm={vm} />
            <PraticasSection vm={vm} />
            <CandidaturaSection vm={vm} />
            <HistoricoSection vm={vm} />
            <ContatosSection vm={vm} />
            <ObservacoesSection vm={vm} />
            <AuditoriaSection vm={vm} />
          </SectionAccordion>
        </div>

        {/* Em telas menores o rail é RELOCADO, não escondido — some ao fim
            da coluna única em vez de desaparecer. */}
        <div className="lg:sticky lg:top-[calc(var(--spacing-header)+18px)]">
          <SupportColumn vm={vm} />
        </div>
      </div>
    </div>
  );
}

import { MeterBar } from "@/components/liceu/meter";
import { Panel, PanelHeader } from "@/components/liceu/surface";
import type { ProfileViewModel } from "@/lib/types/candidate-profile";

/**
 * Coluna de apoio — o substituto DETERMINÍSTICO dos painéis "✦" da referência.
 *
 * Nenhuma IA. Estes três cards tornam visíveis as regras 9 e 10, que é o que
 * separa um número honesto de um veredito: quem avaliou o quê, de onde cada
 * nota vem, e quais pesos estão em vigor.
 */
export function SupportColumn({ vm }: { vm: ProfileViewModel }) {
  const { evaluation: e } = vm;

  return (
    <div className="flex flex-col gap-4">
      <Panel padding="none">
        <PanelHeader
          eyebrow="Cobertura da avaliação"
          right={`${e.coverage}/${e.totalDimensions}`}
        />
        <ul className="px-4 py-3">
          {e.dimensions.map((d) => (
            <li key={d.dimensionId} className="py-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-cell min-w-0 truncate">{d.name}</span>
              </div>
              <MeterBar
                value={d.score}
                display={d.display}
                tone={d.tone}
                className="mt-1"
              />
              <p className="text-meta mt-0.5 text-subtle">{d.originLabel}</p>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel padding="none">
        <PanelHeader eyebrow="Procedência dos dados" />
        <ul className="px-4 py-3">
          {vm.materials.documents.length > 0 && (
            <Row
              label="Materiais anexados"
              value={`${vm.materials.documents.length} arquivo${vm.materials.documents.length === 1 ? "" : "s"}`}
            />
          )}
          <Row
            label="Avaliações internas"
            value={`${e.dimensions.reduce((a, d) => a + d.evaluatorCount, 0)} registros`}
          />
          <Row
            label="Respostas do processo"
            value={`${vm.answers.items.length}`}
          />
          <Row
            label="Práticas importadas"
            value={`${vm.practices.items.length}`}
          />
          <Row label="Eventos de auditoria" value={`${vm.audit.items.length}`} />
        </ul>
      </Panel>

      <Panel padding="none">
        <PanelHeader eyebrow="Metodologia" />
        <div className="px-4 py-3">
          {e.totalDimensions === 0 ? (
            <p className="text-note leading-relaxed text-alert">
              Nenhuma configuração de pesos cadastrada. Sem pesos, não há
              consolidado.
            </p>
          ) : (
            <p className="text-note leading-relaxed text-muted-foreground">
              O consolidado é a média ponderada das{" "}
              <strong className="font-semibold">{e.coverage}</strong> dimensões
              presentes, com os pesos renormalizados entre elas. As{" "}
              {e.totalDimensions - e.coverage} ausentes ficam fora do cálculo e
              não valem zero.
            </p>
          )}
          <a
            href="/admin/pesos"
            className="text-tag mt-2 inline-block font-semibold text-gold-text hover:underline"
          >
            Ver pesos vigentes →
          </a>
        </div>
      </Panel>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-baseline justify-between gap-3 border-b border-rule-weak py-1.5 last:border-0">
      <span className="text-cell min-w-0">{label}</span>
      <span data-numeric className="text-note shrink-0 font-semibold text-ink-3">
        {value}
      </span>
    </li>
  );
}

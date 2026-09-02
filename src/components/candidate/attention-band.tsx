import Link from "next/link";
import { StateBadge } from "@/components/liceu/chip";
import { Panel, PanelHeader } from "@/components/liceu/surface";
import type { AttentionPoint } from "@/lib/candidate/attention-points";

/**
 * Faixa de pontos de atenção.
 *
 * Quando nenhuma regra dispara, NÃO renderiza — nada de "nenhum alerta". Uma
 * faixa vazia treina o olho a ignorar aquela região da tela.
 *
 * Usa flex-wrap e não grid auto-fit: com auto-fit, 3 tiles em 2 colunas deixam
 * uma célula vazia pintando um bloco cinza, que é o "bento sem ritmo".
 */
export function AttentionBand({ points }: { points: AttentionPoint[] }) {
  if (points.length === 0) return null;

  return (
    <Panel accent="alert" padding="none">
      <PanelHeader
        eyebrow="Pontos de atenção"
        eyebrowTone="alert"
        right={`${points.length} ${points.length === 1 ? "pendência" : "pendências"}`}
      />
      <ul className="flex flex-wrap">
        {points.map((p) => (
          <li
            key={p.id}
            className="min-w-[240px] flex-1 border-b border-r border-rule last:border-r-0"
          >
            <Link
              href={p.href}
              className="block h-full px-4 py-3.5 hover:bg-row-hover"
            >
              <StateBadge tone={p.tone} dot>
                {p.tag}
              </StateBadge>
              <p className="text-row mt-1.5 font-semibold leading-tight">
                {p.title}
              </p>
              <p className="text-note mt-0.5 leading-snug text-muted-foreground">
                {p.detail}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

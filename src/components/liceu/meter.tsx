import { cn } from "@/lib/utils";
import { toneFg, toneSpine, type Tone } from "@/lib/tone";

/*
  As DUAS únicas formas de gráfico deste produto.

  MeterBar: um valor contra uma escala conhecida (0–10 de uma dimensão).
  ColumnChart: dispersão entre avaliadores, e só com n >= 3.

  Qualquer outra coisa é um DataGrid. Um valor único nunca é gráfico — é um Kpi.
  E nenhum gráfico é a única representação: sempre acompanha a tabela com os
  mesmos números, porque a pergunta operacional ("quem deu quanto") é
  respondida pela tabela, não pela figura.

  Sem gradiente, sem sombra, sem 3D, sem animação. Cor semântica, nunca
  paleta categórica. Número sempre impresso ao lado.
*/

export function MeterBar({
  value,
  max = 10,
  tone = "navy",
  display,
  marker,
  markerLabel,
  className,
}: {
  value: number | null;
  max?: number;
  tone?: Tone;
  /** Número formatado pelo domínio. Obrigatório: a barra nunca fala só. */
  display: string;
  /** Referência no trilho, ex.: mediana da coorte. */
  marker?: number;
  markerLabel?: string;
  className?: string;
}) {
  const pct =
    value === null ? 0 : Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-bar bg-ground">
        {value === null ? (
          // Sem avaliação é visualmente distinto de nota zero: trilho
          // tracejado vazio, não barra cheia de largura zero.
          <div className="h-full w-full border border-dashed border-rule-strong" />
        ) : (
          <div
            className={cn("h-full rounded-bar", toneSpine[tone])}
            style={{ width: `${pct}%` }}
          />
        )}
        {marker !== undefined && (
          <span
            aria-hidden
            title={markerLabel}
            className="absolute inset-y-0 w-px bg-ink-3"
            style={{ left: `${Math.max(0, Math.min(100, (marker / max) * 100))}%` }}
          />
        )}
      </div>
      <span
        data-numeric
        className={cn(
          "text-cell w-10 shrink-0 text-right font-semibold",
          value === null ? "text-subtle" : toneFg[tone],
        )}
      >
        {display}
      </span>
    </div>
  );
}

export function ColumnChart({
  series,
  max,
  unit,
  height = 74,
  className,
}: {
  series: Array<{
    label: string;
    sub?: string;
    value: number;
    /** Número formatado. Separado de `value` de propósito. */
    display: string;
    tone?: Tone;
  }>;
  max: number;
  /** Obrigatório: o leitor precisa saber o que as colunas são. */
  unit: string;
  height?: number;
  className?: string;
}) {
  // Abaixo de 3 pontos, uma tabela comunica melhor que uma figura.
  if (series.length < 3) return null;

  return (
    <div className={className}>
      <div className="text-meta mb-2 text-subtle">{unit}</div>
      <div
        className="grid items-end gap-3"
        style={{
          gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))`,
        }}
      >
        {series.map((s) => (
          <div key={s.label} className="flex h-full flex-col justify-end gap-1.5">
            <div
              data-numeric
              className={cn(
                "font-heading text-cell text-center font-bold",
                toneFg[s.tone ?? "navy"],
              )}
            >
              {s.display}
            </div>
            <div className="flex items-end" style={{ height }}>
              <div
                className={cn("w-full rounded-t-bar", toneSpine[s.tone ?? "navy"])}
                style={{
                  height: `${Math.max(1, Math.min(100, (s.value / max) * 100))}%`,
                }}
              />
            </div>
            <div className="border-t border-rule-strong pt-1.5 text-center">
              <div className="text-tag font-semibold">{s.label}</div>
              {s.sub && <div className="text-meta text-subtle">{s.sub}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Caixa de insight. `source` é obrigatória: na referência estas caixas
 * continham prosa gerada por IA. Sem IA, cada uma tem de ser derivação
 * determinística e dizer de onde vem — a prop obrigatória é a trava de API
 * contra afirmação sem procedência.
 */
export function NoteBox({
  tone,
  source,
  children,
  className,
}: {
  tone: Tone;
  source: string;
  children: React.ReactNode;
  className?: string;
}) {
  const bg = {
    navy: "bg-info-bg border-l-navy",
    gold: "bg-gold-bg border-l-gold-text",
    alert: "bg-alert-bg border-l-alert",
    positive: "bg-positive-bg border-l-positive",
    neutral: "bg-neutral-bg border-l-neutral-fg",
  }[tone];

  return (
    <div className={cn("border-l-[3px] px-3 py-2.5", bg, className)}>
      <p className="text-note leading-relaxed text-muted-foreground">
        {children}
      </p>
      <p className="text-meta mt-1.5 text-subtle">{source}</p>
    </div>
  );
}

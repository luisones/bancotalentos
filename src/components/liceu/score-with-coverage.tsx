import { cn } from "@/lib/utils";
import { formatScore } from "@/lib/scoring";
import { toneFg, type Tone } from "@/lib/tone";

/**
 * Nota consolidada — SEMPRE acompanhada da cobertura.
 *
 * Este é o único componente do sistema que renderiza consolidado, e ele não
 * aceita cobertura opcional. A regra 10 ("consolidado sempre com cobertura")
 * fica estruturalmente impossível de violar, e a regra 9 ("dimensão ausente
 * não conta como zero") fica visível: `null` nunca vira 0,0.
 */
export function ScoreWithCoverage({
  consolidated,
  coverage,
  totalDimensions,
  missing = [],
  size = "inline",
  className,
}: {
  consolidated: number | null;
  coverage: number;
  totalDimensions: number;
  /** Dimensões com peso mas sem nota. */
  missing?: string[];
  size?: "kpi" | "inline" | "cell";
  className?: string;
}) {
  const tone = coverageTone(coverage, totalDimensions);
  const empty = consolidated === null;

  if (size === "cell") {
    return (
      <span className={cn("inline-flex items-baseline gap-1.5", className)}>
        <span
          data-numeric
          className={cn(
            "font-heading text-row font-bold",
            empty ? "text-subtle" : "text-navy",
          )}
        >
          {formatScore(consolidated)}
        </span>
        <span data-numeric className={cn("text-meta", toneFg[tone])}>
          {coverage}/{totalDimensions}
        </span>
      </span>
    );
  }

  const valueClass =
    size === "kpi"
      ? "font-heading text-metric font-bold tracking-[-0.02em]"
      : "font-heading text-display-sm font-bold";

  return (
    <div className={className}>
      <div
        data-numeric
        className={cn(valueClass, empty ? "text-subtle" : "text-navy")}
      >
        {formatScore(consolidated)}
      </div>
      <div className="text-note mt-[7px] font-semibold">
        Resultado consolidado
      </div>
      <div className={cn("text-meta mt-0.5", toneFg[tone])}>
        {empty
          ? "sem dimensões avaliadas"
          : `sobre ${coverage} de ${totalDimensions} dimensões`}
      </div>
      {missing.length > 0 && (
        <div className="text-meta mt-1 text-subtle">
          Sem avaliação: {missing.join(", ")}
        </div>
      )}
    </div>
  );
}

function coverageTone(coverage: number, total: number): Tone {
  if (total === 0 || coverage === 0) return "alert";
  if (coverage >= total) return "positive";
  if (coverage * 2 < total) return "alert";
  return "gold";
}

/**
 * Classificação qualitativa de talento.
 *
 * Deliberadamente separado de ScoreWithCoverage e tipograficamente distinto:
 * Source Sans, tinto gold, sem numerais tabulares. A regra 17 ("resultado
 * numérico ≠ classificação qualitativa") tem de ser legível num relance.
 * Os dois nunca compartilham linha sem divisor.
 */
export function TalentClassification({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-cell inline-flex items-center gap-1.5 font-semibold text-gold-text",
        className,
      )}
    >
      <span aria-hidden>★</span>
      {label}
    </span>
  );
}

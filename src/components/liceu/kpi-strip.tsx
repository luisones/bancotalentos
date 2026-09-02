import { cn } from "@/lib/utils";
import { toneFg, type Tone } from "@/lib/tone";

/**
 * Faixa de KPIs com hairlines feitas por `gap: 1px` sobre o fundo, não por
 * border — é por isso que rule-strong precisa ser o mesmo token nos dois usos.
 */
export function KpiStrip({
  children,
  min = 152,
  className,
}: {
  children: React.ReactNode;
  /** Piso do minmax em px. */
  min?: number;
  className?: string;
}) {
  return (
    <div
      style={{ ["--kpi-min" as string]: `${min}px` }}
      className={cn(
        "grid gap-px overflow-hidden rounded-panel border border-rule-strong bg-rule-strong",
        "[grid-template-columns:repeat(auto-fit,minmax(var(--kpi-min),1fr))]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Kpi({
  value,
  label,
  note,
  tone = "navy",
}: {
  /** Já formatado pelo domínio (formatScore). O componente nunca formata. */
  value: string;
  label: string;
  /** Deve acrescentar comparação ou ressalva. Nunca timestamp decorativo. */
  note?: string;
  tone?: Tone;
}) {
  return (
    <div className="bg-card px-[18px] py-4">
      <div
        data-numeric
        className={cn(
          "font-heading text-metric font-bold tracking-[-0.02em]",
          toneFg[tone],
        )}
      >
        {value}
      </div>
      <div className="text-note mt-[7px] font-semibold">{label}</div>
      {note && <div className="text-meta mt-0.5 text-subtle">{note}</div>}
    </div>
  );
}

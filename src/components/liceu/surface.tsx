import { cn } from "@/lib/utils";
import { toneBorderLeft, toneFg, type Tone } from "@/lib/tone";

const padding = {
  none: "",
  tight: "px-4 py-3",
  default: "px-[26px] py-6",
} as const;

type PanelProps = {
  children: React.ReactNode;
  /** Faixa de destaque de 4px à esquerda, semântica. */
  accent?: Tone;
  /** "none" para corpos de grid/lista, que controlam o próprio padding. */
  padding?: keyof typeof padding;
  className?: string;
};

/**
 * Superfície única do sistema.
 *
 * Regra dura: nenhum Panel dentro de Panel. Agrupamento dentro de um corpo é
 * expresso por hairline, micro-header e grid — não por caixa aninhada.
 */
export function Panel({
  children,
  accent,
  padding: pad = "default",
  className,
}: PanelProps) {
  return (
    <div
      className={cn(
        "rounded-panel border border-rule-strong bg-card",
        accent && cn("border-l-4", toneBorderLeft[accent]),
        padding[pad],
        className,
      )}
    >
      {children}
    </div>
  );
}

type PanelHeaderProps = {
  /** Nomeia escopo, período ou autoridade. Nunca repete o título. */
  eyebrow?: string;
  eyebrowTone?: Tone;
  title?: string;
  /** Nota à direita, ex.: nível de acesso necessário. */
  right?: React.ReactNode;
  className?: string;
};

export function PanelHeader({
  eyebrow,
  eyebrowTone = "navy",
  title,
  right,
  className,
}: PanelHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b border-rule px-[18px] py-[11px]",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <div
            className={cn(
              "font-heading text-eyebrow font-bold uppercase tracking-eyebrow",
              toneFg[eyebrowTone],
            )}
          >
            {eyebrow}
          </div>
        )}
        {title && (
          <div className="font-heading text-title-sm font-bold text-navy">
            {title}
          </div>
        )}
      </div>
      {right && <div className="text-tag shrink-0 text-label">{right}</div>}
    </div>
  );
}

/** Micro-header de bloco: uppercase pequeno com hairline embaixo. */
export function MicroHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "font-heading text-micro mb-2 border-b border-rule pb-1.5 font-bold uppercase tracking-micro text-label",
        className,
      )}
    >
      {children}
    </div>
  );
}

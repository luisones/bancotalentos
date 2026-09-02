import { cn } from "@/lib/utils";
import { toneSpine, toneTinted, type Tone } from "@/lib/tone";

/**
 * Metadado factual, em sentence case: "12 anos de experiência", "Inglês B2".
 * Fundo morno e neutro — um chip nunca comunica estado.
 */
export function Chip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-dense rounded-chip border border-chip-border bg-chip-bg px-2.5 py-[3px] text-ink-3",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * ESTADO, em uppercase: "3 PENDENTES SUAS", "SEM CURRÍCULO", "IMPORTADO".
 *
 * A distinção visual com Chip (caixa alta contra sentence case, tinto
 * semântico contra bege morno) é o que impede "12 anos de experiência" e
 * "2 pendências" de lerem como a mesma categoria de coisa.
 */
export function StateBadge({
  children,
  tone,
  dot = false,
  className,
}: {
  children: React.ReactNode;
  tone: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-heading text-eyebrow inline-flex items-center gap-1.5 rounded-chip border px-2 py-[3px] font-bold uppercase tracking-badge",
        toneTinted[tone],
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden
          className={cn("size-2 rounded-full", toneSpine[tone])}
        />
      )}
      {children}
    </span>
  );
}

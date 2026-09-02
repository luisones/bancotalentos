import { cn } from "@/lib/utils";
import { toneFg, type Tone } from "@/lib/tone";

export type SummaryItem = { text: string; tone?: Tone; strong?: boolean };

/**
 * A linha-resumo de uma seção fechada. É o mecanismo que compra densidade sem
 * custo cognitivo: entrega o essencial sem exigir um clique.
 *
 * O máximo de 4 itens é imposto pelo tipo. As linhas da referência têm 3–4;
 * a partir de 6 a densidade virou ruído.
 */
export type SummaryItems =
  | readonly []
  | readonly [SummaryItem]
  | readonly [SummaryItem, SummaryItem]
  | readonly [SummaryItem, SummaryItem, SummaryItem]
  | readonly [SummaryItem, SummaryItem, SummaryItem, SummaryItem];

export function SectionSummary({
  items,
  className,
}: {
  items: readonly SummaryItem[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <span
      className={cn(
        "text-dense flex flex-wrap items-baseline gap-x-1.5 text-muted-foreground",
        className,
      )}
    >
      {items.map((item, i) => (
        // Separador DEPOIS do item, não antes: assim uma linha que quebra no
        // celular nunca começa com "·".
        <span
          key={`${item.text}-${i}`}
          className="inline-flex items-baseline gap-1.5"
        >
          <span
            className={cn(
              item.tone && toneFg[item.tone],
              item.strong && "font-semibold",
            )}
          >
            {item.text}
          </span>
          {i < items.length - 1 && (
            <span aria-hidden className="text-faint">
              ·
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

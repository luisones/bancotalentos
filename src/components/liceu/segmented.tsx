import Link from "next/link";
import { cn } from "@/lib/utils";

export type SegmentedItem = {
  value: string;
  label: string;
  /** Segunda linha, ex.: "7,4 · 5/8 · Avançar". */
  sub?: string;
  count?: number;
};

/**
 * Controle segmentado com hairlines por gap.
 *
 * Server Component: os filtros deste app já vivem na URL, então o modo padrão
 * é <Link> e não custa nenhum JS de cliente. Alvo de toque de 40px no celular.
 */
export function Segmented({
  items,
  value,
  hrefFor,
  className,
}: {
  items: SegmentedItem[];
  value: string;
  hrefFor: (value: string) => string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-px overflow-hidden rounded-chip border border-rule-strong bg-rule-strong",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <Link
            key={item.value}
            href={hrefFor(item.value)}
            scroll={false}
            aria-current={active ? "true" : undefined}
            className={cn(
              "font-heading text-dense min-h-10 px-4 py-[7px] font-semibold",
              active
                ? "bg-card text-navy"
                : "bg-ground text-muted-foreground hover:bg-card",
            )}
          >
            <span className="flex items-baseline gap-1.5">
              {item.label}
              {item.count !== undefined && (
                <span data-numeric className="text-meta text-subtle">
                  {item.count}
                </span>
              )}
            </span>
            {item.sub && (
              <span
                data-numeric
                className={cn(
                  "text-meta mt-0.5 block",
                  active ? "text-muted-foreground" : "text-subtle",
                )}
              >
                {item.sub}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

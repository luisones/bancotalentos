import Link from "next/link";
import { cn } from "@/lib/utils";
import { toneFg, type Tone } from "@/lib/tone";
import { MicroHeader } from "./surface";

/** Grade de blocos. Agrupa por hairline e coluna, não por caixa aninhada. */
export function FieldGrid({
  children,
  min = 190,
  className,
}: {
  children: React.ReactNode;
  min?: number;
  className?: string;
}) {
  return (
    <div
      style={{ ["--fg-min" as string]: `${min}px` }}
      className={cn(
        "grid gap-x-[26px] gap-y-[18px]",
        "[grid-template-columns:repeat(auto-fit,minmax(var(--fg-min),1fr))]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export type FieldItem = {
  label: string;
  value: React.ReactNode;
  tone?: Tone;
};

/**
 * Micro-header + pares rótulo→valor + uma ação inline.
 *
 * A ação fica DENTRO do bloco a que pertence — é a tradução literal de
 * "ações perto da informação".
 */
export function FieldBlock({
  title,
  items,
  action,
  labelWidth = 74,
  className,
}: {
  title: string;
  items: FieldItem[];
  action?: { label: string; href: string };
  labelWidth?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <MicroHeader>{title}</MicroHeader>
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-baseline gap-2 py-0.5"
        >
          <span
            style={{ minWidth: `${labelWidth}px` }}
            className="text-tag shrink-0 text-label"
          >
            {item.label}
          </span>
          <span
            className={cn(
              "text-cell font-semibold",
              item.tone ? toneFg[item.tone] : undefined,
            )}
          >
            {item.value}
          </span>
        </div>
      ))}
      {action && (
        <Link
          href={action.href}
          className="text-tag mt-1.5 inline-block font-semibold text-gold-text hover:underline"
        >
          {action.label} →
        </Link>
      )}
    </div>
  );
}

/** Pares rótulo/valor em grid largo. Compartilhado por modal e impressão. */
export function DefinitionList({
  rows,
  labelWidth = 168,
  className,
}: {
  rows: Array<{ label: string; value: React.ReactNode }>;
  labelWidth?: number;
  className?: string;
}) {
  return (
    <dl className={className}>
      {rows.map((row) => (
        <div
          key={row.label}
          style={{ ["--dl-label" as string]: `${labelWidth}px` }}
          className="grid gap-4 border-b border-rule-weak py-2 [grid-template-columns:var(--dl-label)_minmax(0,1fr)]"
        >
          <dt className="text-tag font-semibold uppercase tracking-[0.08em] text-label">
            {row.label}
          </dt>
          <dd className="text-row text-ink">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

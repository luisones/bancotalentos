import Link from "next/link";
import { cn } from "@/lib/utils";
import { toneSpine, type Tone } from "@/lib/tone";

export type GridColumn = {
  key: string;
  label: string;
  /** Trilho CSS: "minmax(190px,1fr)" | "92px". */
  width: string;
  align?: "start" | "center" | "end";
  /** Aplica tabular-nums automaticamente. */
  numeric?: boolean;
};

const alignClass = {
  start: "text-left",
  center: "text-center",
  end: "text-right",
} as const;

/**
 * Tabela em CSS grid.
 *
 * As colunas são publicadas UMA vez como --dg-cols no wrapper e herdadas pelas
 * linhas. A referência repete grid-template-columns à mão no header e nas
 * linhas, que é exatamente como uma tabela densa apodrece.
 *
 * Responsivo por @container, não media query: o mesmo grid precisa funcionar a
 * 1200px na coluna principal e a 300px dentro do rail.
 */
export function DataGrid({
  columns,
  minWidth,
  caption,
  empty,
  children,
  className,
}: {
  columns: GridColumn[];
  /** Piso para scroll horizontal, só em dado de forma matricial. */
  minWidth?: number;
  caption?: string;
  empty?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const cols = columns.map((c) => c.width).join(" ");
  const hasRows = Boolean(children);

  return (
    <div
      style={{
        ["--dg-cols" as string]: cols,
        ...(minWidth ? { ["--dg-min" as string]: `${minWidth}px` } : {}),
      }}
      className={cn("@container", className)}
    >
      {caption && (
        <p className="text-tag mb-2.5 text-subtle">{caption}</p>
      )}
      <div className={minWidth ? "overflow-x-auto" : undefined}>
        <div className={minWidth ? "min-w-[var(--dg-min)]" : undefined}>
          <div className="grid gap-3 border-b border-rule-strong px-3 pb-2 [grid-template-columns:var(--dg-cols)] @max-md:hidden">
            {columns.map((c) => (
              <div
                key={c.key}
                className={cn(
                  "font-heading text-micro font-bold uppercase tracking-micro text-label",
                  alignClass[c.align ?? "start"],
                )}
              >
                {c.label}
              </div>
            ))}
          </div>
          {hasRows ? children : empty}
        </div>
      </div>
    </div>
  );
}

/**
 * Linha. Server Component quando é navegacional ou inerte; a variante com
 * `expanded` precisa de estado e vive em `data-grid-row-expandable.tsx`.
 */
export function DataGridRow({
  cells,
  href,
  tone,
  className,
}: {
  cells: React.ReactNode[];
  /** Linha navegacional: vira <Link>, sem nenhum JS de cliente. */
  href?: string;
  /** Marcador de 2px à esquerda. */
  tone?: Tone;
  className?: string;
}) {
  const inner = (
    <>
      {tone && (
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-0 left-0 w-0.5",
            toneSpine[tone],
          )}
        />
      )}
      {cells}
    </>
  );

  const base = cn(
    "relative grid items-center gap-3 border-b border-rule-weak px-3 py-row-y",
    "[grid-template-columns:var(--dg-cols)]",
    // Abaixo do limiar do container a linha empilha e vira um registro.
    "@max-md:grid-cols-1 @max-md:gap-1",
    href && "hover:bg-row-hover",
    className,
  );

  if (href) {
    // Sem "block" aqui: `block` e `grid` são ambos utilities de display, e o
    // tailwind-merge descartaria o `grid` do base, empilhando as células.
    return (
      <Link href={href} className={base}>
        {inner}
      </Link>
    );
  }

  return <div className={base}>{inner}</div>;
}

/** Célula. `numeric` traz tabular-nums do próprio componente. */
export function Cell({
  children,
  align = "start",
  numeric,
  muted,
  /** Rótulo mostrado só quando a linha empilha no celular. */
  stackLabel,
  className,
}: {
  children: React.ReactNode;
  align?: GridColumn["align"];
  numeric?: boolean;
  muted?: boolean;
  stackLabel?: string;
  className?: string;
}) {
  return (
    <div
      {...(numeric ? { "data-numeric": true } : {})}
      className={cn(
        "text-cell min-w-0",
        alignClass[align],
        "@max-md:!text-left",
        muted && "text-muted-foreground",
        className,
      )}
    >
      {stackLabel && (
        <span className="text-micro mr-1.5 hidden uppercase tracking-micro text-label @max-md:inline">
          {stackLabel}
        </span>
      )}
      {children}
    </div>
  );
}

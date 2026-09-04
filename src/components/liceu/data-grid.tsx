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
  /**
   * Chave de ordenação. Presente = o cabeçalho vira link e ordena por esta
   * coluna. Ausente = cabeçalho inerte.
   */
  sortKey?: string;
  /**
   * Some quando a linha empilha no celular. Com dez colunas, empilhar tudo
   * produz um bloco que ninguém lê — o registro no celular fica com o
   * essencial.
   */
  hideOnStack?: boolean;
};

export type SortState = {
  /** `sortKey` da coluna ativa. */
  key: string;
  /** `desc` é o padrão em coluna de nota: a maior primeiro. */
  order: "asc" | "desc";
  /** Monta a URL de ordenar por `key` na direção `order`. */
  hrefFor: (key: string, order: "asc" | "desc") => string;
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
  sort,
  stickyHeader,
  children,
  className,
}: {
  columns: GridColumn[];
  /** Piso para scroll horizontal, só em dado de forma matricial. */
  minWidth?: number;
  caption?: string;
  empty?: React.ReactNode;
  /** Ordenação por cabeçalho. Ausente = cabeçalhos inertes. */
  sort?: SortState;
  /** Congela o cabeçalho abaixo do header do app durante a rolagem. */
  stickyHeader?: boolean;
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
          <div
            className={cn(
              "grid gap-3 border-b border-rule-strong px-3 pb-2 [grid-template-columns:var(--dg-cols)] @max-md:hidden",
              // Opaco de propósito: transparente, as linhas passariam por baixo.
              stickyHeader && "sticky top-header z-10 bg-card pt-2",
            )}
          >
            {columns.map((c) => (
              <HeaderCell key={c.key} column={c} sort={sort} />
            ))}
          </div>
          {hasRows ? children : empty}
        </div>
      </div>
    </div>
  );
}

/**
 * Cabeçalho de coluna. Ordenável vira `<Link>` — Server Component, sem um byte
 * de JS de cliente para uma interação que é, literalmente, navegar para outra
 * ordenação da mesma lista.
 */
function HeaderCell({
  column,
  sort,
}: {
  column: GridColumn;
  sort?: SortState;
}) {
  const base = cn(
    "font-heading text-micro font-bold uppercase tracking-micro text-label",
    alignClass[column.align ?? "start"],
  );

  if (!sort || !column.sortKey) {
    return <div className={base}>{column.label}</div>;
  }

  const active = sort.key === column.sortKey;
  // Clicar na coluna ativa inverte; clicar numa nova começa decrescente, que é
  // o que se quer de uma coluna de nota ou de posição.
  const nextOrder = active && sort.order === "desc" ? "asc" : "desc";

  return (
    <a
      href={sort.hrefFor(column.sortKey, nextOrder)}
      // `aria-sort` pertence à célula de cabeçalho, não ao link dentro dela —
      // e este grid não tem role de tabela. A direção vai no texto acessível.
      className={cn(
        base,
        "inline-flex items-center gap-1 hover:text-navy",
        column.align === "end" && "justify-end",
        column.align === "center" && "justify-center",
        active && "text-navy",
      )}
    >
      {column.label}
      <span aria-hidden className={active ? "text-gold-text" : "opacity-0"}>
        {sort.order === "asc" ? "▲" : "▼"}
      </span>
      <span className="sr-only">
        {active
          ? `ordenado por ${column.label}, ${sort.order === "asc" ? "crescente" : "decrescente"}. Ativar para inverter.`
          : `ordenar por ${column.label}`}
      </span>
    </a>
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
  /** Some quando a linha empilha. Espelha `GridColumn.hideOnStack`. */
  hideOnStack,
  className,
}: {
  children: React.ReactNode;
  align?: GridColumn["align"];
  numeric?: boolean;
  muted?: boolean;
  stackLabel?: string;
  hideOnStack?: boolean;
  className?: string;
}) {
  return (
    <div
      {...(numeric ? { "data-numeric": true } : {})}
      className={cn(
        "text-cell min-w-0",
        alignClass[align],
        "@max-md:!text-left",
        hideOnStack && "@max-md:hidden",
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

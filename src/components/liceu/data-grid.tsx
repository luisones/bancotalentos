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
  /** Nome completo quando o rótulo da coluna é abreviado. */
  title?: string;
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
  /**
   * Clique no cliente (Painel). Quando presente, o cabeçalho vira botão e não
   * navega — evita RSC + Neon a cada reordenação.
   */
  onSort?: (key: string, order: "asc" | "desc") => void;
  /** Fallback sem JS / grids que ainda ordenam por URL. */
  hrefFor?: (key: string, order: "asc" | "desc") => string;
};

const alignClass = {
  start: "text-left",
  center: "text-center",
  end: "text-right",
} as const;

const cellAlignClass = {
  start: "text-left",
  center: "flex w-full flex-col items-center text-center",
  end: "text-right",
} as const;

/**
 * Tabela em CSS grid.
 *
 * As colunas são publicadas UMA vez como --dg-cols no wrapper e herdadas pelas
 * linhas. A referência repete grid-template-columns à mão no header e nas
 * linhas, que é exatamente como uma tabela densa apodrece.
 *
 * O empilhamento no celular é MEDIA QUERY, não container query. Era container
 * query por causa de um rail de 300px que não existe mais — e a escala de
 * container do Tailwind v4 é outra (`@md` = 28rem, não 48rem), então a 400px de
 * viewport o contêiner media 450px e a linha nunca empilhava: a tabela saía
 * cortada pela borda direita da tela.
 */
export function DataGrid({
  columns,
  minWidth,
  caption,
  empty,
  sort,
  stickyHeader,
  compact,
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
  /**
   * Congela o cabeçalho. `page` gruda abaixo do header do app (a página é o
   * scrollport). `pane` gruda no topo de um painel com rolagem própria — o
   * único jeito de a barra horizontal ficar visível sem o cabeçalho soltar
   * das colunas. `true` = `page`.
   */
  stickyHeader?: boolean | "page" | "pane";
  /** Trilhos e padding mais justos, para tabela operacional densa. */
  compact?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  const cols = columns.map((c) => c.width).join(" ");
  const hasRows = Boolean(children);
  const sticky =
    stickyHeader === true || stickyHeader === "page"
      ? "page"
      : stickyHeader === "pane"
        ? "pane"
        : null;

  return (
    <div
      style={{
        ["--dg-cols" as string]: cols,
        ["--dg-gap" as string]: compact ? "0.5rem" : "0.75rem",
        ["--dg-pad-x" as string]: compact ? "0.5rem" : "0.75rem",
        ...(minWidth ? { ["--dg-min" as string]: `${minWidth}px` } : {}),
      }}
      className={cn(
        sticky === "pane" && "md:flex md:min-h-0 md:flex-1 md:flex-col",
        className,
      )}
    >
      {caption && (
        <p className="text-tag mb-2.5 text-subtle">{caption}</p>
      )}
      {/*
        Pane: a tabela É o scrollport, nas duas direções. Sem altura definida
        no ancestral, `overflow-x: auto` promove overflow-y a auto e o
        cabeçalho sticky ancora num contêiner da altura da lista inteira —
        some da vista ou cobre a primeira linha. O Painel dá essa altura
        (flex-1 num bloco que cabe na janela); a barra de lado fica no
        rodapé visível e o cabeçalho gruda no topo deste painel.

        Page: sem wrapper de overflow. O cabeçalho gruda no viewport. Só
        serve quando as colunas cabem; se não cabem, a página não ganha
        barra horizontal (o overflow não alarga o documento).
      */}
      <div
        className={cn(
          minWidth && "min-w-0",
          sticky === "pane" &&
            "max-md:overflow-visible md:min-h-0 md:flex-1 md:overflow-auto md:overscroll-contain",
          minWidth && sticky !== "pane" && "overflow-x-auto",
        )}
      >
        <div className={minWidth ? "min-w-[var(--dg-min)]" : undefined}>
          <div
            className={cn(
              "grid items-end border-b border-rule-strong pb-2 [grid-template-columns:var(--dg-cols)] [gap:var(--dg-gap,0.75rem)] [padding-inline:var(--dg-pad-x,0.75rem)] max-md:hidden",
              sticky === "page" &&
                "sticky top-header z-10 bg-card pt-2 shadow-[0_6px_10px_-8px_rgba(11,48,83,0.35)]",
              sticky === "pane" &&
                "sticky top-0 z-10 bg-card pt-2 shadow-[0_6px_10px_-8px_rgba(11,48,83,0.35)]",
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
 * Cabeçalho de coluna ordenável.
 *
 * Com `onSort`, é botão (Painel: reordena no cliente). Com `hrefFor`, é link
 * (fallback sem JS ou grids que ainda navegam).
 */
function HeaderCell({
  column,
  sort,
}: {
  column: GridColumn;
  sort?: SortState;
}) {
  const base = cn(
    "font-heading text-micro font-bold uppercase leading-tight tracking-micro text-label",
    alignClass[column.align ?? "start"],
  );
  const title = column.title;

  if (!sort || !column.sortKey) {
    return (
      <div className={base} title={title}>
        {column.label}
      </div>
    );
  }

  const active = sort.key === column.sortKey;
  // Clicar na coluna ativa inverte; clicar numa nova começa decrescente, que é
  // o que se quer de uma coluna de nota ou de posição.
  const nextOrder = active && sort.order === "desc" ? "asc" : "desc";
  const className = cn(
    base,
    // `flex w-full`, e NÃO `inline-flex`: uma caixa inline-flex numa célula de
    // grid encolhe até o conteúdo e ancora no início da célula, então
    // `justify-end` alinhava o texto dentro da própria caixa e não na coluna.
    // O efeito era o cabeçalho de toda coluna numérica desencontrado do número
    // que ele nomeia — de longe o defeito visual mais visível da tabela.
    "flex w-full flex-wrap items-end gap-x-0.5 gap-y-0 hover:text-navy",
    column.align === "end" && "justify-end",
    column.align === "center" && "justify-center",
    column.align !== "end" && column.align !== "center" && "justify-start",
    active && "text-navy",
  );
  const label = (
    <>
      {column.label}
      <span aria-hidden className={active ? "text-gold-text" : "hidden"}>
        {sort.order === "asc" ? "▲" : "▼"}
      </span>
      <span className="sr-only">
        {active
          ? `ordenado por ${column.label}, ${sort.order === "asc" ? "crescente" : "decrescente"}. Ativar para inverter.`
          : `ordenar por ${column.label}`}
      </span>
    </>
  );

  if (sort.onSort) {
    return (
      <button
        type="button"
        title={title}
        onClick={() => sort.onSort!(column.sortKey!, nextOrder)}
        className={cn(className, "cursor-pointer border-0 bg-transparent p-0")}
      >
        {label}
      </button>
    );
  }

  const href = sort.hrefFor?.(column.sortKey, nextOrder) ?? "#";
  return (
    <a href={href} className={className} title={title}>
      {label}
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
  stacked,
  className,
}: {
  cells: React.ReactNode[];
  /** Linha navegacional: vira <Link>, sem nenhum JS de cliente. */
  href?: string;
  /** Marcador de 2px à esquerda. */
  tone?: Tone;
  /**
   * Composição própria para o celular, no lugar do empilhamento automático.
   *
   * Empilhar dez células numa coluna produz dez linhas de "RÓTULO valor" com
   * metade da largura vazia à direita — ilegível e alto. Com `stacked`, a
   * linha desenha um registro pensado para a tela estreita e as células do
   * grid saem de cena.
   */
  stacked?: React.ReactNode;
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
      {/* `md:contents` e `max-md:hidden`, os dois com variante: um `contents`
          sem variante disputaria a mesma declaração `display` com o `hidden` e
          o vencedor sairia da ordem de geração do CSS, não do código. */}
      {stacked ? (
        <div className="max-md:hidden md:contents">{cells}</div>
      ) : (
        cells
      )}
      {stacked && <div className="md:hidden">{stacked}</div>}
    </>
  );

  const base = cn(
    "relative grid items-center border-b border-rule-weak py-row-y [gap:var(--dg-gap,0.75rem)] [padding-inline:var(--dg-pad-x,0.75rem)]",
    "[grid-template-columns:var(--dg-cols)]",
    // Abaixo do limiar do container a linha empilha e vira um registro. Com
    // `stacked` quem empilha é o próprio consumidor: a linha só vira bloco.
    stacked ? "max-md:!block" : "max-md:!grid-cols-1 max-md:gap-1",
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
  /**
   * A célula contém um controle que manda no próprio alinhamento. Sem isto, o
   * `max-md:!text-left` do empilhamento sobrescreve o alinhamento do botão.
   */
  interactive,
  className,
}: {
  children: React.ReactNode;
  align?: GridColumn["align"];
  numeric?: boolean;
  muted?: boolean;
  stackLabel?: string;
  hideOnStack?: boolean;
  interactive?: boolean;
  className?: string;
}) {
  return (
    <div
      {...(numeric ? { "data-numeric": true } : {})}
      className={cn(
        "text-cell min-w-0",
        cellAlignClass[align],
        !interactive && "max-md:!text-left",
        hideOnStack && "max-md:hidden",
        muted && "text-muted-foreground",
        className,
      )}
    >
      {stackLabel && (
        <span className="text-micro mr-1.5 hidden uppercase tracking-micro text-label max-md:inline">
          {stackLabel}
        </span>
      )}
      {children}
    </div>
  );
}

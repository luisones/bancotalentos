import Link from "next/link";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };

/**
 * Breadcrumb e título de página.
 *
 * O breadcrumb é EXPLÍCITO por página, nunca derivado do pathname: um mapa
 * rota→rótulo não sabe o nome de um candidato nem de uma campanha, e
 * "Candidatos / 9f3a-…" é pior que nenhum breadcrumb.
 */
export function PageHeader({
  breadcrumb,
  title,
  sub,
  right,
  className,
}: {
  breadcrumb: Crumb[];
  title?: string;
  sub?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  const last = breadcrumb[breadcrumb.length - 1];
  const parent = breadcrumb.length > 1 ? breadcrumb[breadcrumb.length - 2] : undefined;

  /*
    Sem título, as ações sobem para a linha do breadcrumb.

    A página do professor não tem título — o nome do candidato é o h1 do cartão
    de identidade, logo abaixo. Então `right` abria uma segunda faixa só para
    ele, com o breadcrumb sozinho numa linha de 20px e o próximo/anterior noutra.
    Duas linhas de cabeçalho antes do primeiro dado da página.
  */
  const inlineRight = Boolean(right) && !title && breadcrumb.length > 0;

  return (
    <div className={cn("pb-3.5 pt-[18px]", className)}>
      {breadcrumb.length > 0 && (
        <nav
          aria-label="Trilha de navegação"
          className={
            inlineRight
              ? "flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
              : undefined
          }
        >
          {/* Celular: só o pai como volta, e o item atual. */}
          <div className="text-dense flex items-center gap-2 md:hidden">
            {parent?.href && (
              <>
                <Link href={parent.href} className="text-muted-foreground hover:text-gold-text">
                  ← {parent.label}
                </Link>
                <span aria-hidden className="text-faint">
                  /
                </span>
              </>
            )}
            <span className="truncate font-semibold text-navy">{last?.label}</span>
          </div>

          <ol className="text-dense hidden flex-wrap items-center gap-2 text-muted-foreground md:flex">
            {breadcrumb.map((crumb, i) => (
              <li key={`${crumb.label}-${i}`} className="flex items-center gap-2">
                {i > 0 && (
                  <span aria-hidden className="text-faint">
                    /
                  </span>
                )}
                {crumb.href && i < breadcrumb.length - 1 ? (
                  <Link href={crumb.href} className="hover:text-gold-text">
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className={
                      i === breadcrumb.length - 1
                        ? "font-semibold text-navy"
                        : undefined
                    }
                  >
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>

          {inlineRight && <div className="shrink-0">{right}</div>}
        </nav>
      )}

      {(title || (right && !inlineRight)) && (
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h1 className="font-heading text-display-sm font-bold tracking-[-0.02em] text-navy">
                {title}
              </h1>
            )}
            {sub && (
              <p className="text-dense mt-0.5 text-muted-foreground">{sub}</p>
            )}
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </div>
      )}
    </div>
  );
}

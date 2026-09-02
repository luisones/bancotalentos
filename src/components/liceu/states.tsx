import Link from "next/link";
import { Lock, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  Neste domínio o estado NORMAL é incompleto: a avaliação cega esconde a
  maioria das notas, dimensões ausentes são comuns e não valem zero, a
  cobertura é quase sempre parcial, e o perfil `consulta` não escreve nada.
  Por isso estes estados são componentes de primeira classe, não frases
  cinzas improvisadas.
*/

export function EmptyState({
  title,
  hint,
  action,
  className,
}: {
  title: string;
  hint?: string;
  action?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div className={cn("py-6", className)}>
      <p className="text-cell font-semibold text-ink">{title}</p>
      {hint && (
        <p className="text-note mt-1 max-w-prose leading-relaxed text-muted-foreground">
          {hint}
        </p>
      )}
      {action && (
        <Link
          href={action.href}
          className="text-tag mt-2.5 inline-block font-semibold text-gold-text hover:underline"
        >
          {action.label} →
        </Link>
      )}
    </div>
  );
}

/** Perfil consulta. Melhor que doze botões desabilitados sem explicação. */
export function RestrictedState({
  reason,
  className,
}: {
  reason: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-note border-l-[3px] border-l-navy bg-info-bg px-3 py-2.5 text-muted-foreground",
        className,
      )}
    >
      {reason}
    </p>
  );
}

export function ErrorState({
  title,
  detail,
  retry,
  className,
}: {
  title: string;
  detail?: string;
  retry?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-panel border border-alert-border bg-alert-bg px-4 py-3.5",
        className,
      )}
    >
      <p className="text-cell flex items-center gap-2 font-semibold text-alert">
        <TriangleAlert className="size-4 shrink-0" aria-hidden />
        {title}
      </p>
      {detail && (
        <p className="text-note mt-1 text-muted-foreground">{detail}</p>
      )}
      {retry && <div className="mt-2.5">{retry}</div>}
    </div>
  );
}

/**
 * Avaliação cega. Não é uma frase cinza: mostra a contagem sem nomes e sem
 * números, e nomeia a consequência do ato de revelar (a ordem, não o acesso).
 */
export function BlindState({
  hiddenCount,
  dimensionName,
  onEvaluate,
  onPeek,
  className,
}: {
  hiddenCount: number;
  dimensionName: string;
  onEvaluate?: React.ReactNode;
  /** Ausente quando o usuário não pode revelar. */
  onPeek?: React.ReactNode;
  className?: string;
}) {
  const plural = hiddenCount !== 1;

  return (
    <div
      className={cn(
        "rounded-panel border border-dashed border-rule-strong bg-ground px-4 py-3.5",
        className,
      )}
    >
      <p className="text-cell flex items-center gap-2 font-semibold text-ink">
        <Lock className="size-3.5 shrink-0 text-label" aria-hidden />
        {hiddenCount} colega{plural ? "s" : ""} já avaliou {dimensionName}.
      </p>
      <p className="text-note mt-1 max-w-prose leading-relaxed text-muted-foreground">
        As notas ficam ocultas para preservar a independência do seu julgamento.
        Elas aparecem automaticamente quando você salvar a sua.
      </p>
      {(onEvaluate || onPeek) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {onEvaluate}
          {onPeek}
        </div>
      )}
    </div>
  );
}

/**
 * Dimensão sem nenhuma avaliação. A diferença entre "nota baixa" e "sem nota"
 * precisa ser legível em 200ms — por isso nunca renderiza 0,0.
 */
export function NoScoreState({ className }: { className?: string }) {
  return (
    <span
      title="Sem avaliação. Não conta como zero; fica fora do cálculo e reduz a cobertura."
      className={cn("text-cell text-subtle", className)}
    >
      — <span className="text-meta">Não avaliada</span>
    </span>
  );
}

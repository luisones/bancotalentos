import { cn } from "@/lib/utils";

/**
 * Nota rápida, variante de LISTA (ranking, busca, pendências, comparar).
 *
 * É prosa curta, não pílula — por isso um terceiro componente e não um
 * terceiro formato de Chip/StateBadge. Tom gold porque no sistema gold
 * significa "juízo humano, atenção", que é exatamente o que ela é.
 *
 * Truncada em uma linha: o valor está em lê-la varrendo uma lista.
 */
export function QuickNoteLine({
  note,
  className,
}: {
  note: string | null;
  className?: string;
}) {
  if (!note) return null;
  return (
    <p
      title={note}
      className={cn("text-note truncate text-gold-text", className)}
    >
      {note}
    </p>
  );
}

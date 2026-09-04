import type { InstrumentBadge } from "@/lib/types/candidate-profile";
import { cn } from "@/lib/utils";

/**
 * Quais instrumentos este candidato de fato fez.
 *
 * Seis pastilhas, ordem fixa, acesa = tem nota. É a resposta de relance para
 * "dá para comparar essa pessoa com as outras?" — um 8,0 com um instrumento
 * aplicado e um 8,0 com quatro não dizem a mesma coisa, e a cobertura numérica
 * ao lado do Resultado diz quantos, mas não QUAIS.
 *
 * Ordem fixa e não "só os que fez": a posição de cada pastilha é o que permite
 * ler a fileira sem soletrar as siglas depois da segunda visita.
 */
export function InstrumentBadges({ items }: { items: InstrumentBadge[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {items.map((item) => (
        <span
          key={item.code}
          title={
            item.applied
              ? `${item.name}: ${item.display}`
              : `${item.name}: não aplicado`
          }
          className={cn(
            "font-heading text-micro grid h-6 w-7 place-items-center rounded-chip border font-bold tracking-micro",
            item.applied
              ? "border-navy bg-navy text-gold"
              : "border-dashed border-rule-strong bg-transparent text-faint",
          )}
        >
          {item.shortCode}
          <span className="sr-only">
            {item.name}
            {item.applied ? ` — nota ${item.display}` : " — não aplicado"}
          </span>
        </span>
      ))}
    </div>
  );
}

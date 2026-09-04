"use client";

import { useMemo, useState, useTransition } from "react";
import { MicroHeader, Panel } from "@/components/liceu/surface";
import { Button } from "@/components/ui/button";
import { saveWeightConfig } from "@/lib/actions/weights";
import type { ActionErrorCode } from "@/lib/actions/result";
import { actionErrorMessages, labelFor } from "@/lib/labels";
import { cn } from "@/lib/utils";

export type WeightRow = {
  code: string;
  label: string;
  weight: number;
  /** Nota explicativa do peso, quando ele carrega história. */
  hint?: string;
};

export type WeightGroup = {
  code: string;
  label: string;
  members: WeightRow[];
};

type Status =
  | { kind: "idle" }
  | { kind: "ok" }
  | { kind: "erro"; code: ActionErrorCode; field?: string };

/** Formata como porcentagem renormalizada sobre o conjunto. */
function share(value: number, total: number): string {
  if (total <= 0) return "—";
  return `${((value / total) * 100).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
}

function WeightField({
  id,
  label,
  hint,
  value,
  shareLabel,
  onChange,
  invalid,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  shareLabel: string;
  onChange: (next: string) => void;
  invalid: boolean;
}) {
  return (
    <div className="flex items-baseline gap-3 border-b border-rule-weak py-2">
      <label htmlFor={id} className="text-cell min-w-0 flex-1 text-ink">
        {label}
        {hint && <span className="text-meta block text-subtle">{hint}</span>}
      </label>
      <input
        id={id}
        // Nunca `type="number"`: o scroll do mouse altera o valor por acidente
        // e o valor inválido vira string vazia em silêncio.
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "text-cell w-20 rounded-chip border px-2 py-1 text-right tabular-nums",
          invalid ? "border-alert" : "border-btn-border",
        )}
      />
      <span className="text-meta w-14 shrink-0 text-right tabular-nums text-subtle">
        {shareLabel}
      </span>
    </div>
  );
}

/**
 * Pesos em dois níveis.
 *
 * Em cima, quanto cada item vale no Resultado. Embaixo, quanto cada parte vale
 * DENTRO do seu grupo — é onde vive o 1/2 herdado da planilha de 2025.
 *
 * A porcentagem ao lado é renormalizada ao vivo sobre o conjunto, porque é ela
 * que a pessoa está de fato decidindo: os números absolutos só importam uns em
 * relação aos outros.
 */
export function WeightsForm({
  items,
  groups,
}: {
  items: WeightRow[];
  groups: WeightGroup[];
}) {
  const [itemValues, setItemValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((i) => [i.code, String(i.weight)])),
  );
  const [memberValues, setMemberValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      groups.flatMap((g) => g.members.map((m) => [m.code, String(m.weight)])),
    ),
  );
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();

  const parse = (raw: string): number => {
    const n = Number(raw.replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : Number.NaN;
  };

  const itemTotal = useMemo(
    () =>
      Object.values(itemValues).reduce((sum, v) => {
        const n = parse(v);
        return sum + (Number.isNaN(n) ? 0 : n);
      }, 0),
    [itemValues],
  );

  const hasInvalid =
    Object.values(itemValues).some((v) => Number.isNaN(parse(v))) ||
    Object.values(memberValues).some((v) => Number.isNaN(parse(v)));

  function submit() {
    if (hasInvalid) {
      setStatus({ kind: "erro", code: "nota_invalida" });
      return;
    }
    startTransition(async () => {
      const result = await saveWeightConfig({
        items: Object.fromEntries(
          Object.entries(itemValues).map(([k, v]) => [k, parse(v)]),
        ),
        members: Object.fromEntries(
          Object.entries(memberValues).map(([k, v]) => [k, parse(v)]),
        ),
      });
      setStatus(
        result.ok
          ? { kind: "ok" }
          : { kind: "erro", code: result.code, field: result.field },
      );
    });
  }

  return (
    // Medida contida: com o rótulo na borda esquerda e o campo na direita de
    // uma tela de 1400px, ninguém associa um ao outro.
    <div className="flex max-w-[720px] flex-col gap-4">
      <Panel>
        <MicroHeader>Peso de cada item no Resultado</MicroHeader>
        {items.map((item) => (
          <WeightField
            key={item.code}
            id={`item-${item.code}`}
            label={item.label}
            hint={item.hint}
            value={itemValues[item.code] ?? ""}
            shareLabel={share(parse(itemValues[item.code] ?? ""), itemTotal)}
            invalid={Number.isNaN(parse(itemValues[item.code] ?? ""))}
            onChange={(next) =>
              setItemValues((prev) => ({ ...prev, [item.code]: next }))
            }
          />
        ))}
        <p className="text-meta mt-3 text-subtle">
          A dimensão que o candidato não fez sai do cálculo em vez de entrar como
          zero — os pesos são renormalizados sobre o que existe. Por isso a
          porcentagem aqui é a do candidato que fez tudo.
        </p>
      </Panel>

      {groups.map((group) => {
        const total = group.members.reduce((sum, m) => {
          const n = parse(memberValues[m.code] ?? "");
          return sum + (Number.isNaN(n) ? 0 : n);
        }, 0);
        return (
          <Panel key={group.code}>
            <MicroHeader>Partes de {group.label}</MicroHeader>
            {group.members.map((member) => (
              <WeightField
                key={member.code}
                id={`member-${member.code}`}
                label={member.label}
                hint={member.hint}
                value={memberValues[member.code] ?? ""}
                shareLabel={share(parse(memberValues[member.code] ?? ""), total)}
                invalid={Number.isNaN(parse(memberValues[member.code] ?? ""))}
                onChange={(next) =>
                  setMemberValues((prev) => ({ ...prev, [member.code]: next }))
                }
              />
            ))}
          </Panel>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={submit} disabled={isPending || hasInvalid}>
          {isPending ? "Salvando..." : "Salvar pesos"}
        </Button>
        {status.kind === "ok" && (
          <span className="text-cell text-positive">
            Pesos salvos. Todas as notas consolidadas já usam a configuração
            nova.
          </span>
        )}
        {status.kind === "erro" && (
          <span className="text-cell text-alert">
            {labelFor(actionErrorMessages, status.code)}
          </span>
        )}
      </div>

      <p className="text-meta text-subtle">
        Salvar cria uma configuração nova em vez de sobrescrever a atual. O
        histórico de pesos é o que permite saber com que critério uma decisão
        antiga foi tomada.
      </p>
    </div>
  );
}

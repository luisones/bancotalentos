"use client";

import { useState, useTransition } from "react";
import { overrideAnswerScore } from "@/lib/actions/evaluations";
import type { ActionErrorCode } from "@/lib/actions/result";
import { actionErrorMessages, labelFor } from "@/lib/labels";
import type { AnswerView } from "@/lib/types/candidate-profile";
import { cn } from "@/lib/utils";

/**
 * As 4 respostas dissertativas, com a nota de cada pergunta.
 *
 * A escala é PORCENTAGEM e não 0–10: a nota nasce de um ensemble de LLM numa
 * escala 0–30, e mostrar "24,2" pediria explicar a escala antes de qualquer
 * julgamento. "81%" é lido sem legenda.
 *
 * O override é por pergunta. Discordar da nota de uma resposta não pode custar
 * descartar as outras três — e a nota do ensemble continua visível ao lado da
 * humana, para a divergência ser aparente em vez de apagada.
 */
export function AnswerScores({
  candidateId,
  answers,
  canWrite,
  onSaved,
}: {
  candidateId: string;
  answers: AnswerView[];
  canWrite: boolean;
  /**
   * Avisa quem abriu esta lista de que um override entrou.
   *
   * A nota da Didática dissertativa é recalculada a partir das quatro, então
   * quem mostra o número do grupo — o cartão do perfil, a célula do Painel —
   * ficou desatualizado no instante em que uma destas mudou.
   */
  onSaved?: () => void;
}) {
  return (
    // Medida limitada: em largura total a resposta vinha com ~180 caracteres
    // por linha e o olho perde a linha seguinte. O rótulo da seção já está na
    // faixa que abriu isto — repeti-lo aqui seria dizer duas vezes.
    <div className="max-w-[78ch]">
      <div className="flex flex-col gap-3">
        {answers.map((answer) => (
          <AnswerRow
            key={answer.answerId}
            candidateId={candidateId}
            answer={answer}
            canWrite={canWrite}
            onSaved={onSaved}
          />
        ))}
      </div>
      <p className="text-meta mt-3 text-subtle">
        A nota da Didática dissertativa é recalculada a partir destas quatro. Ela
        só muda quando as quatro têm nota — com três, a fórmula produziria um
        número artificialmente baixo.
      </p>
    </div>
  );
}

function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`;
}

function AnswerRow({
  candidateId,
  answer,
  canWrite,
  onSaved,
}: {
  candidateId: string;
  answer: AnswerView;
  canWrite: boolean;
  onSaved?: () => void;
}) {
  const [override, setOverride] = useState(answer.overridePercent);
  const [draft, setDraft] = useState(
    answer.overridePercent === null ? "" : String(Math.round(answer.overridePercent)),
  );
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<ActionErrorCode | null>(null);
  const [isPending, startTransition] = useTransition();

  const effective = override ?? answer.ensemblePercent;

  function save(percent: number | null) {
    setError(null);
    startTransition(async () => {
      const result = await overrideAnswerScore({
        answerId: answer.answerId,
        candidateId,
        percent,
      });
      if (result.ok) {
        setOverride(percent);
        setEditing(false);
        onSaved?.();
      } else {
        setError(result.code);
      }
    });
  }

  return (
    <div className="border-b border-rule-weak pb-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-tag min-w-0 font-semibold text-navy">
          {answer.order}. {answer.prompt}
        </p>
        <span
          data-numeric
          className={cn(
            "shrink-0 font-semibold",
            override !== null ? "text-gold-text" : "text-ink",
            effective === null && "text-faint",
          )}
          title={
            override !== null
              ? `Nota humana. O ensemble deu ${formatPercent(answer.ensemblePercent)}.`
              : "Nota do ensemble de LLM"
          }
        >
          {formatPercent(effective)}
        </span>
      </div>

      {answer.text ? (
        <p className="text-note mt-1 whitespace-pre-wrap leading-relaxed text-ink-2">
          {answer.text}
        </p>
      ) : (
        <p className="text-meta mt-1 text-faint">Sem resposta registrada.</p>
      )}

      {canWrite && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {editing ? (
            <>
              <input
                inputMode="decimal"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-label="Nota desta pergunta, de 0 a 100"
                className="text-meta w-16 rounded-chip border border-btn-border px-2 py-0.5 text-right tabular-nums"
              />
              <span className="text-meta text-subtle">%</span>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  const value = Number(draft.replace(",", "."));
                  if (!Number.isFinite(value)) {
                    setError("nota_invalida");
                    return;
                  }
                  save(value);
                }}
                className="text-meta cursor-pointer font-semibold text-gold-text hover:underline"
              >
                {isPending ? "Salvando…" : "Salvar"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-meta cursor-pointer text-subtle hover:underline"
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-meta cursor-pointer font-semibold text-gold-text hover:underline"
              >
                {override === null ? "Substituir nota" : "Alterar nota humana"}
              </button>
              {override !== null && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setDraft("");
                    save(null);
                  }}
                  className="text-meta cursor-pointer text-subtle hover:underline"
                >
                  Voltar ao ensemble ({formatPercent(answer.ensemblePercent)})
                </button>
              )}
            </>
          )}
        </div>
      )}

      {error && (
        <p className="text-meta mt-1 text-alert">
          {labelFor(actionErrorMessages, error)}
        </p>
      )}
    </div>
  );
}

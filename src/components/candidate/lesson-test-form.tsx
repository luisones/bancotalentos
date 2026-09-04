"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveLessonTest } from "@/lib/actions/evaluations";
import type { ActionErrorCode } from "@/lib/actions/result";
import { actionErrorMessages, labelFor } from "@/lib/labels";
import type { LessonTestCriterion } from "@/lib/queries/lesson-tests";
import { formatScore } from "@/lib/scoring";
import { cn } from "@/lib/utils";

const STEPS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type Status =
  | { kind: "idle" }
  | { kind: "ok"; average: number }
  | { kind: "erro"; code: ActionErrorCode }
  | { kind: "offline" };

type Draft = { scores: Record<string, number>; comment: string };

/**
 * A ficha de aula-teste: 14 critérios, cada um com a pergunta que ele afere.
 *
 * A pergunta fica ao lado do campo e não num manual: "Presença" pode ser
 * postura ou assiduidade, e dois avaliadores pontuando o mesmo nome com
 * perguntas diferentes na cabeça produzem uma média que não significa nada.
 *
 * Critério em branco NÃO é zero — fica fora da média. É a diferença entre "não
 * deu tempo de ver a lousa" e "a lousa estava ilegível", e ela existe: no
 * histórico há aulas com 6 de 14 critérios preenchidos.
 *
 * A média aparece ao vivo porque é ela que vai para o Resultado. Sem isso o
 * avaliador só descobre o efeito das suas 14 notas depois de salvar.
 */
export function LessonTestForm({
  applicationId,
  criteria,
  initialScores,
  initialComment,
  editing,
  onSaved,
}: {
  applicationId: string;
  criteria: LessonTestCriterion[];
  /** Notas já lançadas por ESTE avaliador, por id de critério. */
  initialScores?: Record<string, number>;
  initialComment?: string | null;
  /** Já existe avaliação deste avaliador — o botão diz "atualizar". */
  editing?: boolean;
  onSaved?: (average: number) => void;
}) {
  const draftKey = `aula-teste:${applicationId}`;

  const [scores, setScores] = useState<Record<string, number>>(
    initialScores ?? {},
  );
  const [comment, setComment] = useState(initialComment ?? "");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [restored, setRestored] = useState(false);
  /**
   * Rascunho encontrado que NÃO foi aplicado porque já existe avaliação salva.
   * Fica oferecido, não imposto — ver o efeito abaixo.
   */
  const [offered, setOffered] = useState<Draft | null>(null);
  const [isPending, startTransition] = useTransition();

  /*
    Rascunho local: são 14 campos, e perder isso por uma queda de conexão custa
    repetir a aula inteira de memória.

    Mas ele só é aplicado SOZINHO quando não há avaliação salva. Com avaliação
    salva, o rascunho é oferecido e não imposto: ele pode ser mais velho —
    preencher 6 critérios no notebook sem enviar, completar os 14 no celular, e
    voltar ao notebook. Aplicado em silêncio, ele traria os 6 antigos por cima
    dos 14, e o save é REESCRITA COMPLETA: apagaria os 8 restantes e mudaria a
    média da dimensão sem ninguém pedir.
  */
  /* eslint-disable react-hooks/set-state-in-effect --
     Hidratação one-shot de um store só-do-navegador (localStorage): não roda no
     servidor, e o valor é editável depois de restaurado. */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as Draft;
      const hasContent =
        Object.keys(draft.scores ?? {}).length > 0 || Boolean(draft.comment);
      if (!hasContent) return;

      if (editing) {
        setOffered(draft);
        return;
      }
      setScores(draft.scores ?? {});
      setComment(draft.comment ?? "");
      setRestored(true);
    } catch {
      // Rascunho é conveniência, não estado essencial.
    }
  }, [draftKey, editing]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    // Com uma oferta pendente, gravar seria apagar em 800ms justamente o
    // rascunho que estamos oferecendo — e quem recarregasse a página sem
    // decidir o perderia.
    if (offered) return;
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(
          draftKey,
          JSON.stringify({ scores, comment }),
        );
      } catch {
        /* aba privada, cookies bloqueados */
      }
    }, 800);
    return () => clearTimeout(t);
  }, [draftKey, scores, comment, offered]);

  function clearDraft() {
    try {
      window.localStorage.removeItem(draftKey);
    } catch {
      /* noop */
    }
  }

  const filled = Object.keys(scores).length;
  const average =
    filled === 0
      ? null
      : Object.values(scores).reduce((sum, v) => sum + v, 0) / filled;

  function save() {
    if (filled === 0) {
      setStatus({ kind: "erro", code: "nota_invalida" });
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setStatus({ kind: "offline" });
      return;
    }
    setStatus({ kind: "idle" });
    startTransition(async () => {
      try {
        const result = await saveLessonTest({
          applicationId,
          scores,
          comment: comment || null,
        });
        if (result.ok) {
          clearDraft();
          setRestored(false);
          setStatus({ kind: "ok", average: result.data.average });
          onSaved?.(result.data.average);
        } else {
          setStatus({ kind: "erro", code: result.code });
        }
      } catch {
        setStatus({ kind: "offline" });
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule pb-2">
        <p className="text-meta text-subtle">
          Critério em branco fica fora da média — não conta como zero.
        </p>
        <p className="text-cell flex items-baseline gap-2">
          <span className="text-micro uppercase tracking-micro text-label">
            Média
          </span>
          <strong
            data-numeric
            className={cn(
              "font-heading text-title-sm font-bold",
              average === null ? "text-faint" : "text-navy",
            )}
          >
            {formatScore(average)}
          </strong>
          <span className="text-meta text-subtle">
            {filled} de {criteria.length}
          </span>
        </p>
      </div>

      {restored && (
        <p className="text-note text-gold-text">
          Recuperamos um rascunho não enviado deste aparelho.
        </p>
      )}

      {offered && (
        <div className="border-l-[3px] border-l-gold-text bg-gold-bg px-3 py-2.5">
          <p className="text-note leading-relaxed text-ink-2">
            Há um rascunho não enviado deste aparelho, com{" "}
            <strong className="font-semibold">
              {Object.keys(offered.scores ?? {}).length} de {criteria.length}
            </strong>{" "}
            critérios. Sua avaliação salva tem{" "}
            <strong className="font-semibold">
              {Object.keys(initialScores ?? {}).length}
            </strong>
            . Usar o rascunho substitui a avaliação inteira.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setScores(offered.scores ?? {});
                setComment(offered.comment ?? "");
                setRestored(true);
                setOffered(null);
              }}
            >
              Usar o rascunho
            </Button>
            <button
              type="button"
              onClick={() => {
                clearDraft();
                setOffered(null);
              }}
              className="text-meta cursor-pointer text-subtle hover:underline"
            >
              Descartar o rascunho
            </button>
          </div>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {criteria.map((criterion) => (
          <li
            key={criterion.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b border-rule-weak pb-2 last:border-b-0"
          >
            <div className="min-w-0 basis-56">
              <p className="text-cell font-semibold text-navy">
                {criterion.name}
              </p>
              {criterion.hint && (
                <p className="text-meta text-ink-3">{criterion.hint}</p>
              )}
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-1">
              <div className="flex min-w-0 flex-1 flex-wrap gap-0.5">
                {STEPS.map((n) => {
                  const active = scores[criterion.id] === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={isPending}
                      aria-pressed={active}
                      aria-label={`${criterion.name}: ${n}`}
                      onClick={() =>
                        setScores((prev) => ({ ...prev, [criterion.id]: n }))
                      }
                      className={cn(
                        "font-heading text-meta min-h-9 flex-1 cursor-pointer rounded-chip border font-bold tabular-nums",
                        active
                          ? "border-navy bg-navy text-white"
                          : "border-btn-border bg-card text-navy hover:bg-btn-hover-bg",
                      )}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={isPending || scores[criterion.id] === undefined}
                title="Não observei este critério"
                aria-label={`Limpar a nota de ${criterion.name}`}
                onClick={() =>
                  setScores((prev) => {
                    const next = { ...prev };
                    delete next[criterion.id];
                    return next;
                  })
                }
                className={cn(
                  "text-meta min-h-9 shrink-0 rounded-chip px-1.5",
                  scores[criterion.id] === undefined
                    ? "text-faint"
                    : "cursor-pointer text-subtle hover:text-alert",
                )}
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div>
        <label
          htmlFor={`at-comment-${applicationId}`}
          className="text-micro mb-1 block uppercase tracking-micro text-label"
        >
          Comentário sobre a aula
        </label>
        <Textarea
          id={`at-comment-${applicationId}`}
          rows={3}
          value={comment}
          disabled={isPending}
          onChange={(e) => setComment(e.target.value)}
          placeholder="O que a nota não diz: o que funcionou, o que faltou"
        />
      </div>

      {status.kind === "offline" && (
        <div className="border-l-[3px] border-l-alert bg-alert-bg px-3 py-2.5">
          <p className="text-note leading-relaxed text-ink-2">
            <strong className="font-semibold">Sem conexão.</strong> Suas{" "}
            {filled} notas estão guardadas neste aparelho e ainda{" "}
            <strong className="font-semibold">não foram enviadas</strong>.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => {
              setStatus({ kind: "idle" });
              save();
            }}
          >
            Tentar enviar de novo
          </Button>
        </div>
      )}
      {status.kind === "erro" && (
        <p className="text-note text-alert">
          {labelFor(actionErrorMessages, status.code)}
        </p>
      )}
      {status.kind === "ok" && (
        <p className="text-note text-positive">
          Aula-teste salva. A média{" "}
          <strong className="font-semibold">{formatScore(status.average)}</strong>{" "}
          entrou no Resultado.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={save} disabled={isPending || filled === 0}>
          {isPending
            ? "Salvando…"
            : editing
              ? "Atualizar minha avaliação"
              : "Salvar avaliação"}
        </Button>
        {(restored || filled > 0) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => {
              clearDraft();
              setScores(initialScores ?? {});
              setComment(initialComment ?? "");
              setRestored(false);
              setStatus({ kind: "idle" });
            }}
          >
            {editing ? "Desfazer alterações" : "Limpar"}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Leitura das avaliações já lançadas, por avaliador.
 *
 * A média de cada avaliador vem impressa porque a nota da dimensão é a média
 * DAS MÉDIAS: sem ela, duas fichas com 14 e 6 critérios parecem contribuir
 * igual, e o leitor não tem como conferir o número do cartão.
 */
export function LessonTestReadout({
  tests,
}: {
  tests: Array<{
    id: string;
    evaluatorName: string;
    date: string | null;
    comment: string | null;
    average: number | null;
    scores: Array<{ criterionId: string; name: string; score: number }>;
  }>;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      {tests.map((test) => (
        <div key={test.id}>
          <p className="text-tag flex flex-wrap items-baseline gap-x-2 font-semibold text-navy">
            {test.evaluatorName}
            {test.date && (
              <span className="font-normal text-subtle">· {test.date}</span>
            )}
            <span data-numeric className="ml-auto">
              {formatScore(test.average)}
              <span className="font-normal text-subtle">
                {" "}
                em {test.scores.length}
              </span>
            </span>
          </p>
          <ul className="mt-1 grid gap-x-6 sm:grid-cols-2">
            {test.scores.map((score) => (
              <li
                key={score.criterionId}
                className="text-meta flex justify-between gap-2 border-b border-rule-weak py-0.5"
              >
                <span className="text-ink-3">{score.name}</span>
                <span className="font-semibold tabular-nums">
                  {formatScore(score.score)}
                </span>
              </li>
            ))}
          </ul>
          {test.comment && (
            <p className="text-meta mt-1.5 whitespace-pre-wrap leading-relaxed text-ink-2">
              {test.comment}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

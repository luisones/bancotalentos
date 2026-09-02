"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveEvaluation } from "@/lib/actions/evaluations";
import type { ActionErrorCode } from "@/lib/actions/result";
import { actionErrorMessages, labelFor } from "@/lib/labels";
import type { OwnScore } from "@/lib/types/candidate-profile";
import { cn } from "@/lib/utils";

const STEPS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type Status =
  | { kind: "idle" }
  | { kind: "ok"; revisionCreated: boolean }
  | { kind: "erro"; code: ActionErrorCode }
  | { kind: "offline" };

/**
 * Entrada de nota.
 *
 * NÃO é `input type="number"`: no celular o spinner é minúsculo, o scroll
 * altera o valor por acidente e um valor inválido virava NaN silencioso. O
 * caminho primário é tocar um chip de 46px; o campo decimal é secundário e usa
 * `inputMode="decimal"`, porque nota com 0,1 de precisão é raríssima.
 *
 * Salvamento é sempre EXPLÍCITO: cada save grava auditoria e, em edição, uma
 * revisão — auto-save transformaria a trilha em lixo.
 */
export function ScoreInput({
  applicationId,
  dimensionId,
  dimensionName,
  own,
  onSaved,
}: {
  applicationId: string;
  dimensionId: string;
  dimensionName: string;
  /** A própria avaliação. Nunca a de outro avaliador — garantido pelo tipo. */
  own: OwnScore | null;
  onSaved?: () => void;
}) {
  const draftKey = `avaliacao:${applicationId}:${dimensionId}`;

  const [score, setScore] = useState<number | null>(own?.score ?? null);
  const [comment, setComment] = useState(own?.comment ?? "");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();
  const [restored, setRestored] = useState(false);

  // Rascunho local: se a conexão cair, a nota digitada não se perde.
  /* eslint-disable react-hooks/set-state-in-effect --
     Hidratação one-shot de um store só-do-navegador (localStorage): não pode
     rodar no servidor, e não cabe em useSyncExternalStore porque o valor é
     editável depois de restaurado. */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as { score: number | null; comment: string };
      if (draft.score !== own?.score || draft.comment !== (own?.comment ?? "")) {
        setScore(draft.score);
        setComment(draft.comment);
        setRestored(true);
      }
    } catch {
      // Rascunho é conveniência, não estado essencial.
    }
  }, [draftKey, own?.score, own?.comment]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(draftKey, JSON.stringify({ score, comment }));
      } catch {
        /* aba privada, cookies bloqueados */
      }
    }, 800);
    return () => clearTimeout(t);
  }, [draftKey, score, comment]);

  function clearDraft() {
    try {
      window.localStorage.removeItem(draftKey);
    } catch {
      /* noop */
    }
  }

  function save() {
    if (score === null) {
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
        const result = await saveEvaluation({
          applicationId,
          dimensionId,
          score,
          comment: comment || null,
        });
        if (result.ok) {
          clearDraft();
          setRestored(false);
          setStatus({ kind: "ok", revisionCreated: result.data.revisionCreated });
          onSaved?.();
        } else {
          setStatus({ kind: "erro", code: result.code });
        }
      } catch {
        setStatus({ kind: "offline" });
      }
    });
  }

  const blocked = status.kind === "offline";

  return (
    <div className="flex flex-col gap-4">
      {own && (
        <p className="text-note text-muted-foreground">
          Você avaliou{" "}
          <strong className="font-semibold">
            {own.score.toLocaleString("pt-BR")}
          </strong>{" "}
          em {own.updatedAt}. Editar cria um registro de revisão.
        </p>
      )}
      {restored && (
        <p className="text-note text-gold-text">
          Recuperamos um rascunho não enviado deste aparelho.
        </p>
      )}

      <div>
        <Label className="mb-2 block">Sua nota para {dimensionName}</Label>
        <div className="flex flex-wrap gap-1.5">
          {STEPS.map((n) => (
            <button
              key={n}
              type="button"
              disabled={isPending}
              onClick={() => setScore(n)}
              aria-pressed={score !== null && Math.round(score) === n}
              className={cn(
                "font-heading text-cell min-h-11.5 min-w-11.5 flex-1 cursor-pointer rounded-chip border font-bold tabular-nums",
                score !== null && Math.round(score) === n
                  ? "border-navy bg-navy text-white"
                  : "border-btn-border bg-card text-navy hover:bg-btn-hover-bg",
              )}
            >
              {n}
            </button>
          ))}
        </div>

        <div className="mt-2.5 flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending || score === null || score <= 0}
            onClick={() => setScore((s) => round1(Math.max(0, (s ?? 0) - 0.1)))}
          >
            −0,1
          </Button>
          <input
            type="text"
            inputMode="decimal"
            enterKeyHint="done"
            autoComplete="off"
            aria-label={`Nota exata para ${dimensionName}`}
            value={score === null ? "" : score.toLocaleString("pt-BR")}
            disabled={isPending}
            onChange={(e) => {
              const raw = e.target.value.replace(",", ".").trim();
              if (raw === "") return setScore(null);
              const n = Number(raw);
              if (Number.isFinite(n)) setScore(round1(Math.min(10, Math.max(0, n))));
            }}
            className="text-cell w-16 rounded-chip border border-btn-border bg-card px-2 py-1.5 text-center font-semibold tabular-nums outline-none focus:border-navy"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending || score === null || score >= 10}
            onClick={() => setScore((s) => round1(Math.min(10, (s ?? 0) + 0.1)))}
          >
            +0,1
          </Button>
          <span className="text-meta text-subtle">meio ponto, se precisar</span>
        </div>
      </div>

      <div>
        <Label htmlFor={`c-${dimensionId}`} className="mb-1.5 block">
          Comentário (opcional)
        </Label>
        <Textarea
          id={`c-${dimensionId}`}
          rows={3}
          value={comment}
          disabled={isPending}
          onChange={(e) => setComment(e.target.value)}
          placeholder="O que sustenta essa nota"
        />
      </div>

      {status.kind === "offline" && (
        <div className="border-l-[3px] border-l-alert bg-alert-bg px-3 py-2.5">
          <p className="text-note leading-relaxed text-ink-2">
            <strong className="font-semibold">Sem conexão.</strong> Sua nota{" "}
            <strong className="font-semibold">
              {score?.toLocaleString("pt-BR")}
            </strong>{" "}
            está guardada neste aparelho e ainda{" "}
            <strong className="font-semibold">não foi enviada</strong>.
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
          Nota salva.
          {status.revisionCreated && " A alteração gerou um registro de revisão."}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={save}
          disabled={isPending || score === null || blocked}
        >
          {isPending
            ? "Salvando…"
            : own
              ? "Atualizar minha nota"
              : "Salvar nota"}
        </Button>
        {restored && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => {
              clearDraft();
              setScore(own?.score ?? null);
              setComment(own?.comment ?? "");
              setRestored(false);
            }}
          >
            Descartar rascunho
          </Button>
        )}
      </div>
    </div>
  );
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

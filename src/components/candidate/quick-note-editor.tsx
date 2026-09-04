"use client";

import { useState, useTransition } from "react";
import { updateQuickNote } from "@/lib/actions/crm";
import type { ActionErrorCode } from "@/lib/actions/result";
import { QUICK_NOTE_MAX } from "@/lib/candidate/quick-note";
import { actionErrorMessages, labelFor } from "@/lib/labels";
import { cn } from "@/lib/utils";

/**
 * Nota rápida editável no lugar.
 *
 * Uma linha, compartilhada, sempre visível — e agora escrita onde ela é lida.
 * O diálogo anterior tinha duas abas justamente para explicar a diferença entre
 * ela e a observação longa; separar as duas na página torna a explicação
 * desnecessária.
 *
 * `expected` carrega o valor que esta aba viu. O campo é compartilhado e
 * sobrescrevível: sem baseline, duas pessoas editando ao mesmo tempo se
 * atropelam em silêncio, e a action recusa com `conflito_de_versao`.
 */
export function QuickNoteEditor({
  candidateId,
  note,
  canWrite,
}: {
  candidateId: string;
  note: string | null;
  canWrite: boolean;
}) {
  const [saved, setSaved] = useState(note);
  const [draft, setDraft] = useState(note ?? "");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<ActionErrorCode | null>(null);
  const [isPending, startTransition] = useTransition();

  const remaining = QUICK_NOTE_MAX - draft.trim().length;

  if (!canWrite) {
    return saved ? (
      <p className="text-dense border-l-2 border-l-gold-text pl-2.5 text-ink-3">
        {saved}
      </p>
    ) : null;
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(saved ?? "");
          setEditing(true);
        }}
        className={cn(
          "text-dense max-w-xl cursor-pointer border-l-2 border-l-gold-text pl-2.5 text-left",
          saved ? "text-ink-3 hover:text-navy" : "text-subtle hover:text-gold-text",
        )}
      >
        {saved ?? "Escrever nota rápida…"}
      </button>
    );
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={draft}
          maxLength={QUICK_NOTE_MAX + 40}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditing(false);
            if (e.key === "Enter") save();
          }}
          aria-label="Nota rápida"
          className="text-dense min-w-0 flex-1 rounded-chip border border-btn-border px-2.5 py-1"
        />
        <button
          type="button"
          disabled={isPending}
          onClick={save}
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
      </div>
      <p
        className={cn(
          "text-micro mt-0.5",
          remaining < 0 ? "text-alert" : "text-subtle",
        )}
      >
        {remaining < 0
          ? `${-remaining} caracteres a mais do que cabe`
          : `${remaining} caracteres restantes — ela é lida de relance no Painel`}
      </p>
      {error && (
        <p className="text-meta mt-0.5 text-alert">
          {labelFor(actionErrorMessages, error)}
        </p>
      )}
    </div>
  );

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateQuickNote({
        candidateId,
        note: draft,
        expected: saved,
      });
      if (result.ok) {
        setSaved(result.data.note);
        setEditing(false);
      } else {
        setError(result.code);
      }
    });
  }
}

"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addNote } from "@/lib/actions/crm";
import type { ActionErrorCode } from "@/lib/actions/result";
import { actionErrorMessages, labelFor } from "@/lib/labels";

/**
 * Escrever a observação longa, no lugar onde ela é escrita.
 *
 * Sem diálogo: a observação nasce logo depois de ver o currículo e o vídeo, e
 * um modal cobre exatamente o que a pessoa acabou de ler. O botão só aparece
 * quando há texto — enquanto a caixa está vazia, ele seria ruído.
 */
export function NoteWriter({
  candidateId,
  applicationId,
}: {
  candidateId: string;
  applicationId?: string;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<ActionErrorCode | null>(null);
  const [isPending, startTransition] = useTransition();

  const trimmed = body.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!trimmed) return;
        setError(null);
        startTransition(async () => {
          const result = await addNote({
            candidateId,
            applicationId,
            body: trimmed,
          });
          if (result.ok) setBody("");
          else setError(result.code);
        });
      }}
      className="mt-1.5"
    >
      <Textarea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="O que você observou no currículo, no vídeo ou na conversa"
        aria-label="Nova observação da equipe"
      />
      {trimmed && (
        <div className="mt-1.5 flex items-center gap-3">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Salvando…" : "Salvar observação"}
          </Button>
          <button
            type="button"
            onClick={() => setBody("")}
            className="text-meta cursor-pointer text-subtle hover:underline"
          >
            Descartar
          </button>
        </div>
      )}
      {error && (
        <p className="text-meta mt-1 text-alert">
          {labelFor(actionErrorMessages, error)}
        </p>
      )}
    </form>
  );
}

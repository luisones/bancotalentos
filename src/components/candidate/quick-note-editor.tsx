"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
import { updateQuickNote } from "@/lib/actions/crm";
import { QUICK_NOTE_MAX } from "@/lib/candidate/quick-note";
import type { ActionErrorCode } from "@/lib/actions/result";
import { actionErrorMessages, labelFor } from "@/lib/labels";
import { MicroHeader } from "@/components/liceu/surface";
import { cn } from "@/lib/utils";

type Status =
  | { kind: "idle" }
  | { kind: "ok" }
  | { kind: "erro"; code: ActionErrorCode };

/**
 * Nota rápida: uma linha, compartilhada, sempre visível.
 *
 * O campo TEM NOME na tela ("Nota rápida") e a ação de criar é um botão de
 * verdade. Na primeira versão era um link de texto sem rótulo, e o usuário não
 * o encontrou — foi escrever uma observação e marcar "destacar no topo",
 * achando que era o mesmo recurso. O texto de apoio diz onde ela aparece,
 * porque é isso que a distingue de uma observação.
 *
 * Modal seria cerimônia demais para "é estagiário agora": Enter salva, Esc
 * cancela, e o cap de 120 também é validado no servidor. A autoria vem da
 * trilha de auditoria (`quick_note_updated`), não de colunas próprias.
 */
export function QuickNoteEditor({
  candidateId,
  note,
  canWrite,
  authorship,
}: {
  candidateId: string;
  note: string | null;
  canWrite: boolean;
  /** Ex.: "editada por Luís Ribeiro há 2 dias". */
  authorship?: string | null;
}) {
  const [saved, setSaved] = useState(note);
  const [draft, setDraft] = useState(note ?? "");
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();

  function open() {
    setDraft(saved ?? "");
    setStatus({ kind: "idle" });
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setDraft(saved ?? "");
    setStatus({ kind: "idle" });
  }

  function save() {
    if (draft.trim() === (saved ?? "").trim()) {
      cancel();
      return;
    }
    startTransition(async () => {
      try {
        const result = await updateQuickNote({
          candidateId,
          note: draft,
          expected: saved,
        });
        if (result.ok) {
          setSaved(result.data.note);
          setEditing(false);
          setStatus({ kind: "ok" });
        } else {
          setStatus({ kind: "erro", code: result.code });
        }
      } catch {
        setStatus({ kind: "erro", code: "erro_inesperado" });
      }
    });
  }

  // Nada a mostrar e nada a fazer: perfil consulta sem nota.
  if (!saved && !canWrite && !editing) return null;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <MicroHeader className="mb-1.5 border-0 pb-0">Nota rápida</MicroHeader>
        {saved && authorship && (
          <span className="text-meta text-subtle">{authorship}</span>
        )}
      </div>

      {editing ? (
        <Editing
          draft={draft}
          isPending={isPending}
          status={status}
          onChange={setDraft}
          onSave={save}
          onCancel={cancel}
        />
      ) : saved ? (
        <Filled note={saved} canWrite={canWrite} onEdit={open} />
      ) : (
        <Empty onAdd={open} />
      )}
    </div>
  );
}

function Empty({ onAdd }: { onAdd: () => void }) {
  return (
    <div>
      <button
        type="button"
        onClick={onAdd}
        className="text-cell inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-chip border border-dashed border-gold-border bg-gold-bg px-3 font-semibold text-gold-text hover:bg-gold-bg-hover"
      >
        <Plus className="size-3.5" aria-hidden />
        Adicionar nota rápida
      </button>
      <p className="text-meta mt-1.5 max-w-md leading-snug text-subtle">
        Uma linha curta que fica sempre visível — aqui e na lista do ranking.
        Ex.: “já foi nossa professora”, “é estagiário no momento”.
      </p>
    </div>
  );
}

function Filled({
  note,
  canWrite,
  onEdit,
}: {
  note: string;
  canWrite: boolean;
  onEdit: () => void;
}) {
  if (!canWrite) {
    return (
      <p className="text-dense border-l-2 border-l-gold-text pl-2.5 text-ink-3">
        {note}
      </p>
    );
  }

  // A linha inteira é o alvo, e o lápis fica sempre visível: depender de
  // hover escondia a única pista de que o campo é editável.
  return (
    <button
      type="button"
      onClick={onEdit}
      className="group flex w-full cursor-pointer items-start gap-2 rounded-chip border-l-2 border-l-gold-text py-0.5 pl-2.5 pr-2 text-left hover:bg-gold-bg"
    >
      <span className="text-dense min-w-0 flex-1 text-ink-3">{note}</span>
      <Pencil
        className="mt-0.5 size-3.5 shrink-0 text-gold-text"
        aria-hidden
      />
      <span className="sr-only">Editar nota rápida</span>
    </button>
  );
}

function Editing({
  draft,
  isPending,
  status,
  onChange,
  onSave,
  onCancel,
}: {
  draft: string;
  isPending: boolean;
  status: Status;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const length = draft.trim().length;
  const over = length > QUICK_NOTE_MAX;
  const warn = length > 80;

  return (
    <div className="border-l-2 border-l-gold-text pl-2.5">
      <input
        autoFocus
        value={draft}
        disabled={isPending}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (!over) onSave();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        placeholder="Ex.: já foi nossa professora"
        aria-label="Nota rápida"
        className="text-dense w-full max-w-xl border-0 border-b border-rule-strong bg-transparent py-1 text-ink-3 outline-none focus:border-gold-text"
      />
      <div className="mt-1.5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={isPending || over}
          className="font-heading text-note min-h-8 cursor-pointer rounded-chip bg-navy px-3 font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
        >
          {isPending ? "Salvando…" : "Salvar nota rápida"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="text-note cursor-pointer font-semibold text-muted-foreground hover:underline"
        >
          Cancelar
        </button>
        <span
          data-numeric
          className={cn(
            "text-meta",
            over ? "text-alert" : warn ? "text-gold-text" : "text-subtle",
          )}
        >
          {length} de {QUICK_NOTE_MAX}
        </span>
      </div>
      {status.kind === "erro" && (
        <p className="text-note mt-1.5 text-alert">
          {labelFor(actionErrorMessages, status.code)}
        </p>
      )}
    </div>
  );
}

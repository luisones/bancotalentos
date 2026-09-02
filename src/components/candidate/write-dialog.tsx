"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { addNote, updateQuickNote } from "@/lib/actions/crm";
import type { ActionErrorCode } from "@/lib/actions/result";
import { QUICK_NOTE_MAX } from "@/lib/candidate/quick-note";
import { actionErrorMessages, labelFor } from "@/lib/labels";
import { cn } from "@/lib/utils";

type Err = ActionErrorCode | null;

/**
 * Um único ponto de escrita no perfil, com duas abas.
 *
 * Antes havia dois caminhos que pareciam fazer o mesmo trabalho: um botão de
 * nota rápida perto do nome e um checkbox "destacar no topo" dentro da
 * observação. Quem queria "uma linha sempre visível" clicava no checkbox
 * errado. Agora as duas coisas ficam lado a lado, nomeadas, com a diferença
 * declarada em cada aba — e perto do nome fica só a exibição da nota rápida.
 */
export function WriteDialog({
  candidateId,
  applicationId,
  quickNote,
  defaultTab = "rapida",
  trigger,
}: {
  candidateId: string;
  applicationId?: string;
  /** Valor atual, usado como baseline contra escrita concorrente. */
  quickNote: string | null;
  defaultTab?: "rapida" | "geral";
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Escrever sobre este candidato</DialogTitle>
          <DialogDescription>
            Duas coisas diferentes: uma linha curta que fica à vista de todos, ou
            um registro longo dentro do histórico.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab}>
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="rapida">Nota rápida</TabsTrigger>
            <TabsTrigger value="geral">Observação geral</TabsTrigger>
          </TabsList>

          <TabsContent value="rapida" className="pt-4">
            <QuickNoteTab
              candidateId={candidateId}
              current={quickNote}
              onDone={() => setOpen(false)}
            />
          </TabsContent>

          <TabsContent value="geral" className="pt-4">
            <ObservationTab
              candidateId={candidateId}
              applicationId={applicationId}
              onDone={() => setOpen(false)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function QuickNoteTab({
  candidateId,
  current,
  onDone,
}: {
  candidateId: string;
  current: string | null;
  onDone: () => void;
}) {
  const [value, setValue] = useState(current ?? "");
  const [error, setError] = useState<Err>(null);
  const [isPending, startTransition] = useTransition();

  const length = value.trim().length;
  const over = length > QUICK_NOTE_MAX;
  const warn = length > 80;
  const unchanged = value.trim() === (current ?? "").trim();

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateQuickNote({
          candidateId,
          note: value,
          expected: current,
        });
        if (result.ok) onDone();
        else setError(result.code);
      } catch {
        setError("erro_inesperado");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="border-l-[3px] border-l-gold-text bg-gold-bg px-3 py-2.5">
        <p className="text-note leading-relaxed text-ink-2">
          Esta linha fica{" "}
          <strong className="font-semibold">sempre visível</strong>: no topo da
          ficha e também na lista do ranking, para a equipe ler de relance.
          Substitui a anterior — é uma só por candidato.
        </p>
        <p className="text-meta mt-1.5 text-ink-3">
          Ex.: “já foi nossa professora” · “é estagiário no momento” · “fez
          aula-teste em 24 e amamos”
        </p>
      </div>

      <div>
        <Input
          autoFocus
          value={value}
          disabled={isPending}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !over && !unchanged) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Uma linha curta"
          aria-label="Nota rápida"
        />
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <span
            data-numeric
            className={cn(
              "text-meta",
              over ? "text-alert" : warn ? "text-gold-text" : "text-subtle",
            )}
          >
            {length} de {QUICK_NOTE_MAX} caracteres
          </span>
          {current && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => setValue("")}
              className="text-meta cursor-pointer font-semibold text-muted-foreground hover:text-alert hover:underline"
            >
              Apagar a nota
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-note text-alert">
          {labelFor(actionErrorMessages, error)}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone} disabled={isPending}>
          Cancelar
        </Button>
        <Button onClick={submit} disabled={isPending || over || unchanged}>
          {isPending
            ? "Salvando…"
            : current
              ? "Atualizar nota rápida"
              : "Salvar nota rápida"}
        </Button>
      </div>
    </div>
  );
}

function ObservationTab({
  candidateId,
  applicationId,
  onDone,
}: {
  candidateId: string;
  applicationId?: string;
  onDone: () => void;
}) {
  const [body, setBody] = useState("");
  const [pin, setPin] = useState(false);
  const [error, setError] = useState<Err>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await addNote({
          candidateId,
          applicationId,
          body: body.trim(),
          isHighlighted: pin,
        });
        if (result.ok) onDone();
        else setError(result.code);
      } catch {
        setError("erro_inesperado");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-note leading-relaxed text-muted-foreground">
        Texto livre, do tamanho que precisar. Fica no histórico com seu nome e a
        data, dentro da seção{" "}
        <strong className="font-semibold">Observações internas</strong> — não
        aparece no ranking.
      </p>

      <Textarea
        autoFocus
        rows={7}
        value={body}
        disabled={isPending}
        onChange={(e) => setBody(e.target.value)}
        placeholder="O que você observou"
        aria-label="Observação geral"
      />

      <label className="flex cursor-pointer items-start gap-2.5">
        <Checkbox
          className="mt-0.5"
          checked={pin}
          disabled={isPending}
          onCheckedChange={(v) => setPin(Boolean(v))}
        />
        <span>
          <span className="text-dense block">
            Fixar no topo das Observações internas
          </span>
          <span className="text-meta block text-subtle">
            Só reordena dentro daquela seção.
          </span>
        </span>
      </label>

      {error && (
        <p className="text-note text-alert">
          {labelFor(actionErrorMessages, error)}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone} disabled={isPending}>
          Cancelar
        </Button>
        <Button
          onClick={submit}
          disabled={isPending || body.trim().length === 0}
        >
          {isPending ? "Salvando…" : "Salvar observação"}
        </Button>
      </div>
    </div>
  );
}

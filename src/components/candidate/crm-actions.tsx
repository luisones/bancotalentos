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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addApplicationTag,
  addContact,
  addNote,
  updateApplicationStatus,
  updateTalentClassification,
} from "@/lib/actions/crm";
import type { ActionErrorCode, ActionResult } from "@/lib/actions/result";
import {
  actionErrorMessages,
  contactChannelLabels,
  contactResultLabels,
  labelFor,
  operationalStatusLabels,
  selectiveStatusLabels,
  talentClassificationLabels,
} from "@/lib/labels";

/*
  As cinco server actions de CRM existiam sem nenhuma interface. Cada uma vive
  aqui e é acionada do lugar onde o dado que ela muda aparece.
*/

type ErrState = ActionErrorCode | null;

function useAction() {
  const [error, setError] = useState<ErrState>(null);
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<ActionResult<unknown>>, onDone: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await fn();
        if (result.ok) onDone();
        else setError(result.code);
      } catch {
        setError("erro_inesperado");
      }
    });
  }

  return { error, isPending, run };
}

function ErrorLine({ code }: { code: ErrState }) {
  if (!code) return null;
  return (
    <p className="text-note text-alert">
      {labelFor(actionErrorMessages, code)}
    </p>
  );
}

/** Registrar contato — alta frequência, vive no header e na seção Contatos. */
export function ContactDialog({
  candidateId,
  applicationId,
  trigger,
}: {
  candidateId: string;
  applicationId?: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState("whatsapp");
  const [result, setResult] = useState("contato_realizado");
  const [note, setNote] = useState("");
  const { error, isPending, run } = useAction();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar contato</DialogTitle>
          <DialogDescription>
            O registro entra no histórico do candidato com seu nome e a data.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Canal</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(contactChannelLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Resultado</Label>
            <Select value={result} onValueChange={setResult}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(contactResultLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="contato-nota">O que foi conversado</Label>
            <Textarea
              id="contato-nota"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>
        <ErrorLine code={error} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            disabled={isPending}
            onClick={() =>
              run(
                () =>
                  addContact({
                    candidateId,
                    applicationId,
                    channel: channel as "whatsapp",
                    result: result as "contato_realizado",
                    note: note || undefined,
                  }),
                () => {
                  setOpen(false);
                  setNote("");
                },
              )
            }
          >
            {isPending ? "Registrando…" : "Registrar contato"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Escrever observação — o gesto de "guardei uma impressão". */
export function NoteDialog({
  candidateId,
  applicationId,
  trigger,
}: {
  candidateId: string;
  applicationId?: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [highlight, setHighlight] = useState(false);
  const { error, isPending, run } = useAction();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Escrever observação</DialogTitle>
          <DialogDescription>
            Texto livre, do tamanho que precisar. Fica registrado com seu nome e
            a data, dentro da seção Observações internas.
          </DialogDescription>
        </DialogHeader>

        {/* A confusão que isto resolve: o checkbox antigo dizia "destacar no
            topo" e era lido como "deixar sempre visível", que é o trabalho da
            nota rápida. Agora cada um diz onde age. */}
        <div className="border-l-[3px] border-l-gold-text bg-gold-bg px-3 py-2.5">
          <p className="text-note leading-relaxed text-ink-2">
            Quer uma <strong className="font-semibold">linha curta sempre
            visível</strong>, inclusive na lista do ranking? Isso é a{" "}
            <strong className="font-semibold">nota rápida</strong>, no topo da
            ficha, logo abaixo do nome — não uma observação.
          </p>
        </div>

        <Textarea
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="O que você observou"
          aria-label="Observação"
        />
        <label className="flex cursor-pointer items-start gap-2.5">
          <Checkbox
            className="mt-0.5"
            checked={highlight}
            onCheckedChange={(v) => setHighlight(Boolean(v))}
          />
          <span>
            <span className="text-dense block">
              Fixar no topo das Observações internas
            </span>
            <span className="text-meta block text-subtle">
              Só reordena dentro daquela seção. Não aparece no ranking.
            </span>
          </span>
        </label>
        <ErrorLine code={error} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            disabled={isPending || body.trim().length === 0}
            onClick={() =>
              run(
                () =>
                  addNote({
                    candidateId,
                    applicationId,
                    body: body.trim(),
                    isHighlighted: highlight,
                  }),
                () => {
                  setOpen(false);
                  setBody("");
                  setHighlight(false);
                },
              )
            }
          >
            {isPending ? "Salvando…" : "Salvar observação"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Alterar situação seletiva ou etapa operacional.
 *
 * Escopo CANDIDATURA — por isso só aparece ancorada a um lugar que nomeia a
 * campanha, nunca como botão solto no header.
 */
export function StatusDialog({
  candidateId,
  applicationId,
  applicationLabel,
  kind,
  current,
  trigger,
}: {
  candidateId: string;
  applicationId: string;
  applicationLabel: string;
  kind: "selective" | "operational";
  current: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current);
  const { error, isPending, run } = useAction();

  const isSelective = kind === "selective";
  const labels = isSelective ? selectiveStatusLabels : operationalStatusLabels;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isSelective ? "Alterar situação seletiva" : "Alterar etapa operacional"}
          </DialogTitle>
          <DialogDescription>
            {applicationLabel} ·{" "}
            {isSelective
              ? "o que a escola decidiu sobre este candidato."
              : "onde ele está no processo. Não é juízo de mérito."}
          </DialogDescription>
        </DialogHeader>
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(labels).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ErrorLine code={error} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            disabled={isPending || value === current}
            onClick={() =>
              run(
                () =>
                  updateApplicationStatus({
                    applicationId,
                    candidateId,
                    ...(isSelective
                      ? { selectiveStatus: value }
                      : { operationalStatus: value }),
                  }),
                () => setOpen(false),
              )
            }
          >
            {isPending ? "Salvando…" : "Salvar alteração"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Reclassificar — escopo pessoa, no bloco do selo de talento. */
export function ClassificationDialog({
  candidateId,
  current,
  trigger,
}: {
  candidateId: string;
  current: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current);
  const { error, isPending, run } = useAction();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reclassificar talento</DialogTitle>
          <DialogDescription>
            É o julgamento da equipe sobre a pessoa, independente da nota e
            atravessando campanhas.
          </DialogDescription>
        </DialogHeader>
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(talentClassificationLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ErrorLine code={error} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            disabled={isPending || value === current}
            onClick={() =>
              run(
                () =>
                  updateTalentClassification({
                    candidateId,
                    classification: value as "acompanhar",
                  }),
                () => setOpen(false),
              )
            }
          >
            {isPending ? "Salvando…" : "Salvar classificação"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Adicionar etiqueta — baixa frequência, só dentro da seção da candidatura. */
export function TagAdder({
  candidateId,
  applicationId,
}: {
  candidateId: string;
  applicationId: string;
}) {
  const [name, setName] = useState("");
  const { error, isPending, run } = useAction();

  return (
    <div className="mt-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          run(
            () =>
              addApplicationTag({
                applicationId,
                candidateId,
                tagName: name.trim(),
              }),
            () => setName(""),
          );
        }}
        className="flex max-w-sm gap-2"
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nova etiqueta"
          aria-label="Nova etiqueta"
        />
        <Button
          type="submit"
          variant="outline"
          disabled={isPending || !name.trim()}
        >
          {isPending ? "Adicionando…" : "Adicionar"}
        </Button>
      </form>
      <ErrorLine code={error} />
    </div>
  );
}

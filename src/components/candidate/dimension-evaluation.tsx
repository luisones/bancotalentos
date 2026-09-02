"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MeterBar } from "@/components/liceu/meter";
import { peekBlindForDimension } from "@/lib/actions/evaluations";
import type { ActionErrorCode } from "@/lib/actions/result";
import { actionErrorMessages, labelFor } from "@/lib/labels";
import type { DimensionView } from "@/lib/types/candidate-profile";
import { cn } from "@/lib/utils";
import { ScoreInput } from "./score-input";

/**
 * Uma dimensão na seção de avaliação.
 *
 * Substitui o empilhamento de N formulários inteiros da aba "Resumo": a linha
 * mostra nota, origem e cobertura, e a edição abre no lugar, uma dimensão por
 * vez. Ver e pontuar a mesma dimensão passam a ser o mesmo ato.
 */
export function DimensionEvaluation({
  dimension: d,
  applicationId,
  canWrite,
}: {
  dimension: DimensionView;
  applicationId: string;
  canWrite: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-rule-weak last:border-0">
      <div className="grid items-center gap-3 py-row-y sm:grid-cols-[minmax(0,1fr)_180px_auto]">
        <div className="min-w-0">
          <p className="text-row font-semibold">{d.name}</p>
          <p className="text-meta text-subtle">
            {d.originLabel}
            {d.own && ` · você deu ${d.own.score.toLocaleString("pt-BR")}`}
          </p>
        </div>

        <MeterBar value={d.score} display={d.display} tone={d.tone} />

        <div className="flex items-center justify-end gap-2">
          {canWrite && (
            <Button
              size="sm"
              variant={d.own ? "outline" : "default"}
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
            >
              {d.own ? "Editar minha nota" : "Avaliar"}
              {open ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>

      {open && canWrite && (
        <div className="border-t border-rule bg-sunken px-4 py-4">
          <ScoreInput
            applicationId={applicationId}
            dimensionId={d.dimensionId}
            dimensionName={d.name}
            own={d.own}
            onSaved={() => setOpen(false)}
          />
        </div>
      )}

      <PeerScores
        dimension={d}
        applicationId={applicationId}
        canWrite={canWrite}
      />
    </div>
  );
}

/** Os quatro estados de visibilidade das notas dos colegas. */
function PeerScores({
  dimension: d,
  applicationId,
  canWrite,
}: {
  dimension: DimensionView;
  applicationId: string;
  canWrite: boolean;
}) {
  if (d.hiddenPeers > 0) {
    return (
      <BlindBox
        dimension={d}
        applicationId={applicationId}
        canWrite={canWrite}
      />
    );
  }

  if (d.peers.length === 0) {
    if (d.evaluatorCount === 0) {
      return (
        <p className="text-note pb-3 text-subtle">
          {canWrite
            ? "Você será o primeiro a avaliar esta dimensão."
            : "Nenhuma avaliação registrada."}
        </p>
      );
    }
    return null;
  }

  return (
    <ul className="pb-3">
      {d.peers.map((p) => (
        <li
          key={p.evaluator}
          className="flex flex-wrap items-baseline gap-x-3 py-1"
        >
          <span data-numeric className="text-cell w-10 font-semibold text-navy">
            {p.display}
          </span>
          <span className="text-note text-muted-foreground">{p.evaluator}</span>
          {p.comment && (
            <span className="text-note basis-full pl-13 text-muted-foreground">
              {p.comment}
            </span>
          )}
        </li>
      ))}
      <li className="text-meta pt-1 text-subtle">
        média de {d.peers.length + (d.own ? 1 : 0)} · não substitui os registros
        individuais
      </li>
    </ul>
  );
}

function BlindBox({
  dimension: d,
  applicationId,
  canWrite,
}: {
  dimension: DimensionView;
  applicationId: string;
  canWrite: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<ActionErrorCode | null>(null);
  const [isPending, startTransition] = useTransition();
  const plural = d.hiddenPeers !== 1;

  function reveal() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await peekBlindForDimension(applicationId, d.dimensionId);
        if (result.ok) setConfirming(false);
        else setError(result.code);
      } catch {
        setError("erro_inesperado");
      }
    });
  }

  return (
    <>
      <div className="mb-3 rounded-panel border border-dashed border-rule-strong bg-ground px-4 py-3.5">
        <p className="text-cell flex items-center gap-2 font-semibold text-ink">
          <Lock className="size-3.5 shrink-0 text-label" aria-hidden />
          {d.hiddenPeers} colega{plural ? "s" : ""} já avaliou {d.name}.
        </p>
        <p className="text-note mt-1 max-w-prose leading-relaxed text-muted-foreground">
          As notas ficam ocultas para preservar a independência do seu
          julgamento. Elas aparecem automaticamente quando você salvar a sua.
        </p>
        {canWrite && (
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => setConfirming(true)}
          >
            Revelar antes de avaliar
          </Button>
        )}
        {error && (
          <p className="text-note mt-2 text-alert">
            {labelFor(actionErrorMessages, error)}
          </p>
        )}
      </div>

      <Dialog
        open={confirming}
        onOpenChange={(o) => !isPending && setConfirming(o)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revelar as avaliações antes de dar a sua?</DialogTitle>
            <DialogDescription>
              Você vai ver as notas e os comentários de{" "}
              <strong className="font-semibold">
                {d.hiddenPeers} colega{plural ? "s" : ""}
              </strong>{" "}
              em <strong className="font-semibold">{d.name}</strong> antes de
              registrar sua própria avaliação.
            </DialogDescription>
          </DialogHeader>
          <div className="border-l-[3px] border-l-alert bg-alert-bg px-3 py-2.5">
            <p className="text-note leading-relaxed text-ink-2">
              <strong className="font-semibold">Este acesso é registrado.</strong>{" "}
              Ficará no registro de auditoria deste candidato, com seu nome e a
              data, visível para a administração.
            </p>
          </div>
          <p className="text-note text-muted-foreground">
            A avaliação cega existe para que as notas sejam independentes. Se
            puder, avalie primeiro.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            {/* O cancelar é o primário e recebe o foco inicial. */}
            <Button
              autoFocus
              disabled={isPending}
              onClick={() => setConfirming(false)}
            >
              Voltar e avaliar primeiro
            </Button>
            <Button
              variant="outline"
              disabled={isPending}
              onClick={reveal}
              className={cn("border-alert-border text-alert")}
            >
              {isPending ? "Revelando…" : "Revelar e registrar acesso"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

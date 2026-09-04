"use client";

import { useState, useTransition } from "react";
import { StateBadge } from "@/components/liceu/chip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toggleStarred, updateApplicationStatus } from "@/lib/actions/crm";
import type { ActionErrorCode, ActionResult } from "@/lib/actions/result";
import { actionErrorMessages, candidateStatusLabels, labelFor } from "@/lib/labels";
import { statusTone } from "@/lib/status";
import { cn } from "@/lib/utils";

type Status = keyof typeof candidateStatusLabels;

/**
 * O status é uma coisa só, com a estrela ao lado.
 *
 * Antes eram três blocos — situação seletiva, etapa operacional e selo de
 * talento — com três gramáticas visuais diferentes, escolhidas justamente para
 * ensinar que não eram a mesma coisa. Se a interface precisa de três estilos
 * para evitar uma confusão, a confusão está no modelo.
 */
export function StatusControl({
  candidateId,
  applicationId,
  applicationLabel,
  status,
  starred,
  canWrite,
}: {
  candidateId: string;
  applicationId: string;
  /** "2026 SCS · História" — o status é da candidatura, não da pessoa. */
  applicationLabel: string;
  status: Status;
  starred: boolean;
  canWrite: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Status>(status);
  const [star, setStar] = useState(starred);
  const [error, setError] = useState<ActionErrorCode | null>(null);
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

  const badge = (
    <StateBadge tone={statusTone(current)}>
      {labelFor(candidateStatusLabels, current)}
    </StateBadge>
  );

  return (
    <div className="flex items-center gap-2">
      {canWrite ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="cursor-pointer rounded-chip focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-text"
              aria-label="Alterar status"
            >
              {badge}
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Status da candidatura</DialogTitle>
              <DialogDescription>
                {applicationLabel} — o status é por candidatura. A mesma pessoa
                pode estar em pontos diferentes em campanhas diferentes.
              </DialogDescription>
            </DialogHeader>

            {/* Lista inteira visível, e não um <select>: são nove opções, e ver
                o funil todo é parte de escolher onde a pessoa está nele. */}
            <div className="grid gap-1.5">
              {(Object.keys(candidateStatusLabels) as Status[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    run(
                      () =>
                        updateApplicationStatus({
                          applicationId,
                          candidateId,
                          status: key as Parameters<
                            typeof updateApplicationStatus
                          >[0]["status"],
                        }),
                      () => {
                        setCurrent(key);
                        setOpen(false);
                      },
                    )
                  }
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-chip border px-3 py-2 text-left",
                    key === current
                      ? "border-navy bg-info-bg"
                      : "border-rule hover:border-navy",
                  )}
                >
                  <StateBadge tone={statusTone(key)}>
                    {candidateStatusLabels[key]}
                  </StateBadge>
                  {key === current && (
                    <span className="text-meta text-subtle">atual</span>
                  )}
                </button>
              ))}
            </div>

            {error && (
              <p className="text-note text-alert">
                {labelFor(actionErrorMessages, error)}
              </p>
            )}
            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        badge
      )}

      <button
        type="button"
        disabled={!canWrite || isPending}
        aria-pressed={star}
        title={
          star
            ? "Destaque da equipe — clique para remover"
            : "Marcar como destaque da equipe"
        }
        onClick={() =>
          run(
            () => toggleStarred({ candidateId, starred: !star }),
            () => setStar(!star),
          )
        }
        className={cn(
          "text-lg leading-none",
          canWrite && "cursor-pointer",
          star ? "text-gold-text" : "text-faint hover:text-gold-text",
        )}
      >
        ★<span className="sr-only">Destaque da equipe</span>
      </button>
    </div>
  );
}

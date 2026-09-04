"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { PainelDetail } from "@/lib/queries/painel-detail";
import { LessonTestForm, LessonTestReadout } from "./lesson-test-form";

/*
  A ficha de aula-teste, aberta do Painel e do perfil.

  Um componente só porque é uma coisa só: os 14 critérios, quem já avaliou, e o
  formulário. Tê-la duas vezes garantiria que uma das duas ficasse para trás.

  Os dados vêm sob demanda de `/api/painel/[applicationId]`, inclusive no
  perfil. Antes o perfil os carregava sempre — uma consulta a mais em CADA
  visita, para popular um `<details>` fechado que a maioria das visitas nunca
  abre.
*/

const detailCache = new Map<string, PainelDetail>();
const inflight = new Map<string, Promise<PainelDetail>>();

export async function loadPainelDetail(
  applicationId: string,
): Promise<PainelDetail> {
  const cached = detailCache.get(applicationId);
  if (cached) return cached;

  const running = inflight.get(applicationId);
  if (running) return running;

  const promise = (async () => {
    const response = await fetch(`/api/painel/${applicationId}`);
    if (!response.ok) throw new Error(`detalhe ${response.status}`);
    const detail = (await response.json()) as PainelDetail;
    detailCache.set(applicationId, detail);
    return detail;
  })();

  inflight.set(applicationId, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(applicationId);
  }
}

export function invalidatePainelDetail(applicationId: string) {
  detailCache.delete(applicationId);
}

export type DetailState =
  | { kind: "carregando" }
  | { kind: "erro" }
  | { kind: "ok"; detail: PainelDetail };

/** Busca o detalhe quando o painel abre; guarda por candidatura. */
export function useDetail(applicationId: string, open: boolean) {
  const [state, setState] = useState<DetailState>({ kind: "carregando" });

  const load = useCallback(
    (cancelled?: () => boolean) => {
      loadPainelDetail(applicationId).then(
        (detail) => {
          if (cancelled?.()) return;
          setState({ kind: "ok", detail });
        },
        () => {
          if (cancelled?.()) return;
          setState({ kind: "erro" });
        },
      );
    },
    [applicationId],
  );

  useEffect(() => {
    if (!open) return;
    let done = false;
    load(() => done);
    return () => {
      done = true;
    };
  }, [open, load]);

  /** Depois de escrever: o que está em cache virou passado. */
  const refresh = useCallback(() => {
    invalidatePainelDetail(applicationId);
    setState({ kind: "carregando" });
    load();
  }, [applicationId, load]);

  return { state, refresh };
}

export function DetailFallback({ state }: { state: DetailState }) {
  if (state.kind === "erro") {
    return (
      <p className="text-meta text-alert">
        Não conseguimos carregar o detalhe. Feche e abra de novo.
      </p>
    );
  }
  return <p className="text-meta text-subtle">Carregando…</p>;
}

/**
 * Aula-teste: com nota, os critérios de quem avaliou; sem nota, já a ficha
 * aberta.
 *
 * Diálogo e não popover porque são 14 critérios × 11 botões — a ficha não cabe
 * numa caixa ancorada numa célula sem virar uma coluna de rolagem.
 */
export function LessonTestDialog({
  applicationId,
  candidateName,
  canWrite,
  onScoreSaved,
  children,
  triggerClassName,
  triggerLabel,
}: {
  applicationId: string;
  candidateName: string;
  canWrite: boolean;
  /** A nota da dimensão é agregada no servidor — quem chama se recarrega. */
  onScoreSaved: () => void;
  /** O que dispara o diálogo (a nota na célula, o botão no cartão). */
  children: React.ReactNode;
  triggerClassName?: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const { state, refresh } = useDetail(applicationId, open);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger aria-label={triggerLabel} className={triggerClassName}>
        {children}
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Aula-teste · {candidateName}</DialogTitle>
          <DialogDescription>
            A nota da dimensão é a média dos critérios — de todos os avaliadores
            que registraram uma aula.
          </DialogDescription>
        </DialogHeader>

        {state.kind !== "ok" ? (
          <DetailFallback state={state} />
        ) : (
          <LessonTestBody
            detail={state.detail}
            canWrite={canWrite}
            onSaved={() => {
              refresh();
              onScoreSaved();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function LessonTestBody({
  detail,
  canWrite,
  onSaved,
}: {
  detail: PainelDetail;
  canWrite: boolean;
  onSaved: () => void;
}) {
  const others = detail.lessonTests.filter(
    (test) => test.id !== detail.ownLessonTest?.id,
  );

  return (
    <div className="flex flex-col gap-4">
      {others.length > 0 && (
        <section>
          <p className="text-micro mb-1.5 uppercase tracking-micro text-label">
            {others.length === 1
              ? "Avaliação de outro avaliador"
              : `Avaliações de outros ${others.length} avaliadores`}
          </p>
          <LessonTestReadout tests={others} />
        </section>
      )}

      {canWrite && detail.canWrite ? (
        <section className={others.length > 0 ? "border-t border-rule pt-3" : ""}>
          <p className="text-micro mb-2 uppercase tracking-micro text-label">
            {detail.ownLessonTest ? "Sua avaliação" : "Avaliar esta aula"}
          </p>
          <LessonTestForm
            applicationId={detail.applicationId}
            criteria={detail.criteria}
            initialScores={detail.ownLessonTest?.scores}
            initialComment={detail.ownLessonTest?.comment}
            editing={Boolean(detail.ownLessonTest)}
            onSaved={onSaved}
          />
        </section>
      ) : (
        others.length === 0 && (
          <p className="text-meta text-subtle">
            Ninguém registrou aula-teste, e seu perfil é de consulta.
          </p>
        )
      )}
    </div>
  );
}

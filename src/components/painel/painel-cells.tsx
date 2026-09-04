"use client";

import { FileText, Video } from "lucide-react";
import { useState, useTransition } from "react";
import { StateBadge } from "@/components/liceu/chip";
import { DistanceMap } from "@/components/liceu/distance-map";
import { AnswerScores } from "@/components/candidate/answer-scores";
import {
  DetailFallback,
  LessonTestDialog,
  useDetail,
} from "@/components/candidate/lesson-test-dialog";
import { ScoreInput } from "@/components/candidate/score-input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { updateApplicationStatus, updateQuickNote } from "@/lib/actions/crm";
import type { ActionErrorCode } from "@/lib/actions/result";
import { QUICK_NOTE_MAX } from "@/lib/candidate/quick-note";
import { documentHref } from "@/lib/candidate/document-url";
import { distanceProvenance, formatKm } from "@/lib/geo/distance-label";
import {
  actionErrorMessages,
  candidateStatusLabels,
  labelFor,
} from "@/lib/labels";
import { partLongLabel, partShortLabel } from "@/lib/dimension-short";
import { formatScore } from "@/lib/scoring";
import { statusTone } from "@/lib/status";
import { cn } from "@/lib/utils";

/*
  As células que resolvem algo sem sair da lista.

  Todas seguem a mesma regra: o que a linha JÁ SABE é desenhado direto (nota,
  distância, status), e o que exige ler o banco — os 14 critérios da aula-teste,
  as 4 dissertativas, a própria nota de vídeo — só é buscado quando o painel
  abre. Mandar isso nas 707 linhas seria cerca de um megabyte de RSC para
  servir o punhado de células que alguém clica de fato.

  Nenhuma delas fica dentro de um link. A linha do Painel deixou de ser um
  <a> por causa disto: botão dentro de link é HTML inválido, e o Radix perde o
  foco ao fechar um popover ancorado num elemento que o navegador quer navegar.
*/

// ── Valores desenhados direto da linha ────────────────────────────────────

export function ScoreValue({
  value,
  className,
}: {
  value: number | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-row font-semibold",
        value === null ? "text-faint" : "text-ink",
        className,
      )}
    >
      {formatScore(value)}
    </span>
  );
}

/**
 * Nota do grupo e, abaixo, as duas partes.
 *
 * `Obj.` e `Dis.` no lugar de `DO`/`DD`/`CD`/`CO`: o cabeçalho da coluna já diz
 * "Didática", então a parte só precisa dizer qual metade ela é. As siglas de
 * duas letras continuam sendo a chave do banco, e ninguém as lê.
 */
export function GroupScoreValue({
  value,
  parts,
}: {
  value: number | null;
  parts: Array<[string, number | null]>;
}) {
  return (
    <span className="flex flex-col items-center">
      <span
        className={cn(
          "text-row font-semibold",
          value === null ? "text-faint" : "text-ink",
        )}
      >
        {formatScore(value)}
      </span>
      <span className="text-micro flex flex-wrap justify-center gap-x-1.5 tabular-nums">
        {parts.map(([code, part]) => (
          <span
            key={code}
            title={partLongLabel(code)}
            className={cn(
              "whitespace-nowrap",
              part === null ? "text-faint" : "text-subtle",
            )}
          >
            {partShortLabel(code)} {formatScore(part)}
          </span>
        ))}
      </span>
    </span>
  );
}

const CELL_TRIGGER =
  "cursor-pointer rounded-chip px-1 -mx-1 hover:bg-gold-bg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-text";

// ── Status ────────────────────────────────────────────────────────────────

type Status = keyof typeof candidateStatusLabels;

/**
 * Status trocado num clique, na própria linha.
 *
 * Menu e não diálogo: são nove opções curtas e a troca é a operação mais
 * frequente do Painel — abrir um modal para ela seria cobrar dois cliques e um
 * fechamento por cada pessoa que muda de etapa.
 */
export function StatusCell({
  applicationId,
  candidateId,
  status,
  canWrite,
  onChanged,
}: {
  applicationId: string;
  candidateId: string;
  status: string;
  canWrite: boolean;
  onChanged: (status: string) => void;
}) {
  const [error, setError] = useState<ActionErrorCode | null>(null);
  const [isPending, startTransition] = useTransition();

  const badge = (
    <StateBadge tone={statusTone(status)}>
      {labelFor(candidateStatusLabels, status)}
    </StateBadge>
  );

  if (!canWrite) return badge;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Status: ${labelFor(candidateStatusLabels, status)}. Alterar.`}
        className={cn(CELL_TRIGGER, isPending && "opacity-60")}
      >
        {badge}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-auto min-w-56">
        <DropdownMenuLabel className="text-micro uppercase tracking-micro text-label">
          Status da candidatura
        </DropdownMenuLabel>
        {(Object.keys(candidateStatusLabels) as Status[]).map((key) => (
          <DropdownMenuItem
            key={key}
            disabled={isPending}
            onSelect={() => {
              if (key === status) return;
              setError(null);
              startTransition(async () => {
                const result = await updateApplicationStatus({
                  applicationId,
                  candidateId,
                  status: key as Parameters<
                    typeof updateApplicationStatus
                  >[0]["status"],
                });
                if (result.ok) onChanged(key);
                else setError(result.code);
              });
            }}
            className="gap-2"
          >
            <StateBadge tone={statusTone(key)}>
              {candidateStatusLabels[key]}
            </StateBadge>
            {key === status && (
              <span className="text-meta text-subtle">atual</span>
            )}
          </DropdownMenuItem>
        ))}
        {error && (
          <p className="text-meta px-2 py-1 text-alert">
            {labelFor(actionErrorMessages, error)}
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Aula-teste ────────────────────────────────────────────────────────────

export function LessonTestCell({
  applicationId,
  candidateName,
  score,
  canWrite,
  onScoreSaved,
}: {
  applicationId: string;
  candidateName: string;
  score: number | null;
  canWrite: boolean;
  /** A nota da dimensão é agregada no servidor — a linha se recarrega. */
  onScoreSaved: () => void;
}) {
  return (
    <LessonTestDialog
      applicationId={applicationId}
      candidateName={candidateName}
      canWrite={canWrite}
      onScoreSaved={onScoreSaved}
      triggerClassName={CELL_TRIGGER}
      triggerLabel={
        score === null
          ? "Sem nota de aula-teste. Avaliar."
          : `Aula-teste ${formatScore(score)}. Ver critérios.`
      }
    >
      <ScoreValue value={score} />
    </LessonTestDialog>
  );
}

// ── Didática ──────────────────────────────────────────────────────────────

/**
 * Didática: as quatro dissertativas, com a nota de cada uma.
 *
 * A parte objetiva não abre nada. Ela vem das práticas autodeclaradas, e a
 * lista das 19 declarações não é o que decide nada aqui — só o número dela
 * aparece, na própria célula.
 */
export function DidaticaCell({
  applicationId,
  candidateId,
  score,
  parts,
  canWrite,
  onScoreSaved,
}: {
  applicationId: string;
  candidateId: string;
  score: number | null;
  parts: Array<[string, number | null]>;
  canWrite: boolean;
  /** Substituir a nota de uma dissertativa recalcula a nota do grupo. */
  onScoreSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { state, refresh } = useDetail(applicationId, open);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`Didática ${formatScore(score)}. Ver as respostas dissertativas.`}
        className={cn(CELL_TRIGGER, "block w-full text-center")}
      >
        <GroupScoreValue value={score} parts={parts} />
      </PopoverTrigger>
      <PopoverContent align="center" className="w-[min(92vw,640px)]">
        <p className="text-micro mb-2 uppercase tracking-micro text-label">
          Didática dissertativa
        </p>
        {state.kind !== "ok" ? (
          <DetailFallback state={state} />
        ) : state.detail.answers.length === 0 ? (
          <p className="text-meta text-subtle">
            O candidato não respondeu ao formulário de didática.
          </p>
        ) : (
          <AnswerScores
            candidateId={candidateId}
            answers={state.detail.answers}
            canWrite={canWrite && state.detail.canWrite}
            onSaved={() => {
              // Sem isto, o detalhe em cache guardaria as porcentagens de
              // antes: reabrir o popover mostraria a nota velha da pergunta ao
              // lado de uma coluna já recalculada.
              refresh();
              onScoreSaved();
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

// ── Vídeo ─────────────────────────────────────────────────────────────────

/**
 * Vídeo: a nota, quando existe, e o ícone sempre que há arquivo para abrir.
 *
 * Sem nota, o ícone É o caminho — assistir vem antes de avaliar. Com nota, o
 * número abre o lançamento e o ícone continua ali, senão some o sinal de que
 * o vídeo existe.
 */
export function VideoCell({
  applicationId,
  score,
  hasVideo,
  canWrite,
  onScoreSaved,
}: {
  applicationId: string;
  score: number | null;
  hasVideo: boolean;
  canWrite: boolean;
  onScoreSaved: () => void;
}) {
  const scoreNode =
    score !== null || !hasVideo ? <ScoreValue value={score} /> : null;

  const scoreTrigger =
    canWrite && scoreNode ? (
      <VideoScorePopover
        applicationId={applicationId}
        hasVideo={hasVideo}
        onScoreSaved={onScoreSaved}
        trigger={scoreNode}
      />
    ) : (
      scoreNode
    );

  const videoLink = hasVideo ? (
    <VideoLink applicationId={applicationId} />
  ) : null;

  const gradeHint =
    canWrite && score === null && hasVideo ? (
      <VideoScorePopover
        applicationId={applicationId}
        hasVideo
        onScoreSaved={onScoreSaved}
        trigger={
          <span className="text-meta font-semibold text-gold-text opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 max-md:opacity-100">
            nota
          </span>
        }
      />
    ) : null;

  if (!scoreTrigger && !videoLink) {
    return <ScoreValue value={null} />;
  }

  return (
    <span className="inline-flex items-center justify-center gap-1">
      {scoreTrigger}
      {videoLink}
      {gradeHint}
    </span>
  );
}

function VideoLink({ applicationId }: { applicationId: string }) {
  return (
    <a
      href={documentHref(applicationId, "video")}
      target="_blank"
      rel="noopener noreferrer"
      title="Abrir vídeo"
      aria-label="Abrir vídeo"
      className="inline-flex rounded-chip p-0.5 text-navy hover:bg-gold-bg hover:text-gold-text"
    >
      <Video className="size-3.5" strokeWidth={1.75} aria-hidden />
    </a>
  );
}

function VideoScorePopover({
  applicationId,
  onScoreSaved,
  hasVideo = true,
  trigger,
}: {
  applicationId: string;
  onScoreSaved: () => void;
  hasVideo?: boolean;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { state, refresh } = useDetail(applicationId, open);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger aria-label="Vídeo: ver e avaliar" className={CELL_TRIGGER}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent align="center" className="w-[min(92vw,380px)]">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <p className="text-micro uppercase tracking-micro text-label">
            Vídeo
          </p>
          {hasVideo ? (
            <VideoLink applicationId={applicationId} />
          ) : (
            <span className="text-meta text-subtle">não anexado</span>
          )}
        </div>

        {state.kind !== "ok" ? (
          <DetailFallback state={state} />
        ) : !state.detail.canWrite ? (
          <p className="text-meta text-subtle">
            Seu perfil é de consulta e não registra notas.
          </p>
        ) : state.detail.videoDimensionId === null ? (
          <p className="text-meta text-alert">
            A dimensão Vídeo não está ativa no catálogo.
          </p>
        ) : (
          <ScoreInput
            applicationId={applicationId}
            dimensionId={state.detail.videoDimensionId}
            dimensionName="Vídeo"
            own={state.detail.videoOwn}
            onSaved={() => {
              refresh();
              onScoreSaved();
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

// ── Currículo ─────────────────────────────────────────────────────────────

export function CurriculoCell({
  applicationId,
  hasCurriculo,
}: {
  applicationId: string;
  hasCurriculo: boolean;
}) {
  if (!hasCurriculo) {
    return (
      <span className="text-faint" title="Currículo não anexado">
        —
      </span>
    );
  }
  return (
    <a
      href={documentHref(applicationId, "curriculo")}
      target="_blank"
      rel="noopener noreferrer"
      title="Abrir currículo"
      aria-label="Abrir currículo"
      className="inline-flex rounded-chip p-0.5 text-navy hover:bg-gold-bg hover:text-gold-text"
    >
      <FileText className="size-3.5" strokeWidth={1.75} aria-hidden />
    </a>
  );
}

// ── Distância ─────────────────────────────────────────────────────────────

export function DistanceCell({
  km,
  lat,
  lng,
  kmSantoAndre,
  kmSaoCaetano,
  mode,
  precision,
}: {
  /** O número desta coluna. */
  km: number | null;
  lat: number | null;
  lng: number | null;
  kmSantoAndre: number | null;
  kmSaoCaetano: number | null;
  mode: string | null;
  precision: string | null;
}) {
  const label = formatKm(km, mode, precision);

  if (label === null) {
    return (
      <span className="text-faint" title="Sem CEP cadastrado">
        —
      </span>
    );
  }

  return (
    <Popover>
      <PopoverTrigger
        aria-label={`${label}. Ver onde o candidato mora.`}
        title={distanceProvenance(mode, precision)}
        className={cn(CELL_TRIGGER, "text-cell text-ink")}
      >
        {label}
      </PopoverTrigger>
      <PopoverContent align="center" className="w-[min(92vw,300px)]">
        <p className="text-micro mb-2 uppercase tracking-micro text-label">
          Moradia e unidades
        </p>
        <DistanceMap
          lat={lat}
          lng={lng}
          kmSantoAndre={kmSantoAndre}
          kmSaoCaetano={kmSaoCaetano}
          mode={mode}
          precision={precision}
        />
      </PopoverContent>
    </Popover>
  );
}

// ── Nota rápida ───────────────────────────────────────────────────────────

/**
 * O lápis no fim da linha: escrever a nota rápida sem entrar no perfil.
 *
 * `expected` carrega o valor que esta aba viu — o campo é compartilhado e
 * sobrescrevível, e sem baseline duas pessoas editando ao mesmo tempo se
 * atropelam em silêncio.
 */
export function QuickNoteCell({
  candidateId,
  note,
  canWrite,
  onChanged,
}: {
  candidateId: string;
  note: string | null;
  canWrite: boolean;
  onChanged: (note: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(note ?? "");
  const [error, setError] = useState<ActionErrorCode | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canWrite) return null;

  const remaining = QUICK_NOTE_MAX - draft.trim().length;

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateQuickNote({
        candidateId,
        note: draft,
        expected: note,
      });
      if (result.ok) {
        onChanged(result.data.note);
        setOpen(false);
      } else {
        setError(result.code);
      }
    });
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(note ?? "");
        setOpen(next);
      }}
    >
      <PopoverTrigger
        aria-label={note ? "Alterar a nota rápida" : "Escrever nota rápida"}
        title={note ? "Alterar a nota rápida" : "Escrever nota rápida"}
        className={cn(
          CELL_TRIGGER,
          "text-cell",
          note ? "text-gold-text" : "text-faint hover:text-gold-text",
        )}
      >
        ✎
      </PopoverTrigger>
      <PopoverContent align="center" className="w-[min(92vw,340px)]">
        <p className="text-micro mb-1.5 uppercase tracking-micro text-label">
          Nota rápida
        </p>
        <input
          autoFocus
          value={draft}
          maxLength={QUICK_NOTE_MAX + 40}
          disabled={isPending}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
          }}
          aria-label="Nota rápida"
          placeholder="Uma linha, lida de relance no Painel"
          className="text-dense w-full rounded-chip border border-btn-border px-2.5 py-1.5"
        />
        <p
          className={cn(
            "text-micro mt-1",
            remaining < 0 ? "text-alert" : "text-subtle",
          )}
        >
          {remaining < 0
            ? `${-remaining} caracteres a mais do que cabe`
            : `${remaining} caracteres restantes`}
        </p>
        {error && (
          <p className="text-meta mt-1 text-alert">
            {labelFor(actionErrorMessages, error)}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2">
          <Button size="sm" onClick={save} disabled={isPending}>
            {isPending ? "Salvando…" : "Salvar"}
          </Button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-meta cursor-pointer text-subtle hover:underline"
          >
            Cancelar
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * A nota rápida na célula do nome, truncada em uma linha.
 *
 * Clicar nela ABRE O TEXTO, e não o perfil: a nota existe justamente para ser
 * lida varrendo a lista, e mandar quem quer ler o resto de uma frase para outra
 * página é o contrário disso. O `title` continua lá para quem usa mouse.
 */
export function QuickNoteLineButton({ note }: { note: string | null }) {
  if (!note) return null;

  return (
    <Popover>
      <PopoverTrigger
        title={note}
        aria-label={`Nota rápida: ${note}`}
        className="text-note block w-full cursor-pointer truncate text-left text-gold-text hover:underline"
      >
        {note}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,340px)]">
        <p className="text-micro mb-1 uppercase tracking-micro text-label">
          Nota rápida
        </p>
        <p className="text-note leading-relaxed text-ink-2">{note}</p>
      </PopoverContent>
    </Popover>
  );
}

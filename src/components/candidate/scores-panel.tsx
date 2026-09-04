"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MicroHeader, Panel } from "@/components/liceu/surface";
import { toneFg, toneSpine } from "@/lib/tone";
import { documentHref } from "@/lib/candidate/document-url";
import type { ProfileViewModel, ScoreCard } from "@/lib/types/candidate-profile";
import { cn } from "@/lib/utils";
import { AnswerScores } from "./answer-scores";
import { LessonTestDialog } from "./lesson-test-dialog";
import { ScoreInput } from "./score-input";

/** Qual detalhe está aberto na faixa abaixo dos cartões. */
type Expanded = "didatica" | "video" | null;

/**
 * O que este painel precisa do view model — e só isso.
 *
 * Ele é um client component, então tudo que entra por prop viaja serializado
 * para o navegador. Receber o `vm` inteiro mandava junto as 19 práticas
 * declaradas e as observações da equipe, que quem renderiza são outros painéis
 * (e o documento de impressão).
 */
export type ScoresPanelProps = {
  candidateId: string;
  candidateName: string;
  canWrite: boolean;
  scores: Pick<
    ProfileViewModel["scores"],
    "consolidated" | "display" | "coverage" | "totalDimensions" | "cards" | "answers"
  >;
  video: Pick<
    ProfileViewModel["materials"],
    "videoUrl" | "videoDimensionId" | "videoOwn"
  >;
  applicationId: string | null;
};

/**
 * As quatro notas que decidem — e a forma de mexer em cada uma.
 *
 * Antes o cartão só resumia e a evidência ficava em três faixas `<details>`
 * abaixo: para lançar aula-teste eram dois cliques e um scroll, e o avaliador
 * já tinha perdido de vista o número que ia mudar. Agora a ação está no cartão
 * a que ela pertence, e o que não cabe num cartão de 300px — as respostas
 * dissertativas, os onze botões de nota — abre numa faixa de largura total
 * logo abaixo, sem sair da vista do número.
 *
 * A ausência não é mais dita em prosa. Havia uma frase embaixo de cada cartão
 * — "Ninguém lançou nota de aula-teste.", "Só conteúdo objetiva." — quatro
 * parágrafos para quatro estados que a barra vazia e o rótulo em vermelho
 * mostram de relance.
 */
export function ScoresPanel({
  candidateId,
  candidateName,
  canWrite,
  scores,
  video,
  applicationId,
}: ScoresPanelProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Expanded>(null);

  const onScoreSaved = () => router.refresh();
  const toggle = (key: Exclude<Expanded, null>) =>
    setExpanded((prev) => (prev === key ? null : key));

  return (
    <Panel padding="none">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-rule px-[18px] py-3">
        <span
          data-numeric
          className={cn(
            "font-heading text-metric font-bold tracking-[-0.02em]",
            scores.consolidated === null ? "text-faint" : "text-navy",
          )}
        >
          {scores.display}
        </span>
        <span className="text-dense text-ink-3">
          Resultado sobre{" "}
          <strong className="font-semibold">
            {scores.coverage} de {scores.totalDimensions}
          </strong>{" "}
          itens
        </span>
      </div>

      <div className="grid gap-px bg-rule sm:grid-cols-2 xl:grid-cols-4">
        {scores.cards.map((card) => (
          <SummaryCard
            key={card.code}
            card={card}
            candidateName={candidateName}
            canWrite={canWrite}
            answerCount={scores.answers.length}
            video={video}
            applicationId={applicationId}
            expanded={expanded}
            onToggle={toggle}
            onScoreSaved={onScoreSaved}
          />
        ))}
      </div>

      {expanded === "didatica" && (
        <Band label="Respostas dissertativas" onClose={() => setExpanded(null)}>
          <AnswerScores
            candidateId={candidateId}
            answers={scores.answers}
            canWrite={canWrite}
            onSaved={onScoreSaved}
          />
        </Band>
      )}

      {expanded === "video" && applicationId && video.videoDimensionId && (
        <Band label="Nota do vídeo" onClose={() => setExpanded(null)}>
          <div className="max-w-[52ch]">
            <ScoreInput
              applicationId={applicationId}
              dimensionId={video.videoDimensionId}
              dimensionName="Vídeo"
              own={video.videoOwn}
              onSaved={() => {
                setExpanded(null);
                onScoreSaved();
              }}
            />
          </div>
        </Band>
      )}

      {!canWrite && (
        <p className="text-meta border-t border-rule px-[18px] py-2 text-subtle">
          Seu perfil é de consulta: as notas aparecem, mas não há o que lançar.
        </p>
      )}
    </Panel>
  );
}

/** A faixa de detalhe: largura total, logo abaixo da fileira de cartões. */
function Band({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-rule px-[18px] py-3">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <MicroHeader className="mb-0 border-0 pb-0">{label}</MicroHeader>
        <button
          type="button"
          onClick={onClose}
          className="text-meta cursor-pointer text-subtle hover:underline"
        >
          fechar
        </button>
      </div>
      {children}
    </div>
  );
}

/**
 * Um dos quatro números, com a barra, as partes e a ação.
 *
 * A barra segue a gramática do `MeterBar`: trilho tracejado vazio quando não há
 * nota, porque "sem avaliação" tem de ser visualmente diferente de "tirou
 * zero". A parte ausente tem o rótulo em vermelho — é o que substituiu a frase
 * "só conteúdo objetiva", e é lido sem terminar de ler.
 */
function SummaryCard({
  card,
  candidateName,
  canWrite,
  answerCount,
  video,
  applicationId,
  expanded,
  onToggle,
  onScoreSaved,
}: {
  card: ScoreCard;
  candidateName: string;
  canWrite: boolean;
  answerCount: number;
  video: ScoresPanelProps["video"];
  applicationId: string | null;
  expanded: Expanded;
  onToggle: (key: Exclude<Expanded, null>) => void;
  onScoreSaved: () => void;
}) {
  const pct =
    card.score === null
      ? 0
      : Math.max(0, Math.min(100, (card.score / 10) * 100));

  return (
    <section className="flex flex-col gap-2 bg-card px-4 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <MicroHeader className="mb-0 border-0 pb-0">{card.label}</MicroHeader>
        <CardAction
          card={card}
          candidateName={candidateName}
          canWrite={canWrite}
          answerCount={answerCount}
          video={video}
          applicationId={applicationId}
          expanded={expanded}
          onToggle={onToggle}
          onScoreSaved={onScoreSaved}
        />
      </div>

      <div className="flex items-baseline gap-2.5">
        <span
          data-numeric
          className={cn(
            "font-heading text-display-sm font-bold",
            card.score === null ? "text-faint" : toneFg[card.tone],
          )}
        >
          {card.display}
        </span>
        <div className="relative mb-1 h-1.5 min-w-0 flex-1 overflow-hidden rounded-bar bg-ground">
          {card.score === null ? (
            <div className="h-full w-full border border-dashed border-rule-strong" />
          ) : (
            <div
              className={cn("h-full rounded-bar", toneSpine[card.tone])}
              style={{ width: `${pct}%` }}
            />
          )}
        </div>
      </div>

      {card.parts.length > 0 && (
        <dl className="text-meta flex gap-x-4 tabular-nums">
          {card.parts.map((part) => (
            <div key={part.code} className="flex items-baseline gap-1">
              <dt
                title={part.label}
                className={cn(
                  // Rótulo em vermelho = esta metade não foi aplicada. É o que
                  // era a frase "só conteúdo objetiva.", em duas letras.
                  part.score === null
                    ? "font-semibold text-alert"
                    : "text-label",
                )}
              >
                {part.shortCode}
              </dt>
              <dd
                className={cn(
                  part.score === null ? "text-faint" : "font-semibold text-ink",
                )}
              >
                {part.display}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/** O que se faz neste cartão, no próprio cartão. */
function CardAction({
  card,
  candidateName,
  canWrite,
  answerCount,
  video,
  applicationId,
  expanded,
  onToggle,
  onScoreSaved,
}: {
  card: ScoreCard;
  candidateName: string;
  canWrite: boolean;
  answerCount: number;
  video: ScoresPanelProps["video"];
  applicationId: string | null;
  expanded: Expanded;
  onToggle: (key: Exclude<Expanded, null>) => void;
  onScoreSaved: () => void;
}) {
  if (card.code === "aula_teste") {
    if (!applicationId) return null;
    return (
      <LessonTestDialog
        applicationId={applicationId}
        candidateName={candidateName}
        canWrite={canWrite}
        onScoreSaved={onScoreSaved}
        triggerClassName="text-meta cursor-pointer font-semibold text-gold-text hover:underline"
        triggerLabel="Abrir a ficha de aula-teste"
      >
        {card.score === null ? (canWrite ? "avaliar" : "ver ficha") : "critérios"}
      </LessonTestDialog>
    );
  }

  if (card.code === "didatica") {
    if (answerCount === 0) return null;
    return (
      <Toggle
        active={expanded === "didatica"}
        onClick={() => onToggle("didatica")}
        idle="dissertativas"
      />
    );
  }

  if (card.code === "video") {
    return (
      <div className="flex items-baseline gap-2">
        {video.videoUrl && applicationId && (
          <a
            href={documentHref(applicationId, "video")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-meta font-semibold text-navy hover:text-gold-text hover:underline"
          >
            ver ↗
          </a>
        )}
        {canWrite && applicationId && video.videoDimensionId && (
          <Toggle
            active={expanded === "video"}
            onClick={() => onToggle("video")}
            idle={card.score === null ? "avaliar" : "alterar"}
          />
        )}
      </div>
    );
  }

  return null;
}

function Toggle({
  active,
  onClick,
  idle,
}: {
  active: boolean;
  onClick: () => void;
  idle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className="text-meta cursor-pointer font-semibold text-gold-text hover:underline"
    >
      {active ? "fechar" : idle}
    </button>
  );
}

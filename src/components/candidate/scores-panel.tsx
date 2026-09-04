import { MicroHeader, Panel } from "@/components/liceu/surface";
import { ScoreWithCoverage } from "@/components/liceu/score-with-coverage";
import { toneFg } from "@/lib/tone";
import type { ProfileViewModel, ScoreCard } from "@/lib/types/candidate-profile";
import { cn } from "@/lib/utils";
import { AnswerScores } from "./answer-scores";
import { ScoreInput } from "./score-input";

/**
 * As quatro notas que decidem, numa faixa só.
 *
 * Cada cartão abre o próprio detalhe no lugar, com `<details>` — sem JS, sem
 * navegação, sem modal. O que estava em cinco seções de acordeão (avaliação,
 * respostas, práticas, etapas) virou o detalhe do cartão a que pertence: as 19
 * práticas SÃO a didática objetiva, as 4 respostas SÃO a dissertativa.
 */
export function ScoresPanel({
  vm,
  applicationId,
}: {
  vm: ProfileViewModel;
  applicationId: string | null;
}) {
  const { scores, viewer } = vm;

  return (
    <Panel padding="none">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule px-[18px] py-3">
        <ScoreWithCoverage
          size="cell"
          consolidated={scores.consolidated}
          coverage={scores.coverage}
          totalDimensions={scores.totalDimensions}
        />
        <p className="text-meta max-w-md text-subtle">
          O Resultado pondera os quatro itens abaixo.{" "}
          <strong className="font-semibold">
            O que não foi aplicado não conta como zero
          </strong>{" "}
          — sai do cálculo, e a cobertura diz sobre quantos ele foi feito.
        </p>
      </div>

      <div className="grid gap-px bg-rule sm:grid-cols-2 xl:grid-cols-4">
        {scores.cards.map((card) => (
          <Card
            key={card.code}
            card={card}
            vm={vm}
            applicationId={applicationId}
            canWrite={viewer.canWrite}
          />
        ))}
      </div>
    </Panel>
  );
}

function Card({
  card,
  vm,
  applicationId,
  canWrite,
}: {
  card: ScoreCard;
  vm: ProfileViewModel;
  applicationId: string | null;
  canWrite: boolean;
}) {
  const detail = detailFor(card, vm, applicationId, canWrite);

  return (
    <section className="bg-card px-4 py-3.5">
      <MicroHeader className="mb-1.5">{card.label}</MicroHeader>

      <div className="flex items-baseline gap-2">
        <span
          data-numeric
          className={cn(
            "font-heading text-display-sm font-bold",
            card.score === null ? "text-faint" : toneFg[card.tone],
          )}
        >
          {card.display}
        </span>
        {card.parts.length > 0 && (
          <span className="text-meta tabular-nums text-subtle">
            {card.parts.map((part, i) => (
              <span key={part.code}>
                {i > 0 && " · "}
                <span
                  title={part.label}
                  className={part.score === null ? "text-faint" : undefined}
                >
                  {part.shortCode} {part.display}
                </span>
              </span>
            ))}
          </span>
        )}
      </div>

      {/* Uma parte ausente aparece como `—` acima e é explicada aqui. É assim
          que "fez só a objetiva" fica legível sem um aviso separado. */}
      {card.parts.some((p) => p.score === null) && card.score !== null && (
        <p className="text-meta mt-1 text-subtle">
          Só{" "}
          {card.parts
            .filter((p) => p.score !== null)
            .map((p) => p.label.toLowerCase())
            .join(" e ")}
          .
        </p>
      )}

      {card.emptyHint && !detail && (
        <p className="text-meta mt-1 text-subtle">{card.emptyHint}</p>
      )}

      {detail && (
        <details className="group mt-2">
          <summary className="text-tag cursor-pointer list-none font-semibold text-gold-text hover:underline">
            {card.emptyHint ?? "Ver detalhe"}
            <span aria-hidden className="group-open:hidden">
              {" "}
              →
            </span>
            <span aria-hidden className="hidden group-open:inline">
              {" "}
              ↓
            </span>
          </summary>
          <div className="mt-2.5 border-t border-rule-weak pt-2.5">{detail}</div>
        </details>
      )}
    </section>
  );
}

/** O que cada cartão revela quando aberto. */
function detailFor(
  card: ScoreCard,
  vm: ProfileViewModel,
  applicationId: string | null,
  canWrite: boolean,
): React.ReactNode {
  const { scores } = vm;

  if (card.code === "aula_teste") {
    return (
      <div className="flex flex-col gap-3">
        {scores.lessonTests.map((test) => (
          <div key={test.id}>
            <p className="text-tag font-semibold text-navy">
              {test.evaluatorName}
              {test.date && (
                <span className="font-normal text-subtle"> · {test.date}</span>
              )}
            </p>
            <ul className="mt-1 grid gap-x-4 sm:grid-cols-2">
              {test.criteria.map((c) => (
                <li
                  key={c.name}
                  className="text-meta flex justify-between gap-2 border-b border-rule-weak py-0.5"
                >
                  <span className="text-ink-3">{c.name}</span>
                  <span className="tabular-nums font-semibold">{c.display}</span>
                </li>
              ))}
            </ul>
            {test.comment && (
              <p className="text-meta mt-1 text-ink-3">{test.comment}</p>
            )}
          </div>
        ))}
        {canWrite && applicationId && card.dimensionId && (
          <ScoreInput
            applicationId={applicationId}
            dimensionId={card.dimensionId}
            dimensionName="Aula-teste"
            own={card.own}
          />
        )}
      </div>
    );
  }

  if (card.code === "video") {
    if (!canWrite || !applicationId || !card.dimensionId) return null;
    return (
      <ScoreInput
        applicationId={applicationId}
        dimensionId={card.dimensionId}
        dimensionName="Vídeo"
        own={card.own}
      />
    );
  }

  if (card.code === "didatica") {
    return (
      <div className="flex flex-col gap-4">
        {scores.answers.length > 0 && (
          <AnswerScores
            candidateId={vm.candidateId}
            answers={scores.answers}
            canWrite={canWrite}
          />
        )}
        {scores.practices.length > 0 && <Practices vm={vm} />}
      </div>
    );
  }

  if (card.code === "conteudo") {
    // A prova de conteúdo é importada da planilha, sem sub-itens para abrir:
    // o detalhe honesto é dizer de onde cada parte veio.
    return (
      <ul className="flex flex-col gap-1">
        {card.parts.map((part) => (
          <li
            key={part.code}
            className="text-meta flex justify-between gap-2 border-b border-rule-weak py-0.5"
          >
            <span className="text-ink-3">{part.label}</span>
            <span className="tabular-nums font-semibold">
              {part.score === null ? "não aplicada" : part.display}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return null;
}

/**
 * As 19 práticas declaradas, que somadas SÃO a didática objetiva.
 *
 * Oito delas contam ao contrário: marcar 5 em "Sermões" derruba a nota. A
 * direção fica escrita ao lado de cada uma, porque sem isso a lista parece uma
 * sequência de erros de sinal.
 */
function Practices({ vm }: { vm: ProfileViewModel }) {
  return (
    <div>
      <MicroHeader>Práticas declaradas</MicroHeader>
      <ul className="grid gap-x-5 lg:grid-cols-2">
        {vm.scores.practices.map((practice) => (
          <li key={practice.code} className="border-b border-rule-weak py-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-meta text-ink-3">{practice.label}</span>
              <span className="text-meta shrink-0 tabular-nums font-semibold">
                {practice.display}
              </span>
            </div>
            {practice.direction && (
              <span
                className={cn(
                  "text-micro",
                  practice.favorable ? "text-positive" : "text-alert",
                )}
              >
                {practice.direction}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

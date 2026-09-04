import { MicroHeader, Panel } from "@/components/liceu/surface";
import { toneFg } from "@/lib/tone";
import type { ProfileViewModel, ScoreCard } from "@/lib/types/candidate-profile";
import { cn } from "@/lib/utils";
import { AnswerScores } from "./answer-scores";
import { ScoreInput } from "./score-input";

/**
 * As quatro notas que decidem.
 *
 * Em cima, o Resultado e os quatro números — é o que responde "este professor
 * presta?" sem rolar nada. Embaixo, a evidência de onde cada número veio, em
 * LARGURA TOTAL e fechada por padrão.
 *
 * A evidência não cabe dentro do cartão: as 4 respostas dissertativas e as 19
 * práticas numa coluna de 330px viram uma tira de texto ilegível. O cartão
 * resume; a seção embaixo desdobra.
 */
export function ScoresPanel({
  vm,
  applicationId,
}: {
  vm: ProfileViewModel;
  applicationId: string | null;
}) {
  const { scores, viewer } = vm;
  const lessonCard = scores.cards.find((c) => c.code === "aula_teste");

  const hasEvidence =
    scores.answers.length > 0 ||
    scores.practices.length > 0 ||
    scores.lessonTests.length > 0 ||
    (viewer.canWrite && applicationId);

  return (
    <Panel padding="none">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2 border-b border-rule px-[18px] py-3.5">
        <div className="flex items-baseline gap-3">
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
        <p className="text-meta max-w-sm text-subtle">
          O que não foi aplicado sai do cálculo em vez de entrar como zero. Os
          pesos estão em Admin · Pesos.
        </p>
      </div>

      <div className="grid gap-px bg-rule sm:grid-cols-2 xl:grid-cols-4">
        {scores.cards.map((card) => (
          <SummaryCard key={card.code} card={card} />
        ))}
      </div>

      {hasEvidence && (
        <div className="border-t border-rule">
          {scores.answers.length > 0 && (
            <Evidence
              label="Respostas dissertativas"
              count={`${scores.answers.length} perguntas`}
              hint="A nota da Didática dissertativa sai destas quatro."
            >
              <AnswerScores
                candidateId={vm.candidateId}
                answers={scores.answers}
                canWrite={viewer.canWrite}
              />
            </Evidence>
          )}

          {scores.practices.length > 0 && (
            <Evidence
              label="Práticas declaradas"
              count={`${scores.practices.length} práticas`}
              hint="Somadas com peso e direção, elas SÃO a Didática objetiva."
            >
              <Practices vm={vm} />
            </Evidence>
          )}

          {(scores.lessonTests.length > 0 ||
            (viewer.canWrite && applicationId && lessonCard?.dimensionId)) && (
            <Evidence
              label="Aula-teste"
              count={
                scores.lessonTests.length > 0
                  ? `${scores.lessonTests.length} avaliação${scores.lessonTests.length === 1 ? "" : "ões"}`
                  : "sem avaliação"
              }
              hint={
                scores.lessonTests.length > 0
                  ? "Critérios por avaliador."
                  : "Ninguém lançou nota de aula-teste ainda."
              }
            >
              <div className="flex flex-col gap-4">
                {scores.lessonTests.map((test) => (
                  <div key={test.id}>
                    <p className="text-tag font-semibold text-navy">
                      {test.evaluatorName}
                      {test.date && (
                        <span className="font-normal text-subtle">
                          {" "}
                          · {test.date}
                        </span>
                      )}
                    </p>
                    <ul className="mt-1 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
                      {test.criteria.map((c) => (
                        <li
                          key={c.name}
                          className="text-meta flex justify-between gap-2 border-b border-rule-weak py-0.5"
                        >
                          <span className="text-ink-3">{c.name}</span>
                          <span className="font-semibold tabular-nums">
                            {c.display}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {test.comment && (
                      <p className="text-meta mt-1 text-ink-3">{test.comment}</p>
                    )}
                  </div>
                ))}
                {viewer.canWrite && applicationId && lessonCard?.dimensionId && (
                  <ScoreInput
                    applicationId={applicationId}
                    dimensionId={lessonCard.dimensionId}
                    dimensionName="Aula-teste"
                    own={lessonCard.own}
                  />
                )}
              </div>
            </Evidence>
          )}
        </div>
      )}
    </Panel>
  );
}

/**
 * Um dos quatro números, sem detalhe embutido.
 *
 * A parte ausente aparece como `—` na linha de baixo e é dita em palavras logo
 * abaixo: é assim que "fez só a objetiva" fica legível sem uma nota de rodapé.
 */
function SummaryCard({ card }: { card: ScoreCard }) {
  const missing = card.parts.filter((p) => p.score === null);
  const present = card.parts.filter((p) => p.score !== null);

  return (
    <section className="bg-card px-4 py-3.5">
      <MicroHeader className="mb-2">{card.label}</MicroHeader>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
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
          <span className="text-meta inline-grid grid-cols-2 gap-x-3 tabular-nums">
            {card.parts.map((part) => (
              <span
                key={part.code}
                title={part.label}
                className={cn(
                  "whitespace-nowrap",
                  part.score === null ? "text-faint" : "text-subtle",
                )}
              >
                {part.shortCode} {part.display}
              </span>
            ))}
          </span>
        )}
      </div>

      <p className="text-meta mt-1.5 text-subtle">
        {card.score === null
          ? (card.emptyHint ?? "Não aplicado.")
          : missing.length > 0 && present.length > 0
            ? `Só ${present.map((p) => p.label.toLowerCase()).join(" e ")}.`
            : ""}
      </p>
    </section>
  );
}

/** Faixa de evidência: fechada por padrão, largura total quando aberta. */
function Evidence({
  label,
  count,
  hint,
  children,
}: {
  label: string;
  count: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group border-b border-rule-weak last:border-b-0">
      <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-2.5 px-[18px] py-2.5 hover:bg-row-hover">
        <span
          aria-hidden
          className="text-meta w-3 shrink-0 text-gold-text transition-transform group-open:rotate-90"
        >
          ▸
        </span>
        <span className="text-cell font-semibold text-navy">{label}</span>
        <span className="text-meta text-subtle">{count}</span>
        <span className="text-meta text-subtle">— {hint}</span>
      </summary>
      <div className="px-[18px] pb-4 pt-1">{children}</div>
    </details>
  );
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
    <ul className="grid gap-x-8 md:grid-cols-2 xl:grid-cols-3">
      {vm.scores.practices.map((practice) => (
        <li
          key={practice.code}
          className="flex items-baseline justify-between gap-3 border-b border-rule-weak py-1"
        >
          <span className="text-meta min-w-0 text-ink-3">
            {practice.label}
            {practice.direction && (
              <span
                title={practice.direction}
                className={cn(
                  "ml-1.5",
                  practice.favorable ? "text-positive" : "text-alert",
                )}
              >
                {practice.favorable ? "↑" : "↓"}
              </span>
            )}
          </span>
          <span className="text-meta shrink-0 font-semibold tabular-nums">
            {practice.display}
          </span>
        </li>
      ))}
    </ul>
  );
}

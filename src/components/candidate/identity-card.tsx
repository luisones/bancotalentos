import { Chip } from "@/components/liceu/chip";
import { FieldGrid } from "@/components/liceu/field-block";
import { MicroHeader, Panel } from "@/components/liceu/surface";
import { initialsOf } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toneFg, type Tone } from "@/lib/tone";

/**
 * Card de identidade.
 *
 * Denso de propósito: nome, nota rápida, chips, blocos rótulo→valor e a pilha
 * de ações cabem acima da dobra. Nunca ganha imagem de herói, gradiente ou
 * fundo decorativo — isso viraria "marketing styling on operational UI".
 */
export function IdentityCard({
  eyebrow,
  name,
  quickNote,
  quickNoteAuthorship,
  chips,
  selective,
  operational,
  classification,
  contact,
  actions,
  footnote,
}: {
  eyebrow: string;
  name: string;
  quickNote: string | null;
  quickNoteAuthorship?: string | null;
  chips: string[];
  selective: { label: string; tone: Tone; action?: React.ReactNode };
  operational: { label: string; action?: React.ReactNode };
  classification: { label: string; action?: React.ReactNode };
  contact: React.ReactNode;
  actions: React.ReactNode;
  footnote?: string;
}) {
  return (
    <Panel>
      <div className="flex flex-wrap items-start gap-6">
        <div
          aria-hidden
          className="font-heading grid h-32 w-26 shrink-0 place-items-center rounded-chip bg-navy text-initials font-bold tracking-[-0.02em] text-gold"
        >
          {initialsOf(name)}
        </div>

        <div className="min-w-0 flex-1 basis-80">
          <p className="font-heading text-eyebrow font-bold uppercase tracking-eyebrow text-gold-text">
            {eyebrow}
          </p>
          <h1 className="font-heading text-h1 my-1.5 font-bold tracking-[-0.02em] text-navy [overflow-wrap:anywhere]">
            {name}
          </h1>

          {/* Só EXIBIÇÃO. Toda escrita acontece no diálogo único do topo,
              para não haver dois caminhos que parecem fazer o mesmo. */}
          {quickNote && (
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <p className="text-dense border-l-2 border-l-gold-text pl-2.5 text-ink-3">
                {quickNote}
              </p>
              {quickNoteAuthorship && (
                <span className="text-meta text-subtle">
                  {quickNoteAuthorship}
                </span>
              )}
            </div>
          )}

          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {chips.map((c) => (
                <Chip key={c}>{c}</Chip>
              ))}
            </div>
          )}

          <FieldGrid className="mt-5">
            {/* Três gramáticas visuais mutuamente exclusivas. A mistura numa
                fileira única de badges é o que hoje ensina ao usuário que
                situação seletiva, etapa e selo são a mesma coisa. */}
            <div>
              <MicroHeader>Situação seletiva</MicroHeader>
              <span
                className={cn(
                  "text-cell inline-block rounded-chip px-2.5 py-1 font-semibold text-white",
                  {
                    navy: "bg-navy",
                    gold: "bg-gold-text",
                    alert: "bg-alert",
                    positive: "bg-positive",
                    neutral: "bg-neutral-fg",
                  }[selective.tone],
                )}
              >
                {selective.label}
              </span>
              <p className="text-meta mt-1.5 text-subtle">
                o que a escola decidiu
              </p>
              {selective.action}
            </div>

            <div>
              <MicroHeader>Etapa operacional</MicroHeader>
              {/* Nunca semântica: no instante em que "entrevista agendada"
                  fica verde, o usuário lê progresso como aprovação. */}
              <span className="text-cell inline-flex items-center gap-2 rounded-chip border border-btn-border px-2.5 py-1 font-semibold text-navy">
                <span
                  aria-hidden
                  className="size-2 rounded-full border border-navy"
                />
                {operational.label}
              </span>
              <p className="text-meta mt-1.5 text-subtle">
                onde ele está agora
              </p>
              {operational.action}
            </div>

            <div>
              <MicroHeader>Selo de talento</MicroHeader>
              {/* Sem caixa, para não parecer status. */}
              <span className="text-cell inline-flex items-center gap-1.5 font-semibold text-gold-text">
                <span aria-hidden>★</span>
                {classification.label}
              </span>
              <p className="text-meta mt-1.5 text-subtle">
                julgamento da equipe, independente da nota
              </p>
              {classification.action}
            </div>

            <div>
              <MicroHeader>Contato</MicroHeader>
              {contact}
            </div>
          </FieldGrid>
        </div>

        <div className="flex w-full max-w-[240px] shrink-0 flex-col gap-2 max-md:max-w-none">
          <div className="grid gap-2 md:grid-cols-1 max-md:grid-cols-2">
            {actions}
          </div>
          {footnote && (
            <p className="text-meta mt-0.5 leading-snug text-subtle">
              {footnote}
            </p>
          )}
        </div>
      </div>
    </Panel>
  );
}

/** Link de ação inline, no bloco a que a informação pertence. */
export function InlineAction({
  children,
  onClickHref,
}: {
  children: React.ReactNode;
  onClickHref: string;
}) {
  return (
    <a
      href={onClickHref}
      className="text-tag mt-1 inline-block font-semibold text-gold-text hover:underline"
    >
      {children} →
    </a>
  );
}

export { toneFg };

import { Panel } from "@/components/liceu/surface";
import { DistanceMap } from "@/components/liceu/distance-map";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { initialsOf } from "@/lib/format";
import type { ProfileViewModel } from "@/lib/types/candidate-profile";
import { cn } from "@/lib/utils";
import { QuickNoteEditor } from "./quick-note-editor";
import { StatusControl } from "./status-control";
import { WhatsAppIcon } from "@/components/liceu/icons";

/**
 * Quem é, para o quê concorre, onde está e como se compara.
 *
 * Denso de propósito: nome, disciplina, status, posição, contato, nota rápida,
 * inglês e distância cabem acima da dobra. Os três blocos de status antigos —
 * situação seletiva, etapa operacional, selo de talento — viraram uma tag só
 * com estrela.
 *
 * A fileira de pastilhas `AT · DO · DD · CD · CO · VD` saiu. Eram seis siglas
 * de duas letras que ninguém decodifica, repetindo números que aparecem
 * nomeados por extenso nos cartões de Resultado logo abaixo.
 */
export function IdentityCard({ vm }: { vm: ProfileViewModel }) {
  const { identity: id, focused, viewer } = vm;

  return (
    <Panel>
      <div className="flex flex-wrap items-start gap-5">
        <div
          aria-hidden
          className="font-heading grid size-16 shrink-0 place-items-center rounded-chip bg-navy text-title font-bold tracking-[-0.02em] text-gold"
        >
          {initialsOf(id.name)}
        </div>

        <div className="min-w-0 flex-1 basis-96">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h1 className="font-heading text-h1 font-bold tracking-[-0.02em] text-navy [overflow-wrap:anywhere]">
              {id.name}
            </h1>
            {focused && (
              <StatusControl
                candidateId={vm.candidateId}
                applicationId={focused.applicationId}
                applicationLabel={focused.label}
                status={id.status}
                starred={id.starred}
                canWrite={viewer.canWrite}
              />
            )}
          </div>

          <p className="text-dense mt-1 flex flex-wrap items-baseline gap-x-2 text-ink-3">
            <span className="font-semibold text-navy">
              {id.disciplineName ?? "Sem disciplina"}
            </span>
            {id.campaignName && (
              <span className="text-subtle">· {id.campaignName}</span>
            )}
            {id.positions.map((position) => (
              <span key={position.scope} className="text-gold-text">
                · {position.label}{" "}
                <span className="text-subtle">{position.scope}</span>
              </span>
            ))}
          </p>

          <div className="mt-3">
            <QuickNoteEditor
              candidateId={vm.candidateId}
              note={id.quickNote}
              canWrite={viewer.canWrite}
            />
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2">
            <Fact label="Inglês" value={id.englishLevel} />
            <DistanceFact
              label="Santo André"
              value={id.distances.santoAndre}
              distances={id.distances}
            />
            <DistanceFact
              label="São Caetano"
              value={id.distances.saoCaetano}
              distances={id.distances}
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {id.whatsappUrl ? (
            <a
              href={id.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={`WhatsApp · ${id.phone}`}
              className="grid size-9 place-items-center rounded-chip border border-positive-border bg-positive-bg text-positive hover:bg-positive hover:text-white"
            >
              <WhatsAppIcon className="size-4" />
              <span className="sr-only">Abrir conversa no WhatsApp</span>
            </a>
          ) : (
            <span className="text-meta text-subtle">Sem telefone</span>
          )}

          {id.email ? (
            <a
              href={`mailto:${id.email}`}
              title={id.email}
              className="text-cell rounded-chip border border-btn-border px-3 py-1.5 font-semibold text-navy hover:border-navy hover:bg-info-bg"
            >
              E-mail
            </a>
          ) : (
            <span className="text-meta text-subtle">Sem e-mail</span>
          )}
        </div>
      </div>
    </Panel>
  );
}

/**
 * Distância que abre o mini-mapa.
 *
 * "18 km" responde "longe?" e não responde "longe para que lado?" — e a
 * resposta importa quando a pessoa mora entre as duas unidades. Sem CEP não há
 * nada a abrir, e o campo volta a ser um `Fact` inerte.
 */
function DistanceFact({
  label,
  value,
  distances,
}: {
  label: string;
  value: string | null;
  distances: ProfileViewModel["identity"]["distances"];
}) {
  if (!value) return <Fact label={label} value={null} />;

  return (
    <Popover>
      <PopoverTrigger
        aria-label={`${label}: ${value}. Ver no mapa.`}
        title={distances.note ?? undefined}
        className="flex cursor-pointer items-baseline gap-1.5 rounded-chip px-1 -mx-1 hover:bg-gold-bg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-text"
      >
        <span className="text-micro uppercase tracking-micro text-label">
          {label}
        </span>
        <span className="text-cell font-semibold text-ink">{value}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,300px)]">
        <p className="text-micro mb-2 uppercase tracking-micro text-label">
          Moradia e unidades
        </p>
        <DistanceMap
          lat={distances.lat}
          lng={distances.lng}
          kmSantoAndre={distances.kmSantoAndre}
          kmSaoCaetano={distances.kmSaoCaetano}
          mode={distances.mode}
          precision={distances.precision}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Rótulo pequeno + valor, para o que é contexto e não decisão. */
function Fact({
  label,
  value,
  title,
}: {
  label: string;
  value: string | null;
  title?: string | null;
}) {
  return (
    <span
      className="flex items-baseline gap-1.5"
      title={value ? (title ?? undefined) : undefined}
    >
      <span className="text-micro uppercase tracking-micro text-label">
        {label}
      </span>
      <span
        className={cn(
          "text-cell font-semibold",
          value ? "text-ink" : "text-faint",
        )}
      >
        {value ?? "—"}
      </span>
    </span>
  );
}

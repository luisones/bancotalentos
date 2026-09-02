"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneSpine, type Tone } from "@/lib/tone";
import { StateBadge } from "./chip";
import { SectionSummary, type SummaryItem } from "./section-summary";

const STORAGE_KEY = "liceu:perfil:secoes:v1";

/*
  A preferência de seções abertas é um STORE EXTERNO (localStorage), então é
  lida com useSyncExternalStore em vez de setState dentro de um efeito. Isso
  evita render em cascata e resolve o mismatch de hidratação de raiz: o
  servidor entrega `defaultOpen`, e o cliente sincroniza depois.
*/
const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  window.addEventListener("storage", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
}

function readSnapshot(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Aba privada ou cookies bloqueados: segue com o default do servidor.
    return null;
  }
}

function writeSnapshot(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* preferência é conveniência, não estado essencial */
  }
  for (const fn of listeners) fn();
}

type AccordionState = {
  isOpen: (id: string) => boolean;
  toggle: (id: string) => void;
  openAll: () => void;
  closeAll: () => void;
  openCount: number;
  total: number;
};

const Ctx = createContext<AccordionState | null>(null);

function useAccordion(): AccordionState {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("<Section> precisa estar dentro de <SectionAccordion>");
  }
  return ctx;
}

/**
 * Acordeão de seções.
 *
 * Nunca desmonta o corpo — alterna o atributo `hidden`. Custa o HTML completo
 * a cada load, e em troca: o Ctrl+F do navegador encontra conteúdo fechado, o
 * @media print força tudo aberto, "Expandir tudo" é instantâneo sem fetch, e
 * não há busca de dados no cliente.
 */
export function SectionAccordion({
  sections,
  defaultOpen,
  persist = true,
  children,
}: {
  /** Ids na ordem de renderização. */
  sections: string[];
  /** Calculado no servidor: seções com pendência nascem abertas. */
  defaultOpen: string[];
  persist?: boolean;
  children: React.ReactNode;
}) {
  const stored = useSyncExternalStore(
    subscribe,
    readSnapshot,
    () => null, // snapshot do servidor: sem preferência
  );

  // Sobrescrita local da sessão, para o toggle funcionar sem persistência.
  const [override, setOverride] = useState<string[] | null>(null);

  const open = useMemo(() => {
    if (override) return new Set(override);
    if (persist && stored) {
      try {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return new Set(parsed.filter((s): s is string => typeof s === "string"));
        }
      } catch {
        /* preferência corrompida: cai no default */
      }
    }
    return new Set(defaultOpen);
  }, [override, stored, persist, defaultOpen]);

  const commit = useCallback(
    (next: Set<string>) => {
      const ids = [...next];
      setOverride(ids);
      if (persist) writeSnapshot(ids);
    },
    [persist],
  );

  const value = useMemo<AccordionState>(
    () => ({
      isOpen: (id) => open.has(id),
      toggle: (id) => {
        const next = new Set(open);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        commit(next);
      },
      openAll: () => commit(new Set(sections)),
      closeAll: () => commit(new Set()),
      openCount: sections.filter((id) => open.has(id)).length,
      total: sections.length,
    }),
    [open, commit, sections],
  );

  return (
    <Ctx.Provider value={value}>
      <div className="flex flex-col gap-4">{children}</div>
    </Ctx.Provider>
  );
}

export function Section({
  id,
  tone,
  title,
  summary,
  badge,
  scope,
  locked,
  children,
}: {
  id: string;
  /** Espinha de 5px: categoria semântica da seção. */
  tone: Tone;
  title: string;
  /** Entrega o essencial SEM abrir. Máximo 4 itens. */
  summary: SummaryItem[];
  badge?: { label: string; tone: Tone };
  /** Chip de escopo candidatura, ex.: "EFAF-EM 2025 · História". */
  scope?: string;
  /** Bloqueia a abertura e explica por quê, em vez de mostrar o corpo. */
  locked?: { reason: string };
  children: React.ReactNode;
}) {
  const { isOpen, toggle } = useAccordion();
  const open = isOpen(id);
  const bodyId = `${id}-corpo`;

  return (
    <section
      id={id}
      data-section
      className="overflow-hidden rounded-panel border border-rule-strong bg-card"
    >
      <h2>
        <button
          type="button"
          onClick={() => toggle(id)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="grid w-full cursor-pointer grid-cols-[var(--spacing-spine-w)_minmax(0,1fr)_auto] items-center gap-4 py-[15px] pl-0 pr-5 text-left hover:bg-row-hover"
        >
          <span
            aria-hidden
            className={cn("h-spine-h w-spine-w", toneSpine[tone])}
          />
          <span className="min-w-0">
            <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="font-heading text-title font-bold text-navy">
                {title}
              </span>
              {scope && (
                <span className="text-meta font-semibold text-gold-text">
                  {scope}
                </span>
              )}
            </span>
            <SectionSummary items={summary} className="mt-px" />
          </span>
          <span className="flex items-center gap-3.5">
            {badge && <StateBadge tone={badge.tone}>{badge.label}</StateBadge>}
            <span aria-hidden className="w-3.5 text-center text-gold-text">
              {open ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
            </span>
          </span>
        </button>
      </h2>
      <div
        id={bodyId}
        data-section-body
        hidden={!open}
        className="border-t border-rule px-5 pb-[22px] pt-[18px]"
      >
        {locked ? (
          <p className="text-dense text-muted-foreground">{locked.reason}</p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

/**
 * Expandir/Recolher tudo. Mostra a contagem — sem ela os dois botões são
 * decoração; com ela, são estado.
 */
export function ExpandAllControls({
  label = "Áreas de informação · clique para abrir",
}: {
  label?: string;
}) {
  const { openAll, closeAll, openCount, total } = useAccordion();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-0.5 pt-1.5">
      <div className="font-heading text-note font-bold uppercase tracking-eyebrow text-label">
        {label}
      </div>
      <div className="flex items-center gap-2">
        {total > 0 && (
          <span data-numeric className="text-meta text-subtle">
            {openCount} de {total} abertas
          </span>
        )}
        <button
          type="button"
          onClick={openAll}
          className="font-heading text-note cursor-pointer rounded-chip border border-btn-border bg-card px-3 py-1.5 font-semibold text-navy hover:bg-btn-hover-bg"
        >
          Expandir tudo
        </button>
        <button
          type="button"
          onClick={closeAll}
          className="font-heading text-note cursor-pointer rounded-chip border border-btn-border bg-card px-3 py-1.5 font-semibold text-navy hover:bg-btn-hover-bg"
        >
          Recolher tudo
        </button>
      </div>
    </div>
  );
}

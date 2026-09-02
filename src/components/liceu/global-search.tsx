"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { SearchResult } from "@/app/api/busca/route";
import { initialsOf } from "@/lib/format";
import { cn } from "@/lib/utils";
import { QuickNoteLine } from "./quick-note";

type State =
  | { kind: "idle"; total: number | null }
  | { kind: "pending" }
  | { kind: "ok"; results: SearchResult[]; truncated: boolean }
  | { kind: "erro" };

/** Abre com ⌘K/Ctrl+K, ou "/" quando nada está focado. */
export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [state, setState] = useState<State>({ kind: "idle", total: null });
  const [cursor, setCursor] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === "k") {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (e.key === "/" && !isTyping(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const search = useCallback(async (q: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (q.trim().length < 2) {
      try {
        const res = await fetch("/api/busca?q=", { signal: controller.signal });
        const data = await res.json();
        setState({ kind: "idle", total: data.total ?? null });
      } catch {
        // Abort é esperado a cada tecla; não é erro.
      }
      return;
    }

    setState({ kind: "pending" });
    try {
      const res = await fetch(`/api/busca?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setState({
        kind: "ok",
        results: data.results ?? [],
        truncated: Boolean(data.truncated),
      });
      setCursor(0);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setState({ kind: "erro" });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => void search(term), 180);
    return () => clearTimeout(t);
  }, [term, open, search]);

  function go(result: SearchResult) {
    setOpen(false);
    setTerm("");
    router.push(`/candidatos/${result.id}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buscar candidato"
        className="text-dense flex items-center gap-2 rounded-chip border border-hairline-on-navy px-2.5 py-1.5 text-nav-idle hover:text-white"
      >
        <Search className="size-3.5" aria-hidden />
        <span className="hidden lg:inline">Buscar</span>
        <kbd className="text-micro hidden rounded-chip border border-hairline-on-navy px-1 py-px lg:inline">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Buscar candidato"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-auto bg-overlay px-5 py-20"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[620px] overflow-hidden rounded-panel bg-card shadow-[0_30px_80px_rgba(0,0,0,.3)]"
          >
            <div className="flex items-center gap-3 border-b border-rule px-5 py-4">
              <Search className="size-4 shrink-0 text-label" aria-hidden />
              <input
                autoFocus
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                  if (state.kind !== "ok") return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setCursor((c) => Math.min(c + 1, state.results.length - 1));
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setCursor((c) => Math.max(c - 1, 0));
                  }
                  if (e.key === "Enter" && state.results[cursor]) {
                    go(state.results[cursor]);
                  }
                }}
                placeholder="Nome, e-mail ou código do candidato"
                className="text-title-sm w-full border-0 bg-transparent text-ink outline-none placeholder:text-subtle"
              />
            </div>

            {state.kind === "idle" && (
              <p className="text-dense px-5 py-6 text-muted-foreground">
                {state.total
                  ? `Digite para buscar entre ${state.total} candidatos.`
                  : "Digite ao menos duas letras para buscar."}
              </p>
            )}
            {state.kind === "pending" && (
              <p className="text-dense px-5 py-6 text-muted-foreground">
                Buscando…
              </p>
            )}
            {state.kind === "erro" && (
              <p className="text-dense px-5 py-6 text-alert">
                A busca falhou. Tente de novo.
              </p>
            )}
            {state.kind === "ok" && state.results.length === 0 && (
              <p className="text-dense px-5 py-6 text-muted-foreground">
                Nenhum candidato encontrado para “{term}”.
              </p>
            )}
            {state.kind === "ok" &&
              state.results.map((r, i) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => go(r)}
                  onMouseEnter={() => setCursor(i)}
                  className={cn(
                    "grid w-full grid-cols-[34px_minmax(0,1fr)] items-center gap-3 border-b border-rule-weak px-5 py-3 text-left",
                    i === cursor ? "bg-row-hover" : "bg-card",
                  )}
                >
                  <span className="font-heading grid size-[30px] place-items-center rounded-chip bg-navy text-meta font-bold text-gold">
                    {initialsOf(r.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="text-row block truncate font-semibold">
                      {r.name}
                    </span>
                    {r.sub && (
                      <span className="text-tag block truncate text-label">
                        {r.sub}
                      </span>
                    )}
                    <QuickNoteLine note={r.quickNote} />
                  </span>
                </button>
              ))}
            {state.kind === "ok" && state.truncated && (
              <p className="text-meta px-5 py-2.5 text-subtle">
                Mostrando os 20 primeiros. Refine o termo ou use os filtros do
                ranking.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

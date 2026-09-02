import { Segmented } from "@/components/liceu/segmented";
import { MicroHeader } from "@/components/liceu/surface";

/**
 * Candidatura em foco.
 *
 * Segmented e não dropdown: cada aba mostra campanha, disciplina, consolidado,
 * cobertura e situação, então o histórico fica legível SEM trocar o foco. É o
 * antídoto para "seletor confuso" — o controle é ele mesmo um resumo
 * comparativo. Server Component: o estado vive em ?candidatura=.
 */
export function ApplicationSwitcher({
  candidateId,
  applications,
  focusedId,
  extraQuery,
}: {
  candidateId: string;
  applications: Array<{ applicationId: string; label: string; sub: string }>;
  focusedId: string | null;
  /** Preserva os filtros do ranking para o prev/next continuar funcionando. */
  extraQuery?: string;
}) {
  if (applications.length <= 1) return null;

  return (
    <div>
      <MicroHeader className="mb-1.5 border-0 pb-0">
        Candidatura em foco
      </MicroHeader>
      <div className="max-md:-mx-4 max-md:overflow-x-auto max-md:px-4">
        <Segmented
          className="max-md:w-max max-md:flex-nowrap"
          value={focusedId ?? ""}
          hrefFor={(id) => {
            const q = new URLSearchParams(extraQuery ?? "");
            q.set("candidatura", id);
            return `/candidatos/${candidateId}?${q.toString()}`;
          }}
          items={applications.map((a) => ({
            value: a.applicationId,
            label: a.label,
            sub: a.sub,
          }))}
        />
      </div>
    </div>
  );
}

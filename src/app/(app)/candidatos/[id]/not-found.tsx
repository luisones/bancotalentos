import { EmptyState } from "@/components/liceu/states";

export default function CandidateNotFound() {
  return (
    <div className="mx-auto max-w-measure py-10">
      <EmptyState
        title="Candidato não encontrado."
        hint="Ele pode ter sido mesclado a outro registro, ou o endereço está incorreto."
        action={{ label: "Buscar no ranking", href: "/ranking" }}
      />
    </div>
  );
}

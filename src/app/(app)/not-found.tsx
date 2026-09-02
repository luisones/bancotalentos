import { EmptyState } from "@/components/liceu/states";

export default function AppNotFound() {
  return (
    <div className="mx-auto max-w-measure py-10">
      <EmptyState
        title="Página não encontrada."
        hint="O endereço pode ter mudado. Volte ao ranking para continuar."
        action={{ label: "Ir para o ranking", href: "/ranking" }}
      />
    </div>
  );
}

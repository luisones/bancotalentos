"use client";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/liceu/states";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-measure py-10">
      <ErrorState
        title="Não conseguimos carregar esta tela."
        detail={
          error.digest
            ? `Se o problema continuar, informe o código ${error.digest} à administração.`
            : "Tente de novo. Se o problema continuar, avise a administração."
        }
        retry={
          <Button size="sm" variant="outline" onClick={reset}>
            Tentar de novo
          </Button>
        }
      />
    </div>
  );
}

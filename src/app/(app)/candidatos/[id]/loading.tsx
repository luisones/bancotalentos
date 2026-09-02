import { Skeleton } from "@/components/ui/skeleton";

/**
 * A página do perfil faz ~15 queries e não tinha fallback nenhum.
 * As alturas espelham o conteúdo final para não haver salto de layout.
 */
export default function CandidateLoading() {
  return (
    <div className="flex flex-col gap-4 py-4">
      <Skeleton className="h-4 w-72" />
      <div className="rounded-panel border border-rule-strong bg-card px-[26px] py-6">
        <div className="flex flex-wrap gap-6">
          <Skeleton className="h-32 w-26 shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-3 w-56" />
            <Skeleton className="h-9 w-96 max-w-full" />
            <Skeleton className="h-5 w-72" />
            <div className="grid gap-4 pt-3 sm:grid-cols-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </div>
          <div className="w-full max-w-[240px] space-y-2">
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
            <Skeleton className="h-11" />
          </div>
        </div>
      </div>
      <Skeleton className="h-[92px]" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-[70px]" />
      ))}
    </div>
  );
}

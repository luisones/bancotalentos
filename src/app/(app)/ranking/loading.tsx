import { Skeleton } from "@/components/ui/skeleton";

/** Alturas espelham o conteúdo final para não haver salto de layout. */
export default function RankingLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="pb-3.5 pt-[18px]">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="mt-2 h-7 w-80" />
        <Skeleton className="mt-1.5 h-4 w-64" />
      </div>
      <Skeleton className="h-[104px] w-full" />
      <div className="rounded-panel border border-rule-strong bg-card p-2 pt-3">
        <Skeleton className="mx-3 h-3 w-full max-w-3xl" />
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="mx-3 mt-4 h-8" />
        ))}
      </div>
    </div>
  );
}

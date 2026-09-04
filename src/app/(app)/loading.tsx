import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 pt-[18px]">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-[132px] w-full" />
      <Skeleton className="h-[520px] w-full" />
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container-page py-10">
      <Skeleton className="mb-2 h-8 w-56" />
      <Skeleton className="mb-8 h-5 w-32" />
      <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
        <Skeleton className="hidden h-96 rounded-xl lg:block" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

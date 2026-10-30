import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-6">
        <div className="flex items-center gap-5">
          <Skeleton className="size-24 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-64" />
          </div>
        </div>
        <Skeleton className="h-20" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-[36rem] rounded-xl" />
    </div>
  );
}

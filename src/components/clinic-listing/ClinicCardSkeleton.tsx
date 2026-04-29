import { Skeleton } from "@/components/ui/skeleton";

export const ClinicCardSkeleton = () => {
  return (
    <div className="bg-white/90 backdrop-blur-glass rounded-2xl overflow-hidden shadow-card border border-white/40">
      {/* Desktop layout */}
      <div className="hidden lg:flex">
        <Skeleton className="w-52 h-44 shrink-0 rounded-none" />
        <div className="flex-1 flex p-4 gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex justify-between items-start">
              <Skeleton className="h-5 w-2/5" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-4 w-4/5" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
          <div className="w-40 shrink-0 border-l border-border/40 pl-4 flex flex-col justify-center gap-2">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="lg:hidden">
        <Skeleton className="w-full h-44 rounded-none" />
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-start">
            <Skeleton className="h-5 w-3/5" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
};

export const ClinicCardSkeletonGrid = ({ count = 6 }: { count?: number }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <ClinicCardSkeleton key={index} />
      ))}
    </>
  );
};

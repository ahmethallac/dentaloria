import { Skeleton } from "@/components/ui/skeleton";

export const ClinicCardSkeleton = () => {
  return (
    <div className="bg-white/80 backdrop-blur-glass rounded-2xl overflow-hidden shadow-card border border-white/20">
      {/* Image skeleton */}
      <Skeleton className="w-full h-48" />
      
      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Title and rating row */}
        <div className="flex justify-between items-start">
          <Skeleton className="h-6 w-3/5" />
          <Skeleton className="h-5 w-16" />
        </div>
        
        {/* Location */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        
        {/* Treatment tags */}
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        
        {/* Stats row */}
        <div className="flex justify-between items-center pt-2">
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
        
        {/* Button */}
        <Skeleton className="h-10 w-full mt-2" />
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

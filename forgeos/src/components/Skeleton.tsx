// Shimmer placeholders shown while a lazy route chunk loads.
export function SkeletonBar({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-2 ${className}`} />;
}

export function ScreenSkeleton() {
  return (
    <div className="px-4 pt-12 pb-6 space-y-4">
      <SkeletonBar className="h-8 w-2/3" />
      <SkeletonBar className="h-4 w-1/3" />
      <SkeletonBar className="h-32 w-full" />
      <SkeletonBar className="h-20 w-full" />
      <SkeletonBar className="h-40 w-full" />
    </div>
  );
}

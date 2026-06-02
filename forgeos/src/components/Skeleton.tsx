import { ForgeLogo } from './ForgeLogo';

// Shimmer placeholders shown while a lazy route chunk loads.
export function SkeletonBar({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-surface-2 ${className}`} />;
}

export function ScreenSkeleton() {
  return (
    <div className="px-4 pt-12 pb-6 space-y-4">
      <div className="flex flex-col items-center gap-2 py-6">
        <ForgeLogo size={56} tile className="animate-pulse drop-shadow" />
        <span className="text-sm font-extrabold tracking-tight text-muted">ForgeOS</span>
      </div>
      <SkeletonBar className="h-32 w-full" />
      <SkeletonBar className="h-20 w-full" />
      <SkeletonBar className="h-40 w-full" />
    </div>
  );
}

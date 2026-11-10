// The avatar chip every Social tab draws. (Split out of Social.tsx, which had
// grown past 1,200 lines; the time helpers live in lib/socialTime.ts.)
export function Avatar({ seed, small, large }: { seed: string; small?: boolean; large?: boolean }) {
  const size = small ? 'w-7 h-7 text-[10px]' : large ? 'w-14 h-14 text-base' : 'w-9 h-9 text-xs';
  return <div className={`${size} rounded-full bg-surface-2 flex items-center justify-center font-bold text-accent shrink-0`}>{seed}</div>;
}

import type { ReactNode } from 'react';

// On desktop we render the app inside a ~390px phone shell; on small screens
// it goes full-bleed for a native mobile feel.
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full w-full bg-black/40 flex items-center justify-center sm:py-6">
      <div className="relative w-full sm:w-[390px] h-[100dvh] sm:h-[844px] sm:rounded-[44px] sm:border sm:border-line sm:shadow-2xl overflow-hidden bg-bg">
        {/* notch */}
        <div className="hidden sm:block absolute top-2 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-full z-50" />
        <div className="h-full w-full flex flex-col">{children}</div>
      </div>
    </div>
  );
}

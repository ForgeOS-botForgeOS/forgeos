import { useEffect, useRef, useState } from 'react';

// Smoothly tweens a number when it changes (XP, coins, totals…). Cheap rAF, no
// deps. Pass `from` to also tween on first mount (e.g. count up from 0).
export function CountUp({ value, className, format, duration = 600, from }: { value: number; className?: string; format?: (n: number) => string; duration?: number; from?: number }) {
  const [display, setDisplay] = useState(from ?? value);
  const prev = useRef(from ?? value);

  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) { setDisplay(to); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className={className}>{format ? format(display) : display.toLocaleString()}</span>;
}

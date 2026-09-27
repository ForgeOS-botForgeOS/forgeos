import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useSettings } from '../state/settingsStore';

// Tempo does not move the whole screen: the screen fades in almost instantly and
// its sections wipe in one after another (index.css → "Tempo motion"), like
// graphics coming up on a broadcast. Legacy keeps its original rise.
const LEGACY_ENTER = { initial: { opacity: 0, y: 10 }, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const } };
const TEMPO_ENTER = { initial: { opacity: 0, y: 0 }, transition: { duration: 0.16, ease: 'linear' as const } };

export function Screen({
  title,
  subtitle,
  right,
  children,
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  const enter = useSettings((s) => s.designMode === 'v2') ? TEMPO_ENTER : LEGACY_ENTER;
  return (
    <motion.div
      className="screen-root px-4 pt-12 pb-6 space-y-4"
      initial={enter.initial}
      animate={{ opacity: 1, y: 0 }}
      transition={enter.transition}
    >
      {(title || right) && (
        <header className="screen-head flex items-start justify-between">
          <div>
            {title && <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>}
            {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      {children}
    </motion.div>
  );
}

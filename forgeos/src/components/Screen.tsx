import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

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
  return (
    <motion.div
      className="px-4 pt-12 pb-6 space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      {(title || right) && (
        <header className="flex items-start justify-between">
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

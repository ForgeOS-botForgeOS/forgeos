import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { useToast } from '../lib/toast';
import { Confetti } from './Celebrate';

const ICONS = {
  success: <CheckCircle2 size={16} className="text-success" />,
  info: <Info size={16} className="text-accent-2" />,
  error: <AlertTriangle size={16} className="text-danger" />,
};

// App-wide toast stack + confetti bursts. Mounted once inside the phone frame.
export function Toaster() {
  const toasts = useToast((s) => s.toasts);
  const dismiss = useToast((s) => s.dismiss);
  const celebrating = useToast((s) => s.celebrating);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (celebrating === 0) return;
    setBurst((b) => b + 1);
    const t = setTimeout(() => setBurst((b) => Math.max(0, b - 1)), 2000);
    return () => clearTimeout(t);
  }, [celebrating]);

  return (
    <>
      <AnimatePresence>{burst > 0 && <div className="pointer-events-none absolute inset-0 z-[85]"><Confetti /></div>}</AnimatePresence>

      <div className="pointer-events-none absolute inset-x-0 bottom-24 z-[90] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ y: 24, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 10, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              onClick={() => dismiss(t.id)}
              className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-line bg-surface-2/95 px-4 py-2.5 text-sm shadow-lg backdrop-blur"
            >
              {ICONS[t.type]}
              <span className="truncate">{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}

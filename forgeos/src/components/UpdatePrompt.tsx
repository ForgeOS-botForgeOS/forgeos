import { useRegisterSW } from 'virtual:pwa-register/react';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';

// Checks for a freshly-deployed build every 30 min and whenever the app
// regains focus, then shows a tap-to-reload banner instead of swapping silently.
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      // Periodic check…
      setInterval(() => void reg.update(), CHECK_INTERVAL_MS);
      // …plus an immediate check each time the app is reopened/focused.
      const check = () => {
        if (document.visibilityState === 'visible') void reg.update();
      };
      document.addEventListener('visibilitychange', check);
      window.addEventListener('focus', check);
    },
  });

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="absolute inset-x-3 bottom-20 z-50 flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 shadow-lg ring-1 ring-accent/30"
          role="status"
        >
          <RefreshCw size={18} className="shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">Update available</p>
            <p className="text-[11px] text-muted">A new version of ForgeOS is ready.</p>
          </div>
          <button
            onClick={() => updateServiceWorker(true)}
            className="shrink-0 rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-black"
          >
            Update
          </button>
          <button
            onClick={() => setNeedRefresh(false)}
            aria-label="Dismiss"
            className="shrink-0 text-muted hover:text-text"
          >
            <X size={18} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

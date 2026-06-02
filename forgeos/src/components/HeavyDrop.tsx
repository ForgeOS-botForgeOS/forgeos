import { motion, AnimatePresence } from 'framer-motion';
import { Confetti } from './Celebrate';
import { RARITY, type Rarity, type HeavyQuote } from '../data/heavyQuotes';

export interface Drop {
  quote: HeavyQuote;
  rarity: Rarity;
  exercise: string;
  weightKg: number;
}

export function HeavyDrop({ drop, onClose }: { drop: Drop | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {drop && (
        <div className="absolute inset-0 z-[80] flex items-center justify-center p-6" onClick={onClose}>
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
          {drop.rarity === 'mythic' && <Confetti count={100} />}
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative rounded-2xl bg-surface border-2 p-6 text-center max-w-[320px]"
            style={{ borderColor: RARITY[drop.rarity].color, boxShadow: `0 0 40px ${RARITY[drop.rarity].color}55` }}
          >
            <motion.p
              className="text-xs font-extrabold uppercase tracking-[0.2em] mb-1"
              style={{ color: RARITY[drop.rarity].color }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.8 }}
            >
              ✦ {RARITY[drop.rarity].label} drop ✦
            </motion.p>
            <p className="text-[11px] text-muted mb-3">{drop.exercise} · {drop.weightKg} kg</p>
            <p className="text-base font-semibold leading-snug">“{drop.quote.text}”</p>
            <p className="text-xs text-muted mt-3">— {drop.quote.source}</p>
            <button onClick={onClose} className="mt-5 text-sm text-muted">Tap to claim</button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

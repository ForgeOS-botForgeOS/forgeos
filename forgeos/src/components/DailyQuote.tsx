import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from './ui';
import { quotesByGenre } from '../data/quotes';
import { useSettings } from '../state/settingsStore';

const KEY = 'forge-quote-shown';

// Fires once on the first home visit of each calendar day.
export function DailyQuote() {
  const genre = useSettings((s) => s.quoteGenre);
  const [open, setOpen] = useState(false);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(KEY) === today) return;
    const pool = quotesByGenre(genre);
    const q = pool[new Date().getDate() % pool.length];
    setQuoteId(q.id);
    setOpen(true);
    localStorage.setItem(KEY, today);
  }, [genre]);

  const pool = quotesByGenre(genre);
  const quote = pool.find((q) => q.id === quoteId);
  if (!open || !quote) return null;

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative rounded-2xl bg-surface border border-line p-6 text-center"
      >
        <button className="absolute top-3 right-3 text-muted" onClick={() => setOpen(false)}><X size={18} /></button>
        <p className="text-xs uppercase tracking-widest text-accent mb-3">{genre} · today</p>
        <p className="text-lg font-semibold leading-snug">“{quote.text}”</p>
        <p className="text-sm text-muted mt-3">— {quote.source}</p>
        <Button
          className="w-full justify-center mt-5"
          onClick={() => {
            setOpen(false);
            navigate(`/quote/${quote.id}`);
          }}
        >
          Read the deep dive
        </Button>
      </motion.div>
    </div>
  );
}

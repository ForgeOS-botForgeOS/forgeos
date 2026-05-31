import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, Library } from 'lucide-react';
import { Button } from './ui';
import { quotesByGenre } from '../data/quotes';
import { useSettings } from '../state/settingsStore';
import { useQuotes } from '../state/quoteStore';

const KEY = 'forge-quote-shown';

function dayOfYear() {
  return Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
}

// Fires once on the first home visit of each calendar day.
export function DailyQuote() {
  const genre = useSettings((s) => s.quoteGenre);
  const collect = useQuotes((s) => s.collect);
  const [open, setOpen] = useState(false);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(KEY) === today) return;
    const pool = quotesByGenre(genre);
    if (!pool.length) return;
    const q = pool[dayOfYear() % pool.length];
    setQuoteId(q.id);
    setOpen(true);
    collect(q.id); // add to the collection
    localStorage.setItem(KEY, today);
  }, [genre, collect]);

  const quote = quotesByGenre('all').find((q) => q.id === quoteId);
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
        <p className="text-xs uppercase tracking-widest text-accent mb-3">{quote.genre} · today</p>
        <p className="text-lg font-semibold leading-snug">“{quote.text}”</p>
        <p className="text-sm text-muted mt-3">— {quote.source}</p>
        <Button className="w-full justify-center mt-5" onClick={() => { setOpen(false); navigate(`/quote/${quote.id}`); }}>
          Read the deep dive
        </Button>
        <button className="mt-3 text-xs text-muted flex items-center gap-1 mx-auto" onClick={() => { setOpen(false); navigate('/collection'); }}>
          <Library size={13} /> View your quote collection
        </button>
      </motion.div>
    </div>
  );
}

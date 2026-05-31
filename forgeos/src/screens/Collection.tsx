import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Lock, Quote as QuoteIcon } from 'lucide-react';
import { Card, Pill, Badge } from '../components/ui';
import { QUOTES, QUOTE_GENRES } from '../data/quotes';
import { useQuotes } from '../state/quoteStore';
import type { QuoteGenre } from '../types';

export default function Collection() {
  const navigate = useNavigate();
  const collected = useQuotes((s) => s.collected);
  const [genre, setGenre] = useState<QuoteGenre | 'all'>('all');

  const list = useMemo(
    () => (genre === 'all' ? QUOTES : QUOTES.filter((q) => q.genre === genre)),
    [genre],
  );
  const have = collected.length;
  const total = QUOTES.length;
  const haveInView = list.filter((q) => collected.includes(q.id)).length;

  return (
    <div className="px-4 pt-12 pb-6 space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> Back</button>

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Quote Collection</h1>
          <p className="text-sm text-muted">Unlock a new one each day.</p>
        </div>
        <div className="text-right">
          <p className="font-mono font-bold text-lg text-accent">{have}/{total}</p>
          <p className="text-[10px] text-muted">collected</p>
        </div>
      </div>

      {/* progress bar */}
      <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
        <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${(have / total) * 100}%` }} />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar" data-noswipe>
        <Pill active={genre === 'all'} onClick={() => setGenre('all')}>All</Pill>
        {QUOTE_GENRES.map((g) => (
          <Pill key={g.id} active={genre === g.id} onClick={() => setGenre(g.id)}>{g.label}</Pill>
        ))}
      </div>
      <p className="text-xs text-muted">{haveInView}/{list.length} in this genre</p>

      <div className="space-y-2">
        {list.map((q) => {
          const owned = collected.includes(q.id);
          if (!owned) {
            return (
              <Card key={q.id} className="flex items-center gap-3 opacity-70">
                <div className="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center shrink-0"><Lock size={16} className="text-muted" /></div>
                <div className="flex-1">
                  <p className="text-sm text-muted">Locked — unlock by collecting the daily quote</p>
                  <Badge color="rgb(var(--muted))">{q.genre}</Badge>
                </div>
              </Card>
            );
          }
          return (
            <Card key={q.id} onClick={() => navigate(`/quote/${q.id}`)} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center shrink-0"><QuoteIcon size={16} className="text-accent" /></div>
              <div className="flex-1">
                <p className="text-sm font-medium leading-snug">“{q.text}”</p>
                <p className="text-[11px] text-muted mt-1">— {q.source}</p>
              </div>
              <Badge color="rgb(var(--accent-2))">{q.genre}</Badge>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

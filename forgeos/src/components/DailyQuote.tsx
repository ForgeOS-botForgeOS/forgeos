import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Quote } from 'lucide-react';
import { quotesByGenre } from '../data/quotes';
import { localizeQuote } from '../data/quotes.sk';
import { useSettings } from '../state/settingsStore';
import { useQuotes } from '../state/quoteStore';
import { useT } from '../lib/i18n';

/** The day the quote was last added to the collection. */
const SHOWN_KEY = 'forge-quote-shown';
/** The day the card was last dismissed. */
const HIDDEN_KEY = 'forge-quote-hidden';

function dayOfYear() {
  return Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
}

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* private mode: the card simply shows again */ }
}

/**
 * Today's quote, as a card on Home.
 *
 * It used to be a full-screen dialog over the first Home visit of the day, so
 * the first thing the app did each morning was block the screen you opened it
 * for. It now sits in the page, can be hidden for the day, and still lands in
 * the collection the first time it is seen.
 */
export function DailyQuote() {
  const t = useT();
  const genre = useSettings((s) => s.quoteGenre);
  const lang = useSettings((s) => s.language);
  const collect = useQuotes((s) => s.collect);
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const [hidden, setHidden] = useState(() => read(HIDDEN_KEY) === today);

  const pool = quotesByGenre(genre);
  const raw = pool.length ? pool[dayOfYear() % pool.length] : null;
  const quoteId = raw?.id;

  useEffect(() => {
    if (!quoteId || read(SHOWN_KEY) === today) return;
    collect(quoteId);
    write(SHOWN_KEY, today);
  }, [quoteId, today, collect]);

  if (hidden || !raw) return null;
  const quote = localizeQuote(raw, lang);

  return (
    <section aria-label={t('Quote of the day')} className="fx-card relative rounded-2xl border border-line bg-surface p-4 pr-11">
      <button
        aria-label={t('Hide')}
        className="absolute top-0 right-0 grid place-items-center w-11 h-11 text-muted"
        onClick={() => { write(HIDDEN_KEY, today); setHidden(true); }}
      >
        <X size={16} />
      </button>
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted">
        <Quote size={12} className="text-accent" /> {t('Quote of the day')}
      </p>
      <p className="mt-1.5 text-[15px] font-medium leading-snug">“{quote.text}”</p>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-xs text-muted">{quote.source}</p>
        <button className="shrink-0 min-h-[36px] text-xs font-semibold text-accent" onClick={() => navigate(`/quote/${quote.id}`)}>
          {t('Read more')} ▸
        </button>
      </div>
    </section>
  );
}

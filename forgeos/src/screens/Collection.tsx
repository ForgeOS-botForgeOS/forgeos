import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Lock, Star, Gift, Sparkles } from 'lucide-react';
import { Card, Pill, Badge, Button } from '../components/ui';
import { QUOTES, QUOTE_GENRES, quotesByGenre } from '../data/quotes';
import { useQuotes, MILESTONES } from '../state/quoteStore';
import { useGami } from '../state/gamificationStore';
import { useSettings } from '../state/settingsStore';
import { haptic } from '../lib/haptics';
import type { QuoteGenre } from '../types';

function dayOfYear() {
  return Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
}

type Filter = QuoteGenre | 'all' | 'fav';

export default function Collection() {
  const navigate = useNavigate();
  const { collected, favourites, claimedMilestones, collect, toggleFav, claimMilestone } = useQuotes();
  const addXp = useGami((s) => s.addXp);
  const addCoins = useGami((s) => s.addCoins);
  const genrePref = useSettings((s) => s.quoteGenre);
  const [filter, setFilter] = useState<Filter>('all');

  // Today's quote (same logic as the popup) so you can reveal it manually.
  const todayQuote = useMemo(() => {
    const pool = quotesByGenre(genrePref);
    return pool.length ? pool[dayOfYear() % pool.length] : null;
  }, [genrePref]);
  const todayCollected = todayQuote ? collected.includes(todayQuote.id) : true;

  const list = useMemo(() => {
    if (filter === 'fav') return QUOTES.filter((q) => favourites.includes(q.id));
    return filter === 'all' ? QUOTES : QUOTES.filter((q) => q.genre === filter);
  }, [filter, favourites]);

  const have = collected.length;
  const total = QUOTES.length;

  // Next unclaimed milestone that has been reached.
  const claimable = MILESTONES.find((m) => have >= m && !claimedMilestones.includes(m));
  function claim() {
    if (!claimable) return;
    addXp(claimable * 25);
    addCoins(Math.round(claimable / 2));
    claimMilestone(claimable);
    haptic('success');
  }

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

      <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
        <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${(have / total) * 100}%` }} />
      </div>

      {/* Reveal today's quote */}
      {todayQuote && !todayCollected && (
        <Card onClick={() => { collect(todayQuote.id); haptic('success'); navigate(`/quote/${todayQuote.id}`); }} className="flex items-center gap-3 border-accent/50">
          <Sparkles size={18} className="text-accent" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Reveal today’s quote</p>
            <p className="text-[11px] text-muted">Tap to unlock it into your collection.</p>
          </div>
          <Badge>+1</Badge>
        </Card>
      )}

      {/* Milestone reward */}
      {claimable && (
        <Card className="flex items-center gap-3 border-accent-2/50">
          <Gift size={18} className="text-accent-2" />
          <div className="flex-1">
            <p className="text-sm font-semibold">{claimable}-quote milestone!</p>
            <p className="text-[11px] text-muted">Claim +{claimable * 25} XP · 🪙{Math.round(claimable / 2)}</p>
          </div>
          <Button className="py-1.5" onClick={claim}>Claim</Button>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar" data-noswipe>
        <Pill active={filter === 'all'} onClick={() => setFilter('all')}>All</Pill>
        {QUOTE_GENRES.map((g) => (
          <Pill key={g.id} active={filter === g.id} onClick={() => setFilter(g.id)}>{g.label}</Pill>
        ))}
        <Pill active={filter === 'fav'} onClick={() => setFilter('fav')}>★ Favourites</Pill>
      </div>

      <div className="space-y-2">
        {list.length === 0 && <p className="text-sm text-muted">{filter === 'fav' ? 'No favourites yet — tap the star on a quote.' : 'Nothing here.'}</p>}
        {list.map((q) => {
          const owned = collected.includes(q.id);
          if (!owned) {
            return (
              <Card key={q.id} className="flex items-center gap-3 opacity-70">
                <div className="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center shrink-0"><Lock size={16} className="text-muted" /></div>
                <div className="flex-1">
                  <p className="text-sm text-muted">Locked — collect the daily quote to unlock</p>
                  <Badge color="rgb(var(--muted))">{q.genre}</Badge>
                </div>
              </Card>
            );
          }
          const fav = favourites.includes(q.id);
          return (
            <Card key={q.id} className="flex items-start gap-3">
              <button onClick={() => { toggleFav(q.id); haptic('tap'); }} className="shrink-0 mt-0.5">
                <Star size={18} className={fav ? 'text-accent-2 fill-accent-2' : 'text-muted'} />
              </button>
              <button className="flex-1 text-left" onClick={() => navigate(`/quote/${q.id}`)}>
                <p className="text-sm font-medium leading-snug">“{q.text}”</p>
                <p className="text-[11px] text-muted mt-1">— {q.source}</p>
              </button>
              <Badge color="rgb(var(--accent-2))">{q.genre}</Badge>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

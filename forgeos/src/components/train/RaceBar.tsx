import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Circle, X } from 'lucide-react';
import { Card, Badge } from '../ui';
import { useRace } from '../../state/raceStore';
import { progressFraction, raceEndsAt } from '../../lib/race';
import { ensureRaceSession, leaveRace } from '../../lib/raceSession';
import { useT } from '../../lib/i18n';

// Compact live scoreboard pinned at the top of an active session while a race
// is running. The lobby lives in Social; this only shows racing/done states.
export function RaceBar() {
  const t = useT();
  const active = useRace((s) => s.active);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => ensureRaceSession(), []);

  // Tick the countdown for timed races.
  const isTimed = active?.config.mode === 'timed' && active.status === 'racing';
  useEffect(() => {
    if (!isTimed) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isTimed]);

  if (!active || active.status === 'lobby') return null;
  const { config, status, winnerId } = active;
  const racers = Object.values(active.racers);
  const leaderVolume = Math.max(0, ...racers.map((r) => r.volumeKg));
  const sorted = [...racers].sort((a, b) => progressFraction(config, b, leaderVolume) - progressFraction(config, a, leaderVolume));

  const endsAt = active.startAt != null ? raceEndsAt(config, active.startAt) : null;
  const msLeft = endsAt != null ? Math.max(0, endsAt - now) : null;
  const clock = msLeft != null ? `${Math.floor(msLeft / 60000)}:${String(Math.floor((msLeft % 60000) / 1000)).padStart(2, '0')}` : null;

  return (
    <Card data-noswipe className="space-y-1.5 border border-accent/40">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-accent">🏁 {status === 'done' ? `${t('s.raceWinner')}: ${racers.find((r) => r.userId === winnerId)?.name ?? '?'}` : t('s.raceInProgress')}</p>
        {status === 'racing' && clock && <Badge>{clock}</Badge>}
        {status === 'done' && <button onClick={() => leaveRace()} aria-label={t('s.raceLeave')}><X size={14} className="text-muted" /></button>}
      </div>
      {sorted.map((r) => (
        <div key={r.userId}>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 font-semibold">
              {r.name}
              <Circle size={6} className={r.online ? 'fill-success text-success' : 'fill-muted text-muted'} />
            </span>
            <span className="font-mono">
              {config.mode === 'workout' ? `${r.completedSets}/${config.totalSets}` : `${Math.round(r.volumeKg).toLocaleString()} kg`}
            </span>
          </div>
          <div className="h-1 mt-0.5 rounded-full bg-surface-2 overflow-hidden">
            <motion.div
              className="h-full bg-accent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressFraction(config, r, leaderVolume) * 100}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
        </div>
      ))}
    </Card>
  );
}

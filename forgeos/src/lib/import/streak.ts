import type { CanonicalStreak } from './canonical';

// Streak continuity is computed in the USER'S timezone, not the server's, so a
// late-night import doesn't miscount the day. If the source's last-active day is
// recent we keep the streak ALIVE (with a one-day grace so the migration itself
// can't break it); otherwise we only preserve it as a longest-streak record.

export interface StreakDecision {
  keptCurrent: number; // becomes the live day-streak (0 if not continued)
  recordLongest: number; // preserved as best-ever streak
  continuity: 'continue' | 'longest-only' | 'none';
  graceFreeze: boolean; // grant a freeze / set lastSessionDate = today
  reason: string;
}

function localKey(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
  } catch {
    return new Date(iso).toISOString().slice(0, 10);
  }
}
const dayDiff = (aKey: string, bKey: string) => Math.round((Date.parse(bKey) - Date.parse(aKey)) / 86400000);

export function decideStreak(streak: CanonicalStreak | undefined, tz: string, now = new Date()): StreakDecision {
  const current = Math.max(0, Math.round(streak?.current ?? 0));
  const longest = Math.max(current, Math.round(streak?.longest ?? 0));
  if (!streak || (!current && !longest)) {
    return { keptCurrent: 0, recordLongest: 0, continuity: 'none', graceFreeze: false, reason: 'No streak found.' };
  }

  if (!streak.lastActive) {
    // Can't prove it's still alive → preserve as a record only (never inflate live streak on faith).
    return { keptCurrent: 0, recordLongest: longest, continuity: 'longest-only', graceFreeze: false, reason: 'No last-active date — kept as longest-streak record.' };
  }

  const todayKey = localKey(now.toISOString(), tz);
  const lastKey = localKey(streak.lastActive, tz);
  const gap = dayDiff(lastKey, todayKey);

  if (gap <= 1) {
    return { keptCurrent: current, recordLongest: longest, continuity: 'continue', graceFreeze: true, reason: `Active ${gap === 0 ? 'today' : 'yesterday'} — streak kept alive with a grace day.` };
  }
  return { keptCurrent: 0, recordLongest: longest, continuity: 'longest-only', graceFreeze: false, reason: `Last active ${gap} days ago — imported as a longest-streak record (${longest}).` };
}

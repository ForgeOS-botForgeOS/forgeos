import type { Friend } from '../types';

// There is no shared social backend, so a friend's "recent activity" is
// generated deterministically from their id — it looks alive and stays stable
// across opens (the same friend always shows the same history), and scales with
// their rank/XP so stronger friends show heavier sessions.

export interface FriendSession {
  kind: 'lift' | 'cardio';
  label: string;
  detail: string;
  daysAgo: number;
}

export interface FriendActivity {
  weeklySessions: number;
  totalVolumeKg: number;
  prs: number;
  favourite: string;
  sessions: FriendSession[];
  bio: string;
}

function seeded(seedStr: string) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LIFT_DAYS = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Chest & Back', 'Arms'];
const CARDIO = ['5km run', '10km ride', 'Rower 4km', '3km run', 'Incline walk', 'Ski-erg 5km'];
const LIFTS = ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press', 'Weighted Pull-up', 'Front Squat'];
const BIOS = [
  'Chasing a 2× bodyweight deadlift.', 'Consistency over intensity.', 'Powerbuilding, mostly.',
  'Runs on coffee and volume.', 'Here for the long game.', 'Strong today, stronger tomorrow.',
  'Hybrid athlete in progress.', 'Never skips legs (allegedly).',
];

export function friendActivity(f: Friend): FriendActivity {
  const rng = seeded(f.id || f.name);
  const strength = Math.min(1.6, 0.55 + f.xp / 16000); // 0.55 → ~1.6 with rank

  const sessions: FriendSession[] = [];
  let day = f.trainingNow ? 0 : 1 + Math.floor(rng() * 2);
  const count = 5 + Math.floor(rng() * 3);
  for (let i = 0; i < count; i++) {
    if (rng() < 0.28) {
      const c = CARDIO[Math.floor(rng() * CARDIO.length)];
      const min = 18 + Math.floor(rng() * 40);
      sessions.push({ kind: 'cardio', label: c, detail: `${min} min`, daysAgo: day });
    } else {
      const label = LIFT_DAYS[Math.floor(rng() * LIFT_DAYS.length)];
      const vol = Math.round((6000 + rng() * 7000) * strength / 100) * 100;
      const sets = 16 + Math.floor(rng() * 12);
      sessions.push({ kind: 'lift', label, detail: `${vol.toLocaleString()} kg · ${sets} sets`, daysAgo: day });
    }
    day += 1 + Math.floor(rng() * 3);
  }

  return {
    weeklySessions: 2 + Math.floor(rng() * 4),
    totalVolumeKg: Math.round((180000 + rng() * 600000) * strength),
    prs: Math.max(1, Math.floor(f.xp / 1800) + Math.floor(rng() * 4)),
    favourite: LIFTS[Math.floor(rng() * LIFTS.length)],
    sessions,
    bio: BIOS[Math.floor(rng() * BIOS.length)],
  };
}

export function whenLabel(daysAgo: number): string {
  if (daysAgo <= 0) return 'today';
  if (daysAgo === 1) return 'yesterday';
  return `${daysAgo}d ago`;
}

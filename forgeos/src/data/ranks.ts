import type { RankTier } from '../types';

// Exponential, PvP-style XP curve. Each major rank has sub-tiers, and the
// gap between tiers grows ~1.55x — easy early, brutal at the top.
const MAJOR = [
  { name: 'Bronze', sub: 3, color: '#cd7f32' },
  { name: 'Silver', sub: 3, color: '#c0c0c0' },
  { name: 'Gold', sub: 3, color: '#ffd24a', unlocksTheme: 'emerald-forge' },
  { name: 'Platinum', sub: 3, color: '#7fe9e3', unlocksTheme: 'obsidian-platinum' },
  { name: 'Legend', sub: 4, color: '#a78bfa' },
  { name: 'Strongman', sub: 5, color: '#ff5c35' },
] as const;

function buildRanks(): RankTier[] {
  const tiers: RankTier[] = [];
  let xp = 0;
  let step = 600; // first sub-tier threshold gap
  for (const major of MAJOR) {
    for (let s = 1; s <= major.sub; s++) {
      tiers.push({
        name: major.name,
        sub: s,
        minXp: Math.round(xp),
        color: major.color,
        // theme unlocks at the first sub-tier of the rank
        unlocksTheme: s === 1 ? (major as { unlocksTheme?: string }).unlocksTheme : undefined,
      });
      xp += step;
      step = Math.round(step * 1.55);
    }
  }
  return tiers;
}

export const RANKS: RankTier[] = buildRanks();

export function rankForXp(xp: number): { tier: RankTier; index: number; next?: RankTier } {
  let index = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].minXp) index = i;
  }
  return { tier: RANKS[index], index, next: RANKS[index + 1] };
}

export function rankLabel(tier: RankTier): string {
  const roman = ['I', 'II', 'III', 'IV', 'V'];
  return `${tier.name} ${roman[tier.sub - 1] ?? tier.sub}`;
}

export function progressToNext(xp: number): number {
  const { tier, next } = rankForXp(xp);
  if (!next) return 1;
  return (xp - tier.minXp) / (next.minXp - tier.minXp);
}

// XP awarded for a completed working set, scaled by intensity (RPE) and reps.
export function xpForSet(weightKg: number, reps: number, rpe = 7): number {
  const work = weightKg * reps;
  const intensity = 0.6 + (rpe / 10) * 0.8;
  return Math.round((10 + work * 0.05) * intensity);
}

// Body-weight-adjusted strength score for a per-lift rank badge.
// (weight x reps x bodyweight factor) — lighter athletes get a fairer score.
export function strengthScore(weightKg: number, reps: number, bodyweightKg: number): number {
  const bwFactor = 80 / Math.max(50, bodyweightKg); // normalised around 80kg
  return Math.round(weightKg * reps * bwFactor);
}

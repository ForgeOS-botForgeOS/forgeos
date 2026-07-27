import type { Diet, Goal } from '../types';
import { SUPPLEMENTS, type Supplement, type SupplementFlag, type SupplementPriority } from '../data/supplements';

// ---- Personalising the recovery list ----
// Same catalogue, ordered by what is actually true about *this* athlete: how
// much they sleep, how often they train, what month it is, what they eat.
// Pure: flags in, ordered list out.

export interface SupplementContext {
  goal: Goal;
  diet: Diet;
  /** Average sleep over the last couple of weeks, hours (0 = no data). */
  avgSleepH: number;
  /** Sessions in the last 7 days. */
  sessionsPerWeek: number;
  /** Month index 0–11, for the "dark months" vitamin-D signal. */
  month: number;
  /** This week's volume is well above the recent average. */
  loadSpike?: boolean;
}

/** Which real-world signals apply right now — this is what makes it personal. */
export function flagsFor(ctx: SupplementContext): SupplementFlag[] {
  const flags: SupplementFlag[] = [];
  if (ctx.avgSleepH > 0 && ctx.avgSleepH < 7) flags.push('lowSleep');
  if (ctx.sessionsPerWeek >= 4) flags.push('hardTraining');
  // Slovak latitude (~48–49°N): from October to March there is not enough UVB
  // for the skin to make meaningful vitamin D, whatever the sky looks like.
  if (ctx.month <= 2 || ctx.month >= 9) flags.push('darkMonths');
  if (ctx.diet === 'vegetarian') flags.push('vegetarian');
  if (ctx.diet === 'vegan') flags.push('vegan');
  if (ctx.loadSpike) flags.push('soreness');
  return flags;
}

export interface RankedSupplement extends Supplement {
  priority: SupplementPriority;
  /** Why it moved up for you — empty when it is just the baseline advice. */
  reasons: string[];
}

const REASON: Record<SupplementFlag, string> = {
  lowSleep: 'you are averaging under 7 h of sleep',
  hardTraining: 'you train 4+ times a week',
  darkMonths: 'it is the dark half of the year here',
  vegetarian: 'you eat vegetarian',
  vegan: 'you eat vegan',
  soreness: 'your training load jumped recently',
};

const ORDER: Record<SupplementPriority, number> = { core: 0, consider: 1, situational: 2 };

/**
 * The catalogue, filtered and ordered for one person. Entries gated behind
 * `onlyIf` disappear entirely unless they apply — a vegan-only nutrient has no
 * business on an omnivore's list.
 */
export function supplementPlan(ctx: SupplementContext): RankedSupplement[] {
  const flags = new Set(flagsFor(ctx));

  const ranked: RankedSupplement[] = [];
  for (const s of SUPPLEMENTS) {
    if (s.onlyIf && !s.onlyIf.some((f) => flags.has(f))) continue;
    if (s.goals && !s.goals.includes(ctx.goal)) continue;

    const hits = (s.raisedBy ?? []).filter((f) => flags.has(f));
    const gateHits = (s.onlyIf ?? []).filter((f) => flags.has(f));
    const priority: SupplementPriority = hits.length || gateHits.length
      ? s.basePriority === 'situational' ? 'consider' : 'core'
      : s.basePriority;

    ranked.push({
      ...s,
      priority,
      reasons: [...new Set([...hits, ...gateHits])].map((f) => REASON[f]),
    });
  }

  return ranked.sort((a, b) => {
    if (ORDER[a.priority] !== ORDER[b.priority]) return ORDER[a.priority] - ORDER[b.priority];
    return b.reasons.length - a.reasons.length;
  });
}

/** One-line summary for the section header. */
export function supplementSummary(list: RankedSupplement[]): string {
  const core = list.filter((s) => s.priority === 'core');
  if (!core.length) return 'Nothing stands out — your food is doing the work.';
  return `Worth attention right now: ${core.map((s) => s.name.split(' (')[0]).join(', ')}.`;
}

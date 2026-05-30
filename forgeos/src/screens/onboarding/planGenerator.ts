import type { Goal, PlannedDay, WeekPlan, Weekday } from '../../types';
import { EXERCISES } from '../../data/exercises';

const WEEKDAYS: Weekday[] = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function pickByPrimary(primaries: string[], count: number): string[] {
  const pool = EXERCISES.filter((e) => primaries.includes(e.primary));
  return pool.slice(0, count).map((e) => e.id);
}

const TEMPLATES: Record<string, { label: string; ids: () => string[] }[]> = {
  push: [{ label: 'Push', ids: () => pickByPrimary(['Chest', 'Shoulders', 'Triceps'], 5) }],
  pull: [{ label: 'Pull', ids: () => pickByPrimary(['Back', 'Biceps'], 5) }],
  legs: [{ label: 'Legs', ids: () => pickByPrimary(['Quads', 'Hamstrings', 'Glutes', 'Calves'], 5) }],
  upper: [{ label: 'Upper', ids: () => pickByPrimary(['Chest', 'Back', 'Shoulders'], 5) }],
  lower: [{ label: 'Lower', ids: () => pickByPrimary(['Quads', 'Hamstrings', 'Glutes'], 5) }],
  full: [{ label: 'Full Body', ids: () => pickByPrimary(['Full Body', 'Quads', 'Back', 'Chest'], 5) }],
};

// Choose a split shape from the requested days/week.
function splitFor(days: number): string[] {
  switch (days) {
    case 2:
      return ['full', 'full'];
    case 3:
      return ['push', 'pull', 'legs'];
    case 4:
      return ['upper', 'lower', 'upper', 'lower'];
    case 5:
      return ['push', 'pull', 'legs', 'upper', 'lower'];
    case 6:
      return ['push', 'pull', 'legs', 'push', 'pull', 'legs'];
    default:
      return ['push', 'pull', 'legs', 'full'];
  }
}

export function buildWeekPlan(days: number, _style: string, goal: Goal): WeekPlan {
  const split = splitFor(days);
  // Distribute training days across the week, resting between where possible.
  const trainingIdx = spread(days);
  let s = 0;
  const planned: PlannedDay[] = WEEKDAYS.map((day, idx) => {
    if (trainingIdx.includes(idx) && s < split.length) {
      const key = split[s++];
      const tmpl = TEMPLATES[key][0];
      return { day, label: tmpl.label, exerciseIds: tmpl.ids(), rest: false };
    }
    return { day, label: 'Rest', exerciseIds: [], rest: true };
  });

  return {
    id: 'week-1',
    blockType: goal === 'strength' ? 'strength' : 'hypertrophy',
    days: planned,
  };
}

// Spread N training days across 7 as evenly as possible.
function spread(n: number): number[] {
  if (n <= 0) return [];
  if (n >= 7) return [0, 1, 2, 3, 4, 5, 6].slice(0, n);
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(Math.round((i * 7) / n));
  return out;
}

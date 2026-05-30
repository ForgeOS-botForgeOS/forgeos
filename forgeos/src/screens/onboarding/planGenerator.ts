import type { Goal, PlannedDay, WeekPlan, Weekday, MuscleGroup } from '../../types';
import { EXERCISES } from '../../data/exercises';

const WEEKDAYS: Weekday[] = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

// Pick `count` exercises whose primary muscle is in the set, offset so that a
// second "Push" day in the week pulls different movements than the first.
function pick(primaries: MuscleGroup[], count: number, offset: number): string[] {
  const pool = EXERCISES.filter((e) => primaries.includes(e.primary));
  const out: string[] = [];
  for (let i = 0; i < count && pool.length; i++) {
    out.push(pool[(offset * count + i) % pool.length].id);
  }
  return out;
}

interface DayTemplate {
  label: string;
  muscles: MuscleGroup[];
}

const TEMPLATES: Record<string, DayTemplate> = {
  push: { label: 'Push', muscles: ['Chest', 'Shoulders', 'Triceps'] },
  pull: { label: 'Pull', muscles: ['Back', 'Biceps'] },
  legs: { label: 'Legs', muscles: ['Quads', 'Hamstrings', 'Glutes', 'Calves'] },
  upper: { label: 'Upper', muscles: ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps'] },
  lower: { label: 'Lower', muscles: ['Quads', 'Hamstrings', 'Glutes', 'Calves'] },
  full: { label: 'Full Body', muscles: ['Full Body', 'Quads', 'Back', 'Chest', 'Shoulders'] },
  arms: { label: 'Arms & Shoulders', muscles: ['Biceps', 'Triceps', 'Shoulders'] },
};

// Choose a split shape from the requested days/week.
function splitFor(days: number): string[] {
  switch (days) {
    case 2:
      return ['full', 'full'];
    case 3:
      return ['push', 'pull', 'legs'];
    case 4:
      return ['upper', 'lower', 'push', 'pull'];
    case 5:
      return ['push', 'pull', 'legs', 'upper', 'arms'];
    case 6:
      return ['push', 'pull', 'legs', 'push', 'pull', 'legs'];
    default:
      return ['push', 'pull', 'legs', 'full'];
  }
}

export function buildWeekPlan(days: number, _style: string, goal: Goal): WeekPlan {
  const split = splitFor(days);
  const trainingIdx = spread(days);
  // Track how many times each template has appeared so repeats vary.
  const seen: Record<string, number> = {};
  let s = 0;

  const planned: PlannedDay[] = WEEKDAYS.map((day, idx) => {
    if (trainingIdx.includes(idx) && s < split.length) {
      const key = split[s++];
      const tmpl = TEMPLATES[key];
      const offset = seen[key] ?? 0;
      seen[key] = offset + 1;
      return {
        day,
        label: offset > 0 ? `${tmpl.label} ${offset + 1}` : tmpl.label,
        exerciseIds: pick(tmpl.muscles, goal === 'strength' ? 4 : 5, offset),
        rest: false,
      };
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

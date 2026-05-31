import type { Goal, PlannedDay, WeekPlan, Weekday, MuscleGroup } from '../../types';
import { EXERCISES } from '../../data/exercises';

const WEEKDAYS: Weekday[] = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

// Cardio finishers rotated into training days.
const CARDIO_IDS = EXERCISES.filter((e) => e.category === 'Cardio').map((e) => e.id);

export interface PlanOptions {
  noWeekends?: boolean;
  includeCardio?: boolean;
}

function pick(primaries: MuscleGroup[], count: number, offset: number): string[] {
  const pool = EXERCISES.filter((e) => primaries.includes(e.primary) && e.category !== 'Cardio');
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

export function buildWeekPlan(days: number, _style: string, goal: Goal, opts: PlanOptions = {}): WeekPlan {
  const includeCardio = opts.includeCardio !== false; // default on
  const split = splitFor(days);
  const trainingIdx = spread(days, opts.noWeekends);
  const seen: Record<string, number> = {};
  let s = 0;
  let cardioN = 0;

  const planned: PlannedDay[] = WEEKDAYS.map((day, idx) => {
    if (trainingIdx.includes(idx) && s < split.length) {
      const key = split[s++];
      const tmpl = TEMPLATES[key];
      const offset = seen[key] ?? 0;
      seen[key] = offset + 1;
      const exerciseIds = pick(tmpl.muscles, goal === 'strength' ? 4 : 5, offset);
      // Add a cardio finisher to the day.
      if (includeCardio && CARDIO_IDS.length) {
        exerciseIds.push(CARDIO_IDS[cardioN % CARDIO_IDS.length]);
        cardioN += 1;
      }
      return { day, label: offset > 0 ? `${tmpl.label} ${offset + 1}` : tmpl.label, exerciseIds, rest: false };
    }
    return { day, label: 'Rest', exerciseIds: [], rest: true };
  });

  return {
    id: 'week-1',
    blockType: goal === 'strength' ? 'strength' : 'hypertrophy',
    days: planned,
  };
}

// Spread N training days across the available slots as evenly as possible.
// When noWeekends is set, only weekdays (Mo–Fr) are used.
function spread(n: number, noWeekends?: boolean): number[] {
  const avail = noWeekends ? [0, 1, 2, 3, 4] : [0, 1, 2, 3, 4, 5, 6];
  const count = Math.min(n, avail.length);
  if (count <= 0) return [];
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(avail[Math.round((i * (avail.length - 1)) / Math.max(1, count - 1))]);
  return [...new Set(out)];
}

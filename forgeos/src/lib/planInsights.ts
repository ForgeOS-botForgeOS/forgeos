import type { Exercise, MuscleGroup, WeekPlan } from '../types';

// Week-plan analysis: turns the plan into "is this a good week?" answers —
// sets per muscle, push/pull balance, session length — plus plain-language
// warnings. Pure and lookup-injected so it's unit-testable.

export interface WeekAnalysis {
  setsPerMuscle: Partial<Record<MuscleGroup, number>>;
  totalSets: number;
  pushSets: number;
  pullSets: number;
  warnings: string[];
}

const PUSH: MuscleGroup[] = ['Chest', 'Shoulders', 'Triceps'];
const PULL: MuscleGroup[] = ['Back', 'Biceps'];
const LEGS: MuscleGroup[] = ['Quads', 'Hamstrings', 'Glutes', 'Calves'];

// ~2.5 min per working set (set + rest) + warm-up overhead.
export function estimateDayMinutes(setCount: number): number {
  return setCount === 0 ? 0 : Math.round(8 + setCount * 2.5);
}

export function analyseWeek(plan: WeekPlan, lookup: (id: string) => Exercise | undefined): WeekAnalysis {
  const setsPerMuscle: Partial<Record<MuscleGroup, number>> = {};
  let totalSets = 0;

  const add = (m: MuscleGroup, sets: number) => {
    setsPerMuscle[m] = (setsPerMuscle[m] ?? 0) + sets;
  };

  for (const d of plan.days) {
    if (d.rest) continue;
    for (const id of d.exerciseIds) {
      const ex = lookup(id);
      if (!ex) continue;
      const sets = d.targets?.[id]?.sets ?? 3;
      totalSets += sets;
      add(ex.primary, sets);
      for (const s of ex.secondary) add(s, sets * 0.5);
    }
  }

  const sum = (ms: MuscleGroup[]) => ms.reduce((a, m) => a + (setsPerMuscle[m] ?? 0), 0);
  const pushSets = sum(PUSH);
  const pullSets = sum(PULL);
  const legSets = sum(LEGS);

  const warnings: string[] = [];
  const trainingDays = plan.days.filter((d) => !d.rest).length;

  if (totalSets > 0) {
    if (pullSets === 0 && pushSets > 0) warnings.push('No pulling work — add rows or pull-ups to protect your shoulders.');
    else if (pullSets > 0 && pushSets / pullSets >= 2) warnings.push(`Push:pull is ${Math.round((pushSets / pullSets) * 10) / 10}:1 — shoulders stay healthier near 1:1.`);
    if (legSets === 0) warnings.push('Leg day is missing entirely. Your squat (and your physique) will thank you.');
    else if (legSets < totalSets * 0.2) warnings.push('Legs get under 20% of your sets — consider one more lower-body slot.');
    if ((setsPerMuscle['Core'] ?? 0) === 0) warnings.push('No direct core work this week.');
  }
  if (trainingDays === 7) warnings.push('No rest day planned — recovery is where the muscle is built.');
  for (const d of plan.days) {
    if (d.rest) continue;
    const sets = d.exerciseIds.reduce((a, id) => a + (d.targets?.[id]?.sets ?? 3), 0);
    if (estimateDayMinutes(sets) > 100) warnings.push(`${d.day} is ~${estimateDayMinutes(sets)} min — consider splitting it.`);
  }

  return { setsPerMuscle, totalSets, pushSets, pullSets, warnings };
}

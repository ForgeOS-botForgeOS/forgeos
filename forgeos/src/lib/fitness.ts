import type { ActivityLevel, Goal, MacroTargets, Sex } from '../types';

// ---- e1RM estimators ----
export function epley(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export function brzycki(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg;
  return weightKg * (36 / (37 - reps));
}

// Average of both, rounded to 0.5 kg.
export function e1rm(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  const avg = (epley(weightKg, reps) + brzycki(weightKg, reps)) / 2;
  return Math.round(avg * 2) / 2;
}

// ---- BMR / TDEE (Mifflin-St Jeor, metric) ----
export function mifflinStJeor(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(base + (sex === 'male' ? 5 : -161));
}

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
};

export function tdee(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_FACTOR[activity]);
}

// ---- Macros ----
// Protein in g/kg by goal, calories adjusted from TDEE, fat ~25% kcal, rest carbs.
export function macrosFor(goal: Goal, tdeeKcal: number, weightKg: number): MacroTargets {
  const adjust: Record<Goal, number> = {
    lose: -0.18,
    maintain: 0,
    gain: 0.12,
    recomp: -0.05,
    strength: 0.08,
  };
  const proteinPerKg: Record<Goal, number> = {
    lose: 2.2,
    maintain: 1.8,
    gain: 1.8,
    recomp: 2.2,
    strength: 2.0,
  };
  const calories = Math.round(tdeeKcal * (1 + adjust[goal]));
  const proteinG = Math.round(weightKg * proteinPerKg[goal]);
  const fatG = Math.round((calories * 0.25) / 9);
  const proteinKcal = proteinG * 4;
  const fatKcal = fatG * 9;
  const carbsG = Math.max(0, Math.round((calories - proteinKcal - fatKcal) / 4));
  return { calories, proteinG, carbsG, fatG };
}

// ---- Plate calculator (kg, 20kg bar) ----
export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
// maxPlateKg lets gyms cap the heaviest available plate (e.g. 20 kg).
export function platesPerSide(totalKg: number, barKg = 20, maxPlateKg = 25): { plate: number; count: number }[] {
  let perSide = (totalKg - barKg) / 2;
  if (perSide <= 0) return [];
  const out: { plate: number; count: number }[] = [];
  for (const p of PLATES_KG.filter((x) => x <= maxPlateKg)) {
    let count = 0;
    while (perSide >= p - 1e-6) {
      perSide -= p;
      count++;
    }
    if (count) out.push({ plate: p, count });
  }
  return out;
}

// ---- Warm-up calculator: 50/70/90% ----
export function warmupSets(workingKg: number, barKg = 20): { pct: number; kg: number }[] {
  return [0.5, 0.7, 0.9].map((pct) => ({
    pct: pct * 100,
    kg: Math.max(barKg, Math.round((workingKg * pct) / 2.5) * 2.5),
  }));
}

// ---- Progressive overload suggestion ----
// Conservative: if last session hit top reps at <=8 RPE, add 2.5kg; else add a rep.
export function overloadSuggestion(
  lastWeightKg: number,
  lastReps: number,
  targetReps: number,
  lastRpe = 8,
): { weightKg: number; reps: number; note: string } {
  if (lastReps >= targetReps && lastRpe <= 8) {
    return { weightKg: lastWeightKg + 2.5, reps: targetReps, note: '+2.5 kg — you earned it last time.' };
  }
  if (lastReps < targetReps) {
    return { weightKg: lastWeightKg, reps: lastReps + 1, note: `Same weight, chase ${lastReps + 1} reps.` };
  }
  return { weightKg: lastWeightKg, reps: targetReps, note: 'Hold and consolidate this weight.' };
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const volumeOf = (weightKg: number, reps: number) => weightKg * reps;

// Body-fat estimate band from the onboarding fitness test score (0..1).
export function bodyFatBand(sex: Sex, fitnessScore: number): string {
  if (sex === 'male') {
    if (fitnessScore > 0.75) return '8–12%';
    if (fitnessScore > 0.5) return '13–18%';
    if (fitnessScore > 0.3) return '19–24%';
    return '25%+';
  }
  if (fitnessScore > 0.75) return '16–20%';
  if (fitnessScore > 0.5) return '21–26%';
  if (fitnessScore > 0.3) return '27–32%';
  return '33%+';
}

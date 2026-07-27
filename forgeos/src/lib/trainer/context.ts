import type { Diet, Goal, PR, Workout } from '../../types';

// ---- What the trainer knows about YOU ----
// The whole point of the feature: answers that use your quiz answers, your
// numbers and your actual training instead of generic advice. This module turns
// the app's state into a compact text block.
//
// Two rules it exists to enforce:
//   1. Nothing identifying leaves the device. No email, no account id, no auth
//      provider, no friend code, no gym coordinates. First name only.
//   2. It stays small. Every character here is sent on every message.

export interface TrainerSnapshot {
  firstName?: string;
  age?: number;
  sex?: string;
  heightCm?: number;
  weightKg?: number;
  goalWeightKg?: number;
  bodyFatPct?: number;
  goal: Goal;
  activity?: string;
  experience?: string;
  tdee?: number;
  macros?: { calories: number; proteinG: number; carbsG: number; fatG: number };
  /** The onboarding quiz — the answers that should shape every reply. */
  quizAnswers?: Record<string, string>;
  about?: string;
  specialRequest?: string;
  diet: Diet;
  language: string;

  sessionsLast7: number;
  sessionsLast28: number;
  weekStreak?: number;
  dayStreak?: number;
  recentWorkouts: Workout[];
  topPrs: PR[];
  plateauLifts?: string[];
  nextPlanned?: string;

  avgSleepH?: number;
  readiness?: number;
  restingHr?: number;

  todayKcal?: number;
  todayProteinG?: number;
  waterMl?: number;

  rank?: string;
  xp?: number;

  /** Things the user has explicitly told the trainer to remember. */
  memory?: string[];
}

const MAX_CHARS = 2600;

function line(label: string, value: string | number | undefined | null): string | null {
  if (value === undefined || value === null || value === '' || value === 0) return null;
  return `${label}: ${value}`;
}

/** Quiz answers as "key: value" pairs, trimmed — this is the personalisation. */
function quizLines(answers?: Record<string, string>): string[] {
  if (!answers) return [];
  return Object.entries(answers)
    .filter(([, v]) => typeof v === 'string' && v.trim())
    .slice(0, 14)
    .map(([k, v]) => `  - ${k}: ${String(v).slice(0, 120)}`);
}

function workoutLine(w: Workout): string {
  const date = w.date.slice(0, 10);
  if (w.cardio) return `  - ${date} ${w.cardio.machine} ${w.cardio.distanceKm}km / ${Math.round(w.cardio.durationMin)}min`;
  const sets = w.exercises.reduce((a, e) => a + e.sets.filter((s) => s.completed).length, 0);
  return `  - ${date} ${w.name}: ${sets} sets, ${Math.round(w.totalVolumeKg ?? 0)}kg`;
}

/**
 * The user block for the system prompt. Deliberately terse, and truncated hard
 * so a huge history can never balloon the request.
 */
export function buildUserContext(s: TrainerSnapshot): string {
  const parts: (string | null)[] = [
    '## About this athlete',
    line('Name', s.firstName),
    line('Age', s.age),
    line('Sex', s.sex),
    line('Height (cm)', s.heightCm),
    line('Weight (kg)', s.weightKg),
    line('Goal weight (kg)', s.goalWeightKg),
    line('Body fat %', s.bodyFatPct),
    line('Goal', s.goal),
    line('Activity level', s.activity),
    line('Training experience', s.experience),
    line('Diet', s.diet),
    line('Maintenance calories (TDEE)', s.tdee),
    s.macros ? `Daily targets: ${s.macros.calories} kcal, P${s.macros.proteinG} C${s.macros.carbsG} F${s.macros.fatG}` : null,
    line('App language', s.language === 'sk' ? 'Slovak' : 'English'),
  ];

  const quiz = quizLines(s.quizAnswers);
  if (quiz.length) parts.push('Onboarding quiz answers (use these — they are why the advice must be personal):', ...quiz);
  if (s.about) parts.push(`In their own words: "${s.about.slice(0, 400)}"`);
  if (s.specialRequest) parts.push(`Special request from onboarding: "${s.specialRequest.slice(0, 200)}"`);

  parts.push(
    '## Training right now',
    line('Sessions in the last 7 days', s.sessionsLast7),
    line('Sessions in the last 28 days', s.sessionsLast28),
    line('Week streak', s.weekStreak),
    line('Day streak', s.dayStreak),
    line('Next planned session', s.nextPlanned),
    line('Rank', s.rank),
  );
  if (s.recentWorkouts.length) {
    parts.push('Recent sessions:', ...s.recentWorkouts.slice(0, 6).map(workoutLine));
  }
  if (s.topPrs.length) {
    parts.push(
      'Best lifts (e1RM):',
      ...s.topPrs.slice(0, 6).map((p) => `  - ${p.exerciseName}: ${p.weightKg}kg × ${p.reps} (e1RM ${Math.round(p.e1rm)}kg)`),
    );
  }
  if (s.plateauLifts?.length) parts.push(`Stalled lifts: ${s.plateauLifts.slice(0, 4).join(', ')}`);

  parts.push(
    '## Recovery',
    line('Average sleep (h)', s.avgSleepH ? Math.round(s.avgSleepH * 10) / 10 : undefined),
    line('Readiness score', s.readiness),
    line('Resting heart rate', s.restingHr),
  );

  parts.push(
    '## Today so far',
    line('Calories logged', s.todayKcal),
    line('Protein logged (g)', s.todayProteinG),
    line('Water (ml)', s.waterMl),
  );

  if (s.memory?.length) {
    parts.push('## Things they asked you to remember', ...s.memory.slice(0, 12).map((m) => `  - ${m.slice(0, 200)}`));
  }

  const text = parts.filter((p): p is string => !!p).join('\n');
  return text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS)}\n(context truncated)` : text;
}

/**
 * Exactly what leaves the device, in plain language — the consent screen shows
 * this list, and it is generated from the same shape it describes so the two
 * cannot drift apart.
 */
export function contextDisclosure(s: TrainerSnapshot): string[] {
  const items: string[] = [];
  if (s.firstName) items.push('your first name');
  items.push('your age, sex, height and weight');
  items.push('your goal, experience level and diet');
  if (s.macros) items.push('your calorie and macro targets');
  if (s.quizAnswers && Object.keys(s.quizAnswers).length) items.push('your onboarding quiz answers');
  if (s.about || s.specialRequest) items.push('what you wrote about yourself during onboarding');
  if (s.recentWorkouts.length) items.push('your recent sessions (names, dates, sets, volume)');
  if (s.topPrs.length) items.push('your best lifts');
  if (s.avgSleepH || s.readiness) items.push('your average sleep and readiness score');
  if (s.todayKcal || s.waterMl) items.push("today's logged food and water");
  if (s.memory?.length) items.push('anything you asked the trainer to remember');
  items.push('the messages you type');
  return items;
}

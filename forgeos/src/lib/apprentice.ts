// Apprentice Mode — the simple ForgeOS.
//
// The full app has six tabs and dozens of cards; that is right for someone who
// already knows what a deload or an e1RM is, and overwhelming for someone whose
// question is "what do I do now?". Apprentice Mode answers that question and
// hides everything else, without removing a single feature: nothing is deleted,
// the routes all still exist, and one tap switches back and forth for ever.
//
// The rules live here, apart from the screens, because "which tab is shown" and
// "what should this person do next" are decisions worth testing on their own.

/** The four tabs a beginner needs. Social & Quests keep working, just not on the bar. */
export const APPRENTICE_TABS = ['/home', '/train', '/nutrition', '/profile'] as const;
export const FULL_TABS = ['/home', '/train', '/nutrition', '/social', '/quests', '/profile'] as const;

/** Left→right tab order — also the order the swipe gesture moves through. */
export function tabOrder(apprentice: boolean): string[] {
  return [...(apprentice ? APPRENTICE_TABS : FULL_TABS)];
}

/**
 * "Do this next" — one instruction, never a list.
 *
 * The order is the priority: an unfinished workout beats everything, training
 * beats food, and food beats water, because that is the order in which skipping
 * one costs the most. Pure so the priorities can be argued with in a test
 * instead of in the UI.
 */
export type NextStepId = 'resume' | 'train' | 'logFood' | 'water' | 'weighIn' | 'restDay';

export interface DayState {
  hasActiveWorkout: boolean;
  trainedToday: boolean;
  sessionsThisWeek: number;
  weeklyGoal: number;
  kcalLogged: number;
  waterMl: number;
  weighedInThisWeek: boolean;
}

/** Below this, "you have not eaten today" is the honest reading of the log. */
const KCAL_LOGGED_MIN = 1;
/** Water is a nudge, not a nag: only once the day is under way. */
const WATER_MIN_ML = 1000;

export function nextStep(s: DayState): { id: NextStepId; route: string } {
  if (s.hasActiveWorkout) return { id: 'resume', route: '/train' };
  if (!s.trainedToday && s.sessionsThisWeek < s.weeklyGoal) return { id: 'train', route: '/train' };
  if (s.kcalLogged < KCAL_LOGGED_MIN) return { id: 'logFood', route: '/nutrition' };
  if (s.waterMl < WATER_MIN_ML) return { id: 'water', route: '/nutrition' };
  if (!s.weighedInThisWeek) return { id: 'weighIn', route: '/progress' };
  // Everything for today is done — say so instead of inventing a task.
  return { id: 'restDay', route: '/home' };
}

/**
 * The habit map: where the things people look for actually live.
 *
 * Each row names the tab it belongs to **in the full app**, so the muscle memory
 * a beginner builds here is still correct the day they switch to Full Forge —
 * which is the whole point of showing it rather than just hiding the tabs.
 */
export interface FindItEntry {
  id: string;
  /** i18n key for what the user is looking for, e.g. "Recipes". */
  labelKey: string;
  /** i18n key for where it lives, e.g. "Food tab → Cookbook". */
  whereKey: string;
  route: string;
}

export const FIND_IT: readonly FindItEntry[] = [
  { id: 'recipes', labelKey: 'app.find.recipes', whereKey: 'app.find.recipesWhere', route: '/cookbook' },
  { id: 'prs', labelKey: 'app.find.prs', whereKey: 'app.find.prsWhere', route: '/quests' },
  { id: 'history', labelKey: 'app.find.history', whereKey: 'app.find.historyWhere', route: '/history' },
  { id: 'weight', labelKey: 'app.find.weight', whereKey: 'app.find.weightWhere', route: '/progress' },
  { id: 'friends', labelKey: 'app.find.friends', whereKey: 'app.find.friendsWhere', route: '/social' },
  { id: 'trainer', labelKey: 'app.find.trainer', whereKey: 'app.find.trainerWhere', route: '/trainer' },
];

/** Monday-based start of the current week, matching the rest of the app. */
export function weekStart(now = new Date()): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Sessions logged since Monday — the number the simple home shows. */
export function sessionsThisWeek(dates: string[], now = new Date()): number {
  const from = weekStart(now).getTime();
  return dates.filter((iso) => {
    const t = new Date(iso).getTime();
    return Number.isFinite(t) && t >= from;
  }).length;
}

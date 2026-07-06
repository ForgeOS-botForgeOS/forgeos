// Home-screen nudges derived from the weekly streak model (weeks you showed
// up; see gamificationStore). Pure date maths so the messages are testable.

export interface Nudge {
  kind: 'streak' | 'goal';
  message: string;
}

/** Monday of the week containing `d`, as yyyy-mm-dd. Mirrors the exact
 *  algorithm in gamificationStore so weekStart comparisons never drift. */
export function mondayOf(d: Date): string {
  const x = new Date(d.toISOString().slice(0, 10));
  const dow = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - dow);
  return x.toISOString().slice(0, 10);
}

/**
 * A gentle end-of-week reminder. Fires only Friday-Sunday, only while the
 * outcome is still winnable, and at most one message:
 *  - streak-saver: nothing logged yet this week and a streak is on the line;
 *  - goal nudge: showed up already, but the weekly session goal needs more.
 */
export function weekendNudge(opts: {
  weekStart: string | null; // gamificationStore's tracked Monday
  weekSessions: number;
  weekStreak: number;
  weeklyGoal: number;
  now?: Date;
}): Nudge | null {
  const now = opts.now ?? new Date();
  const dow = (new Date(now.toISOString().slice(0, 10)).getDay() + 6) % 7; // Mon=0 … Sun=6
  if (dow < 4) return null; // only Fri (4), Sat (5), Sun (6)
  const daysLeft = 7 - dow; // incl. today

  // The store only rolls weekStart forward when a session is logged, so a
  // stale weekStart means nothing has been counted this week yet.
  const sessions = opts.weekStart === mondayOf(now) ? opts.weekSessions : 0;

  if (sessions === 0 && opts.weekStreak > 0) {
    return {
      kind: 'streak',
      message: `Your ${opts.weekStreak}-week streak ends Sunday — one session keeps it alive`,
    };
  }
  const remaining = opts.weeklyGoal - sessions;
  if (sessions > 0 && remaining > 0 && remaining <= daysLeft) {
    return {
      kind: 'goal',
      message: `${remaining} more session${remaining > 1 ? 's' : ''} this week hits your goal of ${opts.weeklyGoal}`,
    };
  }
  return null;
}

import { describe, expect, it } from 'vitest';
import { FIND_IT, nextStep, sessionsThisWeek, tabOrder, type DayState } from './apprentice';

const base: DayState = {
  hasActiveWorkout: false,
  trainedToday: false,
  sessionsThisWeek: 0,
  weeklyGoal: 4,
  kcalLogged: 0,
  waterMl: 0,
  weighedInThisWeek: false,
};

describe('tabOrder', () => {
  it('hides Social and Quests from the bar in Apprentice Mode', () => {
    expect(tabOrder(true)).toEqual(['/home', '/train', '/nutrition', '/profile']);
    expect(tabOrder(false)).toHaveLength(6);
  });

  it('keeps Apprentice tabs in the same left→right order as the full app', () => {
    const full = tabOrder(false);
    const simple = tabOrder(true);
    expect(simple).toEqual(full.filter((t) => simple.includes(t)));
  });
});

describe('nextStep', () => {
  it('sends you back to an unfinished workout before anything else', () => {
    expect(nextStep({ ...base, hasActiveWorkout: true, kcalLogged: 0 }).id).toBe('resume');
  });

  it('asks for a workout while the week is short of the goal', () => {
    expect(nextStep(base)).toEqual({ id: 'train', route: '/train' });
  });

  it('moves on to food once today is trained', () => {
    expect(nextStep({ ...base, trainedToday: true }).id).toBe('logFood');
  });

  it('nudges water only after something has been eaten', () => {
    expect(nextStep({ ...base, trainedToday: true, kcalLogged: 600 }).id).toBe('water');
  });

  it('asks for a weigh-in once the day is otherwise handled', () => {
    expect(nextStep({ ...base, trainedToday: true, kcalLogged: 600, waterMl: 2000 }).id).toBe('weighIn');
  });

  it('says the day is done instead of inventing a task', () => {
    expect(nextStep({ ...base, trainedToday: true, kcalLogged: 600, waterMl: 2000, weighedInThisWeek: true }).id).toBe('restDay');
  });

  it('stops asking for workouts once the weekly goal is met', () => {
    expect(nextStep({ ...base, sessionsThisWeek: 4, weeklyGoal: 4 }).id).toBe('logFood');
  });
});

describe('FIND_IT', () => {
  it('points every entry at a real destination, once each', () => {
    const routes = FIND_IT.map((e) => e.route);
    expect(new Set(routes).size).toBe(routes.length);
    expect(routes.every((r) => r.startsWith('/'))).toBe(true);
  });
});

describe('sessionsThisWeek', () => {
  it('counts from Monday, ignoring last week and junk dates', () => {
    const now = new Date('2026-09-03T12:00:00Z'); // a Thursday
    const dates = [
      '2026-09-03T09:00:00Z', // today
      '2026-08-31T18:00:00Z', // Monday
      '2026-08-30T18:00:00Z', // Sunday — last week
      'not-a-date',
    ];
    expect(sessionsThisWeek(dates, now)).toBe(2);
  });
});

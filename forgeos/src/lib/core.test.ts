import { describe, it, expect } from 'vitest';
import { e1rm, mifflinStJeor, tdee, macrosFor } from './fitness';
import { rankForXp } from '../data/ranks';
import { parsePastedWorkout, parsePastedWeek } from './planSmart';

describe('fitness math', () => {
  it('e1RM grows with reps and equals the weight at 1 rep', () => {
    expect(Math.round(e1rm(100, 1))).toBe(100);
    expect(e1rm(100, 5)).toBeGreaterThan(100);
    expect(e1rm(100, 8)).toBeGreaterThan(e1rm(100, 5));
  });
  it('Mifflin-St Jeor + TDEE are positive and activity scales up', () => {
    const bmr = mifflinStJeor('male', 80, 180, 30);
    expect(bmr).toBeGreaterThan(1400);
    expect(tdee(bmr, 'active')).toBeGreaterThan(tdee(bmr, 'sedentary'));
  });
  it('macros: a cut is below maintenance, protein hits ~2 g/kg', () => {
    const td = 2500;
    expect(macrosFor('lose', td, 80).calories).toBeLessThan(td);
    expect(macrosFor('gain', td, 80).calories).toBeGreaterThan(td);
    expect(macrosFor('recomp', td, 80).proteinG).toBeGreaterThanOrEqual(80 * 1.6);
  });
});

describe('ranks', () => {
  it('start at index 0 and climb monotonically with XP', () => {
    expect(rankForXp(0).index).toBe(0);
    expect(rankForXp(100000).index).toBeGreaterThan(rankForXp(1000).index);
    let prev = -1;
    for (const xp of [0, 500, 5000, 50000, 500000]) {
      const i = rankForXp(xp).index;
      expect(i).toBeGreaterThanOrEqual(prev);
      prev = i;
    }
  });
});

describe('plan parsing', () => {
  it('parses a pasted workout into matched exercises with sets×reps×weight', () => {
    const built = parsePastedWorkout('Bench Press 3x8 100kg\nSquat 5x5 @120\n- Deadlift 3x5');
    expect(built.exerciseIds.length).toBeGreaterThanOrEqual(2);
    // first line is the bench → its target keeps the pasted sets×reps
    expect(built.targets[built.exerciseIds[0]]).toMatchObject({ sets: 3, reps: 8 });
  });
  it('splits a whole week on day headers and counts training days', () => {
    const week = parsePastedWeek('Monday - Push\nBench Press 4x8 80kg\nTuesday - Pull\nDeadlift 5x5 120kg\nWednesday - Rest');
    expect(week.days.length).toBe(7);
    expect(week.matchedDays).toBeGreaterThanOrEqual(2);
    expect(week.days.find((d) => d.day === 'Wed')?.rest).toBe(true);
  });
});

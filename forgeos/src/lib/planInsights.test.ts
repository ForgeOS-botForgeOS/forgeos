import { describe, it, expect } from 'vitest';
import { analyseWeek, estimateDayMinutes } from './planInsights';
import { classifyExerciseLocal } from './exerciseAI';
import type { Exercise, WeekPlan, PlannedDay } from '../types';

const EX: Record<string, Exercise> = {
  bench: { id: 'bench', name: 'Bench Press', category: 'Powerlifting', primary: 'Chest', secondary: ['Triceps'], equipment: 'Barbell', isCore: true, videoUrl: '' },
  row: { id: 'row', name: 'Barbell Row', category: 'Bodybuilding', primary: 'Back', secondary: ['Biceps'], equipment: 'Barbell', isCore: false, videoUrl: '' },
  squat: { id: 'squat', name: 'Back Squat', category: 'Powerlifting', primary: 'Quads', secondary: ['Glutes'], equipment: 'Barbell', isCore: true, videoUrl: '' },
};
const lookup = (id: string) => EX[id];

const day = (d: PlannedDay['day'], ids: string[], rest = false): PlannedDay => ({ day: d, label: rest ? 'Rest' : 'Training', exerciseIds: ids, rest });
const week = (days: PlannedDay[]): WeekPlan => ({ id: 'w', blockType: 'hypertrophy', days });

describe('analyseWeek', () => {
  it('counts primary sets fully and secondary at half', () => {
    const a = analyseWeek(week([day('Mon', ['bench'])]), lookup);
    expect(a.setsPerMuscle.Chest).toBe(3);
    expect(a.setsPerMuscle.Triceps).toBe(1.5);
  });

  it('warns when there is push but no pull', () => {
    const a = analyseWeek(week([day('Mon', ['bench', 'squat'])]), lookup);
    expect(a.warnings.some((w) => w.includes('No pulling'))).toBe(true);
  });

  it('warns when legs are missing', () => {
    const a = analyseWeek(week([day('Mon', ['bench', 'row'])]), lookup);
    expect(a.warnings.some((w) => w.toLowerCase().includes('leg'))).toBe(true);
  });

  it('is calm about a balanced week with rest days', () => {
    const a = analyseWeek(
      week([day('Mon', ['bench', 'row']), day('Wed', ['squat', 'row']), day('Sun', [], true)]),
      lookup,
    );
    expect(a.warnings.filter((w) => w.includes('pull') || w.includes('Leg day'))).toHaveLength(0);
  });
});

describe('estimateDayMinutes', () => {
  it('scales with sets and is 0 for empty days', () => {
    expect(estimateDayMinutes(0)).toBe(0);
    expect(estimateDayMinutes(12)).toBe(38);
  });
});

describe('classifyExerciseLocal', () => {
  it('detects muscles, category and equipment from a description', () => {
    const r = classifyExerciseLocal('Backpack Split Squat', 'Targets the quads and glutes. Put a heavy backpack on and squat down slowly on one leg.');
    expect(r.primary).toBe('Quads');
    expect(r.secondary).toContain('Glutes');
    expect(r.xp).toBeGreaterThanOrEqual(50);
  });

  it('asks for a better description when nothing is recognisable', () => {
    const r = classifyExerciseLocal('Zorb', 'It is fun and I like it a lot.');
    expect(r.primary).toBe('Full Body');
    expect(r.confidence).toBeLessThan(0.6);
    expect(r.feedback).toContain("couldn't recognise");
  });

  it('caps XP so it cannot be farmed with essays', () => {
    const r = classifyExerciseLocal('Mega Move', `chest back shoulders ${'word '.repeat(300)}`);
    expect(r.xp).toBeLessThanOrEqual(100);
  });
});

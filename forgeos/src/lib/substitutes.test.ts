import { describe, expect, it } from 'vitest';
import { EXERCISES, exerciseById, substitutesFor } from '../data/exercises';
import { equipFamily, rankSubstitutes } from './substitutes';

const bench = EXERCISES.find((e) => e.name === 'Bench Press')!;

describe('substitutes over the full library', () => {
  it('offers every same-muscle exercise, not the first eight', () => {
    const chest = EXERCISES.filter((e) => e.primary === 'Chest' && e.id !== bench.id).length;
    expect(chest).toBeGreaterThan(8);
    expect(substitutesFor(bench.id)).toHaveLength(chest);
  });

  it('reaches exercises added at the end of the catalogue', () => {
    const late = EXERCISES.find((e) => e.name === 'Close-Grip Dumbbell Bench Press')!;
    expect(substitutesFor(bench.id).map((e) => e.id)).toContain(late.id);
  });

  it('ranks overlapping movements above loosely related ones', () => {
    const list = substitutesFor(bench.id);
    const first = list[0];
    // The best match shares bench's secondaries (triceps / shoulders).
    expect(first.secondary.some((m) => bench.secondary.includes(m))).toBe(true);
  });

  it('narrows to the equipment that is free', () => {
    const db = substitutesFor(bench.id, { family: 'Dumbbell' });
    expect(db.length).toBeGreaterThan(0);
    expect(db.every((e) => equipFamily(e.equipment) === 'Dumbbell')).toBe(true);
  });

  it('searches the whole library, same muscle first', () => {
    const res = substitutesFor(bench.id, { query: 'press' });
    expect(res.some((e) => e.primary !== 'Chest')).toBe(true);
    const firstOther = res.findIndex((e) => e.primary !== 'Chest');
    expect(res.slice(0, firstOther).every((e) => e.primary === 'Chest')).toBe(true);
  });

  it('matches every search word, ignoring case and accents', () => {
    const res = substitutesFor(bench.id, { query: 'INCLÍNE dumbbell' });
    expect(res.length).toBeGreaterThan(0);
    expect(res.every((e) => /incline/i.test(e.name) || /incline/i.test(e.equipment))).toBe(true);
  });

  it('never offers the lift itself, and unknown ids give nothing', () => {
    expect(substitutesFor(bench.id).some((e) => e.id === bench.id)).toBe(false);
    expect(substitutesFor('nope')).toEqual([]);
  });

  it('is deterministic', () => {
    expect(rankSubstitutes(bench, EXERCISES).map((e) => e.id)).toEqual(rankSubstitutes(bench, EXERCISES).map((e) => e.id));
  });
});

describe('equipFamily', () => {
  it('groups the catalogue equipment strings', () => {
    expect(equipFamily('Barbell + Chains')).toBe('Barbell');
    expect(equipFamily('EZ-Bar')).toBe('Barbell');
    expect(equipFamily('Trap Bar')).toBe('Barbell');
    expect(equipFamily('Dumbbells')).toBe('Dumbbell');
    expect(equipFamily('Smith Machine')).toBe('Machine');
    expect(equipFamily('Hammer Strength')).toBe('Machine');
    expect(equipFamily('Bar')).toBe('Bodyweight');
    expect(equipFamily('Rings')).toBe('Bodyweight');
    expect(equipFamily('Kettlebell')).toBe('Kettlebell');
    expect(equipFamily('Cable')).toBe('Cable');
    expect(equipFamily('Pool')).toBe('Other');
  });

  it('puts every catalogue exercise somewhere', () => {
    expect(EXERCISES.every((e) => !!equipFamily(e.equipment))).toBe(true);
    expect(exerciseById(bench.id)).toBeTruthy();
  });
});

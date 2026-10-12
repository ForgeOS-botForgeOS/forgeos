import { beforeEach, describe, expect, it } from 'vitest';
import { clearDraft, hasDraft, isDirty, loadDraft, saveDraft } from './workoutDraft';
import type { Workout } from '../types';

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    },
  });
});

const w = (over: Partial<Workout> = {}): Workout => ({
  id: 'abc', name: 'Legs', date: '2026-10-10T12:00:00.000Z', completed: true, totalVolumeKg: 0,
  exercises: [{ id: 'e1', exerciseId: 'pow-1', sets: [{ id: 's1', weightKg: 100, reps: 5, completed: true }] }],
  ...over,
});

describe('past-workout drafts', () => {
  it('keeps a half-written workout after leaving the screen', () => {
    saveDraft('new', w());
    expect(loadDraft('new')).toEqual(w());
    expect(hasDraft('new')).toBe(true);
  });

  it('keeps drafts per workout', () => {
    saveDraft('new', w({ name: 'A' }));
    saveDraft('abc', w({ name: 'B' }));
    expect(loadDraft('new')?.name).toBe('A');
    expect(loadDraft('abc')?.name).toBe('B');
  });

  it('is gone after saving or starting over', () => {
    saveDraft('new', w());
    clearDraft('new');
    expect(loadDraft('new')).toBeNull();
    expect(hasDraft('new')).toBe(false);
  });

  it('ignores corrupt or foreign data instead of crashing', () => {
    mem.set('forge-workout-draft:new', '{not json');
    expect(loadDraft('new')).toBeNull();
    mem.set('forge-workout-draft:new', JSON.stringify({ id: 1, exercises: 'x' }));
    expect(loadDraft('new')).toBeNull();
    mem.set('forge-workout-draft:new', JSON.stringify({ ...w(), exercises: [{ sets: [] }] }));
    expect(loadDraft('new')).toBeNull();
  });

  it('survives storage that throws', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() { throw new Error('blocked'); },
    });
    expect(() => saveDraft('new', w())).not.toThrow();
    expect(loadDraft('new')).toBeNull();
    expect(() => clearDraft('new')).not.toThrow();
  });

  it('only counts real changes as dirty', () => {
    expect(isDirty(w(), w())).toBe(false);
    expect(isDirty(w({ name: 'Arms' }), w())).toBe(true);
    expect(isDirty(w(), null)).toBe(true);
  });
});

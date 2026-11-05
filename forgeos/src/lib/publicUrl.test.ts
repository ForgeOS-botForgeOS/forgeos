import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PUBLIC_APP_URL, isShareRoute, shareBase, stashPendingLink, takePendingLink } from './publicUrl';
import { decodeWorkout, sharedExerciseName, sharedToExercises, SHARE_MAX_SETS, workoutShareUrl } from './workoutShare';
import { useExercises } from '../state/exerciseStore';
import type { Workout } from '../types';

const memory = new Map<string, string>();
beforeEach(() => {
  memory.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
    removeItem: (k: string) => void memory.delete(k),
  });
  useExercises.setState({ custom: [] });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

const workout = (over: Partial<Workout> = {}): Workout => ({
  id: 'w1', name: 'Push Day', date: '2026-11-05T17:00:00.000Z', completed: true,
  exercises: [{ id: 'e1', exerciseId: 'pow-3', sets: [{ id: 's1', weightKg: 100, reps: 5, completed: true }] }],
  ...over,
});
const codeOf = (url: string) => new URL(url.replace('#/', '')).searchParams.get('w')!;

describe('share links', () => {
  it('point at the hosted web app, never the app\'s own localhost page', () => {
    vi.stubEnv('DEV', false);
    expect(shareBase()).toBe(PUBLIC_APP_URL);
    expect(workoutShareUrl(workout())).toMatch(/^https:\/\/forgeos-botforgeos\.github\.io\/forgeos\/#\/import-workout\?w=/);
  });

  it('open the same workout on the friend\'s phone', () => {
    const shared = decodeWorkout(codeOf(workoutShareUrl(workout())));
    expect(shared?.name).toBe('Push Day');
    expect(shared?.exercises[0]).toMatchObject({ exerciseId: 'pow-3', sets: [{ weightKg: 100, reps: 5 }] });
  });

  it('still open for a huge workout, trimmed to what a link may carry', () => {
    const sets = Array.from({ length: 45 }, (_, i) => ({ id: `s${i}`, weightKg: 60, reps: 10, completed: true }));
    const shared = decodeWorkout(codeOf(workoutShareUrl(workout({ exercises: [{ id: 'e1', exerciseId: 'pow-3', sets }] }))));
    expect(shared).not.toBeNull();
    expect(shared!.exercises[0].sets).toHaveLength(SHARE_MAX_SETS);
  });

  it('carry a custom exercise so the friend sees its name and gets a copy', () => {
    const mine = useExercises.getState().addCustom({ name: 'Zercher Carry', category: 'CrossFit', primary: 'Core', secondary: [], equipment: 'Barbell' });
    const url = workoutShareUrl(workout({ exercises: [{ id: 'e1', exerciseId: mine.id, sets: [{ id: 's1', weightKg: 80, reps: 1, completed: true }] }] }));
    useExercises.setState({ custom: [] }); // the friend's phone
    const shared = decodeWorkout(codeOf(url))!;
    expect(sharedExerciseName(shared.exercises[0], () => undefined)).toBe('Zercher Carry');
    const [ex] = sharedToExercises(shared);
    expect(useExercises.getState().custom.find((c) => c.id === ex.exerciseId)?.name).toBe('Zercher Carry');
  });
});

describe('a link opened before onboarding', () => {
  it('is kept and handed back once', () => {
    stashPendingLink('/import-workout?w=abc');
    expect(takePendingLink()).toBe('/import-workout?w=abc');
    expect(takePendingLink()).toBeNull();
  });

  it('only keeps share routes', () => {
    stashPendingLink('/profile');
    expect(takePendingLink()).toBeNull();
    expect(isShareRoute('/race-join?d=x')).toBe(true);
    expect(isShareRoute('/settings')).toBe(false);
  });
});

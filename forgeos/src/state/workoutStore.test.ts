import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkout } from './workoutStore';
import { useSettings } from './settingsStore';
import type { Workout } from '../types';

// Last time on bench: 60kg×8 then a heavier 65kg×6 top set.
const pastWorkout: Workout = {
  id: 'w1',
  name: 'Push day',
  date: '2026-07-01T10:00:00.000Z',
  exercises: [
    {
      id: 'we1',
      exerciseId: 'bench-press',
      sets: [
        { id: 's1', weightKg: 60, reps: 8, rpe: 8, completed: true },
        { id: 's2', weightKg: 65, reps: 6, rpe: 9, completed: true },
      ],
    },
  ],
  completed: true,
  totalVolumeKg: 870,
};

beforeEach(() => {
  useWorkout.setState({ history: [pastWorkout], active: null, prs: [] });
  useSettings.setState({ prefillWeights: true });
});

describe('lastPerformance', () => {
  it('returns the completed sets of the most recent workout with that exercise', () => {
    const sets = useWorkout.getState().lastPerformance('bench-press');
    expect(sets?.map((s) => [s.weightKg, s.reps])).toEqual([[60, 8], [65, 6]]);
  });

  it('returns undefined when the exercise was never done', () => {
    expect(useWorkout.getState().lastPerformance('deadlift')).toBeUndefined();
  });
});

describe('startWorkout pre-fill', () => {
  it('seeds weight AND reps from last time, set for set, beating plan targets', () => {
    useWorkout.getState().startWorkout('Push', ['bench-press'], {
      targets: { 'bench-press': { sets: 2, reps: 12, weightKg: 40 } },
    });
    const sets = useWorkout.getState().active!.exercises[0].sets;
    expect(sets.map((s) => [s.weightKg, s.reps])).toEqual([[60, 8], [65, 6]]);
    expect(sets.every((s) => !s.completed)).toBe(true);
  });

  it('repeats the last top set when the plan asks for more sets than last time', () => {
    useWorkout.getState().startWorkout('Push', ['bench-press'], {
      targets: { 'bench-press': { sets: 3, reps: 8 } },
    });
    const sets = useWorkout.getState().active!.exercises[0].sets;
    expect(sets.map((s) => [s.weightKg, s.reps])).toEqual([[60, 8], [65, 6], [65, 6]]);
  });

  it('uses the planned weight and reps when the toggle is off', () => {
    useSettings.setState({ prefillWeights: false });
    useWorkout.getState().startWorkout('Push', ['bench-press'], {
      targets: { 'bench-press': { sets: 2, reps: 12, weightKg: 40 } },
    });
    const sets = useWorkout.getState().active!.exercises[0].sets;
    expect(sets.map((s) => [s.weightKg, s.reps])).toEqual([[40, 12], [40, 12]]);
  });

  it('falls back to the 20 kg empty bar with no history', () => {
    useWorkout.setState({ history: [] });
    useWorkout.getState().startWorkout('Push', ['bench-press']);
    const sets = useWorkout.getState().active!.exercises[0].sets;
    expect(sets.map((s) => [s.weightKg, s.reps])).toEqual([[20, 8]]);
  });
});

describe('addExercise mid-session pre-fill', () => {
  it('recreates all of last time\'s sets with their weights and reps', () => {
    useWorkout.getState().startWorkout('Freestyle');
    useWorkout.getState().addExercise('bench-press');
    const sets = useWorkout.getState().active!.exercises[0].sets;
    expect(sets.map((s) => [s.weightKg, s.reps])).toEqual([[60, 8], [65, 6]]);
    expect(sets.every((s) => !s.completed)).toBe(true);
  });

  it('starts one 20 kg × 8 set when the toggle is off', () => {
    useSettings.setState({ prefillWeights: false });
    useWorkout.getState().startWorkout('Freestyle');
    useWorkout.getState().addExercise('bench-press');
    const sets = useWorkout.getState().active!.exercises[0].sets;
    expect(sets.map((s) => [s.weightKg, s.reps])).toEqual([[20, 8]]);
  });
});

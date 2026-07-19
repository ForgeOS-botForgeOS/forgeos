import { describe, expect, test } from 'vitest';
import type { Duel, Workout } from '../types';
import { applyMyGain, duelGainFromWorkout, isLiveDuel, mergeTheirProgress, settleAtDeadline } from './duels';

const IN_AN_HOUR = new Date(Date.now() + 3_600_000).toISOString();

function duel(overrides: Partial<Duel> = {}): Duel {
  return {
    id: 'd1',
    opponentName: 'Lena',
    opponentAvatar: 'LN',
    metric: 'volume',
    target: 5000,
    myProgress: 0,
    theirProgress: 0,
    createdAt: new Date().toISOString(),
    endsAt: IN_AN_HOUR,
    status: 'active',
    ...overrides,
  };
}

function workout(): Workout {
  return {
    id: 'w1',
    name: 'Push day',
    date: new Date().toISOString(),
    completed: true,
    exercises: [
      {
        id: 'we1',
        exerciseId: 'bench',
        sets: [
          { id: 's1', weightKg: 100, reps: 5, completed: true },
          { id: 's2', weightKg: 100, reps: 5, completed: true },
          { id: 's3', weightKg: 60, reps: 10, completed: false }, // skipped set must not count
        ],
      },
      {
        id: 'we2',
        exerciseId: 'ohp',
        sets: [{ id: 's4', weightKg: 40, reps: 10, completed: true }],
      },
    ],
  };
}

describe('duelGainFromWorkout', () => {
  test('volume counts only completed sets', () => {
    expect(duelGainFromWorkout('volume', workout())).toBe(100 * 5 + 100 * 5 + 40 * 10);
  });

  test('sets counts completed sets across exercises', () => {
    expect(duelGainFromWorkout('sets', workout())).toBe(3);
  });

  test('a finished workout is exactly one session', () => {
    expect(duelGainFromWorkout('sessions', workout())).toBe(1);
  });
});

describe('applyMyGain', () => {
  test('advances my progress without touching a live opponent', () => {
    const after = applyMyGain(duel({ theirProgress: 1000 }), 1400, false);
    expect(after.myProgress).toBe(1400);
    expect(after.theirProgress).toBe(1000);
    expect(after.status).toBe('active');
  });

  test('simulated opponent grinds along in local duels', () => {
    const after = applyMyGain(duel(), 1000, true, () => 0.5);
    expect(after.theirProgress).toBe(950); // 1000 * (0.6 + 0.5 * 0.7)
  });

  test('hitting the target wins and clamps at the target', () => {
    const after = applyMyGain(duel({ myProgress: 4900 }), 500, false);
    expect(after.myProgress).toBe(5000);
    expect(after.status).toBe('won');
  });

  test('settled duels and zero gains are untouched', () => {
    const done = duel({ status: 'won' });
    expect(applyMyGain(done, 1000, false)).toBe(done);
    const active = duel();
    expect(applyMyGain(active, 0, false)).toBe(active);
  });
});

describe('mergeTheirProgress', () => {
  test('takes the higher of local and synced opponent totals', () => {
    expect(mergeTheirProgress(duel({ theirProgress: 2000 }), 3200).theirProgress).toBe(3200);
    expect(mergeTheirProgress(duel({ theirProgress: 2000 }), 1500).theirProgress).toBe(2000);
  });

  test('opponent reaching the target first means a loss', () => {
    expect(mergeTheirProgress(duel({ myProgress: 4000 }), 5000).status).toBe('lost');
  });

  test('my earlier win is sticky even if their total arrives late', () => {
    const won = duel({ status: 'won', myProgress: 5000 });
    expect(mergeTheirProgress(won, 5000).status).toBe('won');
  });
});

describe('settleAtDeadline', () => {
  const past = new Date(Date.now() - 1000).toISOString();

  test('leaves running duels alone before the deadline', () => {
    const d = duel();
    expect(settleAtDeadline(d, Date.now())).toBe(d);
  });

  test('higher total wins at the deadline, tie goes to me', () => {
    expect(settleAtDeadline(duel({ endsAt: past, myProgress: 300, theirProgress: 200 }), Date.now()).status).toBe('won');
    expect(settleAtDeadline(duel({ endsAt: past, myProgress: 200, theirProgress: 300 }), Date.now()).status).toBe('lost');
    expect(settleAtDeadline(duel({ endsAt: past, myProgress: 200, theirProgress: 200 }), Date.now()).status).toBe('won');
  });
});

describe('isLiveDuel', () => {
  test('live means a table side is assigned', () => {
    expect(isLiveDuel(duel())).toBe(false);
    expect(isLiveDuel(duel({ side: 'challenger', opponentId: 'x' }))).toBe(true);
  });
});

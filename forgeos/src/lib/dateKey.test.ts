import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { localDateKey, localMondayKey, mondayOfKey } from './dateKey';
import { mondayOf } from './nudges';
import { useGami } from '../state/gamificationStore';
import { QUESTS } from '../data/quests';

// Mon 2 Nov 2026, 00:30 LOCAL. In Europe that is still Sunday in UTC.
const EARLY_MONDAY = new Date(2026, 10, 2, 0, 30);

describe('local date keys', () => {
  it('uses the local calendar day, not the UTC day', () => {
    expect(localDateKey(EARLY_MONDAY)).toBe('2026-11-02');
    expect(localMondayKey(EARLY_MONDAY)).toBe('2026-11-02');
    expect(mondayOfKey('2026-11-04')).toBe('2026-11-02');
    expect(mondayOfKey('2026-11-01')).toBe('2026-10-26');
  });

  it('nudges.mondayOf agrees for a session just after local midnight on Monday', () => {
    expect(mondayOf(EARLY_MONDAY)).toBe('2026-11-02');
  });
});

describe('weekly streak at the Monday boundary', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('a 00:30 Monday session counts toward the NEW week and extends the streak', () => {
    useGami.setState({ quests: [], weekStreak: 3, weekStart: '2026-10-26', weekSessions: 1, lastSessionDate: '2026-10-30', streakDays: 1 });
    vi.setSystemTime(EARLY_MONDAY);
    useGami.getState().registerSession();
    const s = useGami.getState();
    expect(s.weekStart).toBe('2026-11-02');
    expect(s.weekStreak).toBe(4);
    expect(s.lastSessionDate).toBe('2026-11-02');
  });
});

describe('daily quests just after local midnight', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('keeps a board dealt at 00:30 local instead of treating it as yesterday\'s', () => {
    useGami.setState({ quests: [], xp: 0, coins: 0 });
    vi.setSystemTime(EARLY_MONDAY);
    useGami.getState().ensureDailyQuests();
    const daily = useGami.getState().quests.filter((u) => QUESTS.find((d) => d.id === u.questId)?.scope === 'daily');
    expect(daily.length).toBeGreaterThan(0);
    useGami.setState({ quests: useGami.getState().quests.map((u) => (u.questId === daily[0].questId ? { ...u, progress: 1 } : u)) });
    vi.setSystemTime(new Date(2026, 10, 2, 0, 45));
    useGami.getState().ensureDailyQuests();
    expect(useGami.getState().quests.find((u) => u.questId === daily[0].questId)?.progress).toBe(1);
  });
});

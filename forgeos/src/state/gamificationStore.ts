import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StreakWager, UserQuest } from '../types';
import { QUESTS } from '../data/quests';

interface GamiState {
  xp: number;
  coins: number;
  streakDays: number;
  lastSessionDate: string | null;
  // Weekly streak: weeks where you hit your planned session goal (settings.weeklyGoal).
  weekStreak: number;
  weekStart: string | null; // Monday yyyy-mm-dd of the tracked week
  weekSessions: number; // sessions logged so far this week
  bestStreak: number; // longest day-streak ever reached (also set by imports)
  quests: UserQuest[];
  wager: StreakWager | null;

  addXp: (amount: number) => void;
  addCoins: (amount: number) => void;
  heavyLifts: number;
  recordHeavyLift: () => void;
  convertXpToCoins: (coins: number, rate: number) => boolean;
  registerSession: () => void;
  buyStreakFreeze: () => boolean;
  spendCoins: (amount: number) => boolean;
  ensureDailyQuests: () => void;
  bumpMetric: (metric: 'sets' | 'sessions' | 'volume' | 'pr' | 'streak', amount: number) => void;
  claimQuest: (questId: string) => void;
  claimAllQuests: () => { count: number; xp: number; coins: number };
  // Count a (possibly past-dated) session toward an active bet + this week's streak.
  countSession: (dateISO: string) => void;
  startWager: (targetSessions: number, staked: number, days: number) => boolean;
  resolveWagerProgress: () => void;
}

const todayStr = () => new Date().toISOString().slice(0, 10);
function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}
// Monday (yyyy-mm-dd) of the week containing dateStr.
function mondayOf(dateStr: string) {
  const d = new Date(dateStr);
  const dow = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - dow);
  return d.toISOString().slice(0, 10);
}

export const useGami = create<GamiState>()(
  persist(
    (set, get) => ({
      xp: 0,
      coins: 50,
      heavyLifts: 0,
      streakDays: 0,
      lastSessionDate: null,
      weekStreak: 0,
      weekStart: null,
      weekSessions: 0,
      bestStreak: 0,
      quests: [],
      wager: null,

      addXp: (amount) => set({ xp: get().xp + Math.max(0, Math.round(amount)) }),

      addCoins: (amount) => set({ coins: get().coins + Math.max(0, Math.round(amount)) }),

      recordHeavyLift: () => set({ heavyLifts: get().heavyLifts + 1 }),

      convertXpToCoins: (coins, rate) => {
        const cost = coins * rate;
        if (get().xp < cost || coins <= 0) return false;
        set({ xp: get().xp - cost, coins: get().coins + coins });
        return true;
      },

      spendCoins: (amount) => {
        if (get().coins < amount) return false;
        set({ coins: get().coins - amount });
        return true;
      },

      buyStreakFreeze: () => {
        // A streak freeze costs 20 coins and protects one missed day.
        if (!get().spendCoins(20)) return false;
        set({ lastSessionDate: todayStr() });
        return true;
      },

      registerSession: () => {
        const today = todayStr();
        const last = get().lastSessionDate;
        let streak = get().streakDays;
        if (!last) streak = 1;
        else {
          const gap = daysBetween(last, today);
          if (gap === 0) {
            /* same day, no change */
          } else if (gap === 1) streak += 1;
          else streak = 1;
        }
        set({ lastSessionDate: today, streakDays: streak, bestStreak: Math.max(get().bestStreak, streak) });

        // ---- Weekly streak: consecutive weeks you SHOWED UP (>=1 session) ----
        const monday = mondayOf(today);
        let weekStart = get().weekStart;
        let weekSessions = get().weekSessions;
        let weekStreak = get().weekStreak;
        if (!weekStart) {
          weekStart = monday;
          weekSessions = 0;
        } else if (monday !== weekStart) {
          // New week. The previous tracked week always had >=1 session, so the
          // streak only breaks if you skipped a whole week (gap > 1).
          const gapWeeks = Math.round(daysBetween(weekStart, monday) / 7);
          if (gapWeeks !== 1) weekStreak = 0;
          weekStart = monday;
          weekSessions = 0;
        }
        weekSessions += 1;
        if (weekSessions === 1) weekStreak += 1; // showed up this week
        set({ weekStart, weekSessions, weekStreak });

        get().bumpMetric('sessions', 1);
        get().bumpMetric('streak', 0); // refresh streak-based quest progress below
        // update streak quests to current value
        set({
          quests: get().quests.map((uq) => {
            const def = QUESTS.find((q) => q.id === uq.questId);
            if (def?.metric === 'streak') {
              const progress = Math.min(def.target, streak);
              return { ...uq, progress, completed: progress >= def.target };
            }
            return uq;
          }),
        });
        get().resolveWagerProgress();
      },

      ensureDailyQuests: () => {
        const have = get().quests;
        const dailyPool = QUESTS.filter((q) => q.scope === 'daily');
        const today = todayStr();
        // Rotate a fresh subset of the daily pool each day so the board stays
        // varied even though the pool is large.
        const DAILY_COUNT = 5;
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
        const start = (dayOfYear * DAILY_COUNT) % dailyPool.length;
        const daily = Array.from({ length: Math.min(DAILY_COUNT, dailyPool.length) }, (_, i) => dailyPool[(start + i) % dailyPool.length]);
        // Reset daily quests if any assigned daily quest is from a previous day.
        const staleDaily = have.some(
          (uq) => dailyPool.find((d) => d.id === uq.questId) && uq.assignedAt.slice(0, 10) !== today,
        );
        let next = have;
        if (staleDaily || !have.some((uq) => dailyPool.find((d) => d.id === uq.questId))) {
          // Drop any existing daily quests and assign today's rotated subset.
          next = have.filter((uq) => !dailyPool.find((d) => d.id === uq.questId));
          for (const d of daily) {
            next.push({ questId: d.id, progress: 0, completed: false, claimed: false, assignedAt: new Date().toISOString() });
          }
        }
        // Ensure weekly/monthly/yearly exist once.
        for (const q of QUESTS.filter((x) => x.scope !== 'daily')) {
          if (!next.find((uq) => uq.questId === q.id)) {
            next.push({ questId: q.id, progress: 0, completed: false, claimed: false, assignedAt: new Date().toISOString() });
          }
        }
        set({ quests: next });
      },

      bumpMetric: (metric, amount) => {
        set({
          quests: get().quests.map((uq) => {
            const def = QUESTS.find((q) => q.id === uq.questId);
            if (!def || def.metric !== metric || uq.completed) return uq;
            const progress = Math.min(def.target, uq.progress + amount);
            return { ...uq, progress, completed: progress >= def.target };
          }),
        });
      },

      claimQuest: (questId) => {
        const uq = get().quests.find((q) => q.questId === questId);
        const def = QUESTS.find((q) => q.id === questId);
        if (!uq || !def || !uq.completed || uq.claimed) return;
        set({
          xp: get().xp + def.xp,
          coins: get().coins + def.coins,
          quests: get().quests.map((q) => (q.questId === questId ? { ...q, claimed: true } : q)),
        });
      },

      // Claim every completed-but-unclaimed quest at once, summing the rewards.
      claimAllQuests: () => {
        let xp = 0;
        let coins = 0;
        let count = 0;
        const quests = get().quests.map((q) => {
          if (!q.completed || q.claimed) return q;
          const def = QUESTS.find((d) => d.id === q.questId);
          if (!def) return q;
          xp += def.xp;
          coins += def.coins;
          count++;
          return { ...q, claimed: true };
        });
        if (count > 0) set({ xp: get().xp + xp, coins: get().coins + coins, quests });
        return { count, xp, coins };
      },

      // Count a session by its date (used for manual / past-dated workouts).
      countSession: (dateISO) => {
        const date = dateISO.slice(0, 10);
        // Bet: a past workout dated within [startedAt, deadline] counts.
        const w = get().wager;
        if (w?.active) {
          const start = (w.startedAt ?? '0000-01-01').slice(0, 10);
          const end = w.deadline.slice(0, 10);
          if (date >= start && date <= end) {
            const progress = w.progress + 1;
            if (progress >= w.targetSessions) set({ coins: get().coins + w.staked * 2, wager: { ...w, active: false, progress } });
            else set({ wager: { ...w, progress } });
          }
        }
        // Weekly streak: count it if the workout falls in the current tracked week.
        if (get().weekStart && mondayOf(date) === get().weekStart) {
          const weekSessions = get().weekSessions + 1;
          let weekStreak = get().weekStreak;
          if (weekSessions === 1) weekStreak += 1; // first show-up this week
          set({ weekSessions, weekStreak });
        }
        get().bumpMetric('sessions', 1);
      },

      startWager: (targetSessions, staked, days) => {
        if (get().wager?.active) return false;
        if (!get().spendCoins(staked)) return false;
        const deadline = new Date(Date.now() + days * 86400000).toISOString();
        set({ wager: { active: true, targetSessions, staked, deadline, startedAt: new Date().toISOString(), progress: 0 } });
        return true;
      },

      resolveWagerProgress: () => {
        const w = get().wager;
        if (!w?.active) return;
        const progress = w.progress + 1;
        if (progress >= w.targetSessions) {
          // Won — double the stake back.
          set({ coins: get().coins + w.staked * 2, wager: { ...w, active: false, progress } });
        } else if (new Date() > new Date(w.deadline)) {
          // Missed deadline — stake already spent, just close it.
          set({ wager: { ...w, active: false, progress } });
        } else {
          set({ wager: { ...w, progress } });
        }
      },
    }),
    { name: 'forge-gami' },
  ),
);

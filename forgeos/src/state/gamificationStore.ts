import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StreakWager, UserQuest } from '../types';
import { QUESTS } from '../data/quests';

interface GamiState {
  xp: number;
  coins: number;
  streakDays: number;
  lastSessionDate: string | null;
  quests: UserQuest[];
  wager: StreakWager | null;

  addXp: (amount: number) => void;
  convertXpToCoins: (coins: number, rate: number) => boolean;
  registerSession: () => void;
  buyStreakFreeze: () => boolean;
  spendCoins: (amount: number) => boolean;
  ensureDailyQuests: () => void;
  bumpMetric: (metric: 'sets' | 'sessions' | 'volume' | 'pr' | 'streak', amount: number) => void;
  claimQuest: (questId: string) => void;
  startWager: (targetSessions: number, staked: number, days: number) => boolean;
  resolveWagerProgress: () => void;
}

const todayStr = () => new Date().toISOString().slice(0, 10);
function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export const useGami = create<GamiState>()(
  persist(
    (set, get) => ({
      xp: 0,
      coins: 50,
      streakDays: 0,
      lastSessionDate: null,
      quests: [],
      wager: null,

      addXp: (amount) => set({ xp: get().xp + Math.max(0, Math.round(amount)) }),

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
        set({ lastSessionDate: today, streakDays: streak });
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
        const daily = QUESTS.filter((q) => q.scope === 'daily');
        const today = todayStr();
        // Reset daily quests if they were assigned on a previous day.
        const staleDaily = have.some(
          (uq) => daily.find((d) => d.id === uq.questId) && uq.assignedAt.slice(0, 10) !== today,
        );
        let next = have;
        if (staleDaily || !have.some((uq) => daily.find((d) => d.id === uq.questId))) {
          next = have.filter((uq) => !daily.find((d) => d.id === uq.questId));
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

      startWager: (targetSessions, staked, days) => {
        if (get().wager?.active) return false;
        if (!get().spendCoins(staked)) return false;
        const deadline = new Date(Date.now() + days * 86400000).toISOString();
        set({ wager: { active: true, targetSessions, staked, deadline, progress: 0 } });
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

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DesignMode, Settings, ThemeId } from '../types';
import { setHapticsEnabled } from '../lib/haptics';

interface SettingsState extends Settings {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  applyTheme: (theme: ThemeId) => void;
  applyDesign: (mode: DesignMode) => void;
}

const DEFAULTS: Settings = {
  language: 'en',
  gym: { name: 'My Forge', lat: 52.52, lng: 13.405, radiusM: 120, maxWeightKg: 20 },
  appLock: { enabled: false, code: '' },
  publicProfile: false,
  heavyQuotesEnabled: true,
  weeklyGoal: 4,
  streakMode: 'weekly',
  reminder: { enabled: false, time: '18:00', days: [0, 1, 2, 3, 4] },
  theme: 'forge-dark',
  autoTheme: false,
  designMode: 'classic',
  quoteGenre: 'stoic',
  leaderboardPublic: true,
  shareActivity: true,
  streakGambling: false,
  marketplaceEnabled: true,
  xpToCoinRate: 100, // 100 XP -> 1 Forge Coin (expensive on purpose)
  geofenceEnabled: false,
  hapticsEnabled: true,
  recoveryEnabled: true,
  bedtimeNudge: true,
  autoImportWorkouts: true,
  prefillWeights: true,
  units: 'metric',
};

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      set: (key, value) => {
        set({ [key]: value } as Partial<SettingsState>);
        if (key === 'hapticsEnabled') setHapticsEnabled(value as boolean);
        if (key === 'theme') get().applyTheme(value as ThemeId);
        if (key === 'designMode') get().applyDesign(value as DesignMode);
      },
      applyTheme: (theme) => {
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', theme);
        }
      },
      // The design mode is a single class on <html> that scoped CSS blocks key
      // off — so switching is instant and 'classic' means no class at all
      // (the original look returns exactly). 'forge' keeps the historical
      // `ui-fresh` class name so already-shipped bundles stay compatible.
      applyDesign: (mode) => {
        if (typeof document === 'undefined') return;
        const cl = document.documentElement.classList;
        cl.toggle('ui-fresh', mode === 'forge');
        cl.toggle('ui-aurora', mode === 'aurora');
      },
    }),
    {
      name: 'forge-settings',
      // Deep-merge persisted state over DEFAULTS so nested objects (gym,
      // reminder, appLock) always carry every default key. Without this, an
      // older saved blob missing a nested field (e.g. reminder.days) would
      // surface as `undefined` and crash a screen that reads it — this is what
      // made the "You" tab appear dead for early users.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Settings>;
        const deep = <T,>(def: T, saved: unknown): T => {
          if (def && typeof def === 'object' && !Array.isArray(def) && saved && typeof saved === 'object') {
            const out = { ...(def as object) } as Record<string, unknown>;
            for (const k of Object.keys(out)) {
              out[k] = deep((def as Record<string, unknown>)[k], (saved as Record<string, unknown>)[k]);
            }
            return out as T;
          }
          return (saved === undefined ? def : saved) as T;
        };
        const merged = { ...current, ...deep(DEFAULTS, p) } as SettingsState;
        // Migrate the old boolean `uiPolish` toggle → the new three-way mode:
        // anyone who had the v2 look on lands on 'forge'; everyone else stays classic.
        const legacy = (persisted ?? {}) as { uiPolish?: boolean; designMode?: DesignMode };
        if (!legacy.designMode && legacy.uiPolish) merged.designMode = 'forge';
        return merged;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.applyTheme(state.theme);
          state.applyDesign(state.designMode);
          setHapticsEnabled(state.hapticsEnabled);
        }
      },
    },
  ),
);

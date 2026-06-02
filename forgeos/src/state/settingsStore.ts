import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Settings, ThemeId } from '../types';
import { setHapticsEnabled } from '../lib/haptics';

interface SettingsState extends Settings {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  applyTheme: (theme: ThemeId) => void;
}

const DEFAULTS: Settings = {
  language: 'en',
  gym: { name: 'My Forge', lat: 52.52, lng: 13.405, radiusM: 120, maxWeightKg: 20 },
  appLock: { enabled: false, code: '' },
  publicProfile: false,
  reminder: { enabled: false, time: '18:00', days: [0, 1, 2, 3, 4] },
  theme: 'forge-dark',
  autoTheme: false,
  quoteGenre: 'stoic',
  leaderboardPublic: true,
  streakGambling: false,
  marketplaceEnabled: true,
  xpToCoinRate: 100, // 100 XP -> 1 Forge Coin (expensive on purpose)
  geofenceEnabled: false,
  hapticsEnabled: true,
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
      },
      applyTheme: (theme) => {
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', theme);
        }
      },
    }),
    {
      name: 'forge-settings',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.applyTheme(state.theme);
          setHapticsEnabled(state.hapticsEnabled);
        }
      },
    },
  ),
);

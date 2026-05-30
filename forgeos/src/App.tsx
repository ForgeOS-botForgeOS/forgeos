import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { PhoneFrame } from './components/PhoneFrame';
import { TabBar } from './components/TabBar';
import { useUser } from './state/userStore';
import { useSettings } from './state/settingsStore';
import { useGami } from './state/gamificationStore';
import { useSocial } from './state/socialStore';
import { onReconnect, syncQueue } from './lib/offlineQueue';

import Onboarding from './screens/onboarding/Onboarding';
import Home from './screens/Home';
import Train from './screens/Train';
import Library from './screens/Library';
import Nutrition from './screens/Nutrition';
import Social from './screens/Social';
import Quests from './screens/Quests';
import Profile from './screens/Profile';
import Spotify from './screens/Spotify';
import QuoteDeepDive from './screens/QuoteDeepDive';

function AppShell() {
  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 overflow-y-auto no-scrollbar">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}

function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const onboarded = useUser((s) => s.profile?.onboarded);
  if (!onboarded) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

export default function App() {
  const applyTheme = useSettings((s) => s.applyTheme);
  const theme = useSettings((s) => s.theme);
  const ensureDailyQuests = useGami((s) => s.ensureDailyQuests);
  const seedFeed = useSocial((s) => s.seedIfEmpty);

  useEffect(() => {
    applyTheme(theme);
    ensureDailyQuests();
    seedFeed();
    // Offline sync engine: flush queued writes whenever we regain connectivity.
    const off = onReconnect(() => void syncQueue());
    return off;
  }, [applyTheme, theme, ensureDailyQuests, seedFeed]);

  return (
    <PhoneFrame>
      <HashRouter>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route
            element={
              <RequireOnboarding>
                <AppShell />
              </RequireOnboarding>
            }
          >
            <Route path="/home" element={<Home />} />
            <Route path="/train" element={<Train />} />
            <Route path="/library" element={<Library />} />
            <Route path="/nutrition" element={<Nutrition />} />
            <Route path="/social" element={<Social />} />
            <Route path="/quests" element={<Quests />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/spotify" element={<Spotify />} />
            <Route path="/quote/:id" element={<QuoteDeepDive />} />
          </Route>
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </HashRouter>
    </PhoneFrame>
  );
}

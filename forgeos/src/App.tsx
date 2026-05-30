import { useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { PhoneFrame } from './components/PhoneFrame';
import { TabBar } from './components/TabBar';
import { RankUpWatcher } from './components/Celebrate';
import { ScreenSkeleton } from './components/Skeleton';
import { useUser } from './state/userStore';
import { useSettings } from './state/settingsStore';
import { useGami } from './state/gamificationStore';
import { useSocial } from './state/socialStore';
import { initAuth } from './lib/auth';
import { onReconnect, syncQueue } from './lib/offlineQueue';

// Code-split every screen so the initial route loads a small chunk.
const Onboarding = lazy(() => import('./screens/onboarding/Onboarding'));
const Home = lazy(() => import('./screens/Home'));
const Train = lazy(() => import('./screens/Train'));
const Library = lazy(() => import('./screens/Library'));
const Nutrition = lazy(() => import('./screens/Nutrition'));
const Social = lazy(() => import('./screens/Social'));
const Quests = lazy(() => import('./screens/Quests'));
const Profile = lazy(() => import('./screens/Profile'));
const Spotify = lazy(() => import('./screens/Spotify'));
const QuoteDeepDive = lazy(() => import('./screens/QuoteDeepDive'));
const History = lazy(() => import('./screens/History'));

function AppShell() {
  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 overflow-y-auto no-scrollbar">
        <Suspense fallback={<ScreenSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
      <RankUpWatcher />
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
    // Restore any live Supabase session and keep stores in sync.
    const stopAuth = initAuth();
    // Offline sync engine: flush queued writes whenever we regain connectivity.
    const off = onReconnect(() => void syncQueue());
    return () => {
      stopAuth();
      off();
    };
  }, [applyTheme, theme, ensureDailyQuests, seedFeed]);

  return (
    <PhoneFrame>
      <HashRouter>
        <Suspense fallback={<ScreenSkeleton />}>
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
            <Route path="/history" element={<History />} />
            <Route path="/quote/:id" element={<QuoteDeepDive />} />
          </Route>
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
        </Suspense>
      </HashRouter>
    </PhoneFrame>
  );
}

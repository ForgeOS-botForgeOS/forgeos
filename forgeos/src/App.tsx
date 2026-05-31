import { useEffect, useRef, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
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

// Left→right order of the bottom tabs; swiping moves to the neighbour.
const TAB_ORDER = ['/home', '/train', '/nutrition', '/social', '/quests', '/profile'];

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const touch = useRef<{ x: number; y: number; ok: boolean } | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length !== 1) {
      touch.current = null;
      return;
    }
    const el = e.target as HTMLElement;
    // Don't hijack swipes on inputs, sliders, or anything opting out.
    const ok = !el.closest('input, textarea, select, [role="slider"], [data-noswipe]');
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, ok };
  }

  function onTouchEnd(e: React.TouchEvent) {
    const t = touch.current;
    touch.current = null;
    if (!t || !t.ok) return;
    const dx = e.changedTouches[0].clientX - t.x;
    const dy = e.changedTouches[0].clientY - t.y;
    if (Math.abs(dx) < 90 || Math.abs(dx) < Math.abs(dy) * 1.8) return; // mostly-horizontal only
    const idx = TAB_ORDER.indexOf(location.pathname);
    if (idx === -1) return; // only on main tab screens
    // Swipe right → tab to the right; swipe left → tab to the left.
    const next = dx > 0 ? idx + 1 : idx - 1;
    if (next >= 0 && next < TAB_ORDER.length) navigate(TAB_ORDER[next]);
  }

  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 overflow-y-auto no-scrollbar" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
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

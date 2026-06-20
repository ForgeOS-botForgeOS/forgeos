import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { PhoneFrame } from './components/PhoneFrame';
import { TabBar } from './components/TabBar';
import { RankUpWatcher } from './components/Celebrate';
import { Tutorial } from './components/Tutorial';
import { LockScreen } from './components/LockScreen';
import { UpdatePrompt } from './components/UpdatePrompt';
import { Toaster } from './components/Toaster';
import { PasswordReset } from './components/PasswordReset';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ScreenSkeleton } from './components/Skeleton';
import { useUser } from './state/userStore';
import { useSettings } from './state/settingsStore';
import { useGami } from './state/gamificationStore';
import { useSocial } from './state/socialStore';
import { initAuth } from './lib/auth';
import { startReminderScheduler } from './lib/reminders';
import { onReconnect, syncQueue } from './lib/offlineQueue';
import { pushCloudBackup } from './lib/cloudSync';
import { takePendingInvite } from './lib/invite';
import { ensureCloudAccount, pushMyActivity } from './lib/activitySync';
import { toast, celebrate } from './lib/toast';

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
const Collection = lazy(() => import('./screens/Collection'));
const PlanEditorScreen = lazy(() => import('./screens/PlanEditor'));
const ImportPlan = lazy(() => import('./screens/ImportPlan'));
const Calendar = lazy(() => import('./screens/Calendar'));
const Achievements = lazy(() => import('./screens/Achievements'));
const Shop = lazy(() => import('./screens/Shop'));
const WorkoutEdit = lazy(() => import('./screens/WorkoutEdit'));
const PublicProfile = lazy(() => import('./screens/PublicProfile'));
const Progress = lazy(() => import('./screens/Progress'));
const Download = lazy(() => import('./screens/Download'));
const ImportProgress = lazy(() => import('./screens/ImportProgress'));
const AddFriend = lazy(() => import('./screens/AddFriend'));

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
    // Natural carousel feel, works both ways: swipe left → next tab (to the
    // right), swipe right → previous tab (to the left).
    const next = dx < 0 ? idx + 1 : idx - 1;
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
      <Tutorial />
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
  const autoTheme = useSettings((s) => s.autoTheme);
  const appLock = useSettings((s) => s.appLock);
  const ensureDailyQuests = useGami((s) => s.ensureDailyQuests);
  const seedFeed = useSocial((s) => s.seedIfEmpty);
  const onboarded = useUser((s) => s.profile?.onboarded);
  const [locked, setLocked] = useState(() => appLock.enabled && !!appLock.code);

  // A friend invite opened before sign-up is stashed; apply it once onboarded.
  useEffect(() => {
    if (!onboarded) return;
    const pending = takePendingInvite();
    if (!pending) return;
    if (useSocial.getState().addFriendByInvite(pending) === 'added') {
      celebrate();
      toast(`${pending.name} is now your gym partner 🤝`);
    }
  }, [onboarded]);

  useEffect(() => {
    // Auto day/night overrides the chosen theme when enabled.
    if (autoTheme) {
      const h = new Date().getHours();
      applyTheme(h >= 7 && h < 19 ? 'daybreak-light' : 'forge-dark');
    } else {
      applyTheme(theme);
    }
    ensureDailyQuests();
    seedFeed();
    // Live social: ensure a cloud session (anonymous if needed, no signup),
    // then pull the real friend graph.
    void ensureCloudAccount().then(() => void useSocial.getState().syncFriends());
    // Restore any live Supabase session and keep stores in sync.
    const stopAuth = initAuth();
    // Best-effort workout reminders while the app is open.
    const stopReminders = startReminderScheduler(() => useSettings.getState().reminder);
    // Offline sync engine: flush queued writes whenever we regain connectivity.
    const off = onReconnect(() => void syncQueue());
    // Auto cloud-backup when the app is backgrounded (no-ops if signed out/offline).
    const onHide = () => { if (document.visibilityState === 'hidden') { void pushCloudBackup(); void pushMyActivity(); } };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      stopAuth();
      stopReminders();
      off();
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [applyTheme, theme, autoTheme, ensureDailyQuests, seedFeed]);

  if (locked) {
    return (
      <PhoneFrame>
        <LockScreen code={appLock.code} onUnlock={() => setLocked(false)} />
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <UpdatePrompt />
      <Toaster />
      <PasswordReset />
      <ErrorBoundary>
      <HashRouter>
        <Suspense fallback={<ScreenSkeleton />}>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/download" element={<Download />} />
          <Route path="/add-friend" element={<AddFriend />} />
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
            <Route path="/collection" element={<Collection />} />
            <Route path="/plan" element={<PlanEditorScreen />} />
            <Route path="/import" element={<ImportPlan />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/workout/:id" element={<WorkoutEdit />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/import-progress" element={<ImportProgress />} />
            <Route path="/u" element={<PublicProfile />} />
            <Route path="/quote/:id" element={<QuoteDeepDive />} />
          </Route>
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
        </Suspense>
      </HashRouter>
      </ErrorBoundary>
    </PhoneFrame>
  );
}

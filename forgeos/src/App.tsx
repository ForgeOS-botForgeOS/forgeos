import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { PhoneFrame } from './components/PhoneFrame';
import { NowPlayingCD } from './components/NowPlayingCD';
import { handleSpotifyCallback } from './lib/spotify';
import { TabBar } from './components/TabBar';
import { RankUpWatcher } from './components/Celebrate';
import { Tutorial } from './components/Tutorial';
import { LockScreen } from './components/LockScreen';
import { UpdatePrompt } from './components/UpdatePrompt';
import { Toaster } from './components/Toaster';
import { DialogHost } from './components/DialogHost';
import { PasswordReset } from './components/PasswordReset';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ScreenSkeleton } from './components/Skeleton';
import { useUser } from './state/userStore';
import { useSettings } from './state/settingsStore';
import { useGami } from './state/gamificationStore';
import { useSocial } from './state/socialStore';
import { useWorkout } from './state/workoutStore';
import { watchGym } from './lib/geo';
import { tabOrder } from './lib/apprentice';
import { configureBackgroundSync, drainHealthCache, readHealthConnect } from './lib/healthConnect';
import { ingestGarminWorkouts } from './lib/garminWorkouts';
import { checkForApkUpdate } from './lib/appUpdate';
import { syncWebUpdate } from './lib/webUpdate';
import { announceIfUpdated } from './lib/updateNotice';
import { useHealth } from './state/healthStore';
import { haptic } from './lib/haptics';
import { hashPasscode, isLegacyPasscode } from './lib/appLock';
import { flushFeedbackQueue } from './lib/feedback';
import { initAuth } from './lib/auth';
import { startReminderScheduler } from './lib/reminders';
import { onReconnect, syncQueue } from './lib/offlineQueue';
import { pushCloudBackup } from './lib/cloudSync';
import { takePendingInvite } from './lib/invite';
import { ensureCloudAccount, pushMyActivity } from './lib/activitySync';
import { ensureRaceSession } from './lib/raceSession';
import { initAuthDeepLinks } from './lib/authDeepLink';
import { syncDuels } from './lib/duelSync';
import { initLiveFeed } from './lib/liveFeed';
import { toast, celebrate } from './lib/toast';

// Code-split every screen so the initial route loads a small chunk.
const Onboarding = lazy(() => import('./screens/onboarding/Onboarding'));
const Home = lazy(() => import('./screens/Home'));
const ApprenticeHome = lazy(() => import('./screens/ApprenticeHome'));
const Train = lazy(() => import('./screens/Train'));
const Library = lazy(() => import('./screens/Library'));
const ExerciseDetail = lazy(() => import('./screens/ExerciseDetail'));
const Cookbook = lazy(() => import('./screens/Cookbook'));
const RecipeDetail = lazy(() => import('./screens/RecipeDetail'));
const NutritionPlanScreen = lazy(() => import('./screens/NutritionPlan'));
const TrainerScreen = lazy(() => import('./screens/Trainer'));
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
const ImportWorkout = lazy(() => import('./screens/ImportWorkout'));
const Calendar = lazy(() => import('./screens/Calendar'));
const Achievements = lazy(() => import('./screens/Achievements'));
const Shop = lazy(() => import('./screens/Shop'));
const WorkoutEdit = lazy(() => import('./screens/WorkoutEdit'));
const PublicProfile = lazy(() => import('./screens/PublicProfile'));
const Progress = lazy(() => import('./screens/Progress'));
const Health = lazy(() => import('./screens/Health'));
const Download = lazy(() => import('./screens/Download'));
const ImportProgress = lazy(() => import('./screens/ImportProgress'));
const AddFriend = lazy(() => import('./screens/AddFriend'));
const RaceJoin = lazy(() => import('./screens/RaceJoin'));
const Wrapped = lazy(() => import('./screens/Wrapped'));

// Left→right order of the bottom tabs comes from lib/apprentice, so the swipe
// gesture can never carry someone to a tab their bottom bar does not show.

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const tabs = tabOrder(useSettings((s) => s.apprentice));
  const touch = useRef<{ x: number; y: number; ok: boolean } | null>(null);
  const geofenceEnabled = useSettings((s) => s.geofenceEnabled);
  const gym = useSettings((s) => s.gym);

  // Geofenced "Welcome to the Forge" check-in. Lives here (not on a screen) so
  // a single watch persists across tab navigation and never re-arms — opening a
  // screen while standing in the gym must not yank you to the workout. Only a
  // real arrival fires, and a 3h cooldown stops GPS jitter from re-triggering.
  useEffect(() => {
    if (!geofenceEnabled) return;
    return watchGym(gym, () => {
      const last = Number(localStorage.getItem('forge-geofence-last') ?? 0);
      if (Date.now() - last < 3 * 60 * 60 * 1000) return; // already welcomed recently
      if (useWorkout.getState().active) return; // already training — don't interrupt
      localStorage.setItem('forge-geofence-last', String(Date.now()));
      haptic('success');
      toast('🔥 Welcome to the Forge — opening today’s workout.', 'info');
      navigate('/train');
    });
  }, [geofenceEnabled, gym, navigate]);

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
    const idx = tabs.indexOf(location.pathname);
    if (idx === -1) return; // only on main tab screens
    // Natural carousel feel, works both ways: swipe left → next tab (to the
    // right), swipe right → previous tab (to the left).
    const next = dx < 0 ? idx + 1 : idx - 1;
    if (next >= 0 && next < tabs.length) navigate(tabs[next]);
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
      <NowPlayingCD />
      <TabBar />
    </div>
  );
}

// Layout for routes that live OUTSIDE AppShell (no tab bar, pre-onboarding
// friendly). AppShell's <main> provides scrolling for everything inside it —
// this shell does the same job out here, so no public screen can ever ship
// with its content clipped again. New public routes go under this element.
function PublicShell() {
  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <Suspense fallback={<ScreenSkeleton />}>
        <Outlet />
      </Suspense>
    </div>
  );
}

/**
 * The Home tab is the one screen Apprentice Mode replaces outright rather than
 * trimming: a beginner's dashboard is a different screen, not a shorter one.
 * Both are lazy, so only the one in use is downloaded.
 */
function HomeRoute() {
  const apprentice = useSettings((s) => s.apprentice);
  return apprentice ? <ApprenticeHome /> : <Home />;
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

  // Complete a Spotify login if we just came back from its consent screen.
  useEffect(() => { void handleSpotifyCallback(); }, []);

  // Anything that could not be sent last time (no signal, no session) goes now.
  useEffect(() => { void flushFeedbackQueue(); }, []);

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
    // If a silent auto-update just applied, confirm it visibly (see updateNotice).
    announceIfUpdated();
    // Seamless wearable refresh — no-ops off-device, without Health Connect
    // permission, or when the user has switched recovery off. minGapMin
    // throttles the foreground-resume path so we don't hammer Health Connect.
    const syncHealth = (minGapMin = 0) => {
      if (!useSettings.getState().recoveryEnabled) return;
      const last = useHealth.getState().lastSyncAt;
      if (minGapMin && last && Date.now() - last < minGapMin * 60_000) return;
      void readHealthConnect(21).then((r) => {
        if (r.days.length) useHealth.getState().ingest(r.days, 'healthconnect');
        ingestGarminWorkouts(r.workouts);
      });
    };
    // Keep the closed-app background worker in step with the toggle, and ingest
    // anything it cached overnight (instant — no Health Connect round-trip).
    const rec = useSettings.getState().recoveryEnabled;
    void configureBackgroundSync(rec, { bedtime: useSettings.getState().bedtimeNudge });
    if (rec) void drainHealthCache().then((r) => {
      if (r.days.length) useHealth.getState().ingest(r.days, 'healthconnect');
      ingestGarminWorkouts(r.workouts);
    });
    syncHealth();
    // APK updates: OTA-capable builds pull new web bundles silently
    // (checkForApkUpdate triggers that sync); the nudge only fires when a
    // native change genuinely needs a fresh APK. No-op on the website.
    void checkForApkUpdate().then((u) => { if (u.available) toast('Core update ready — one tap in You → Update installs it 🚀', 'info'); });
    // Live social: ensure a cloud session (anonymous if needed, no signup),
    // then pull the real friend graph.
    void ensureCloudAccount().then(() => {
      void useSocial.getState().syncFriends();
      // Live duels: discover incoming challenges + opponents' progress.
      void syncDuels();
      // Live feed: friends' new posts stream in (needs the session for RLS).
      initLiveFeed();
    });
    // Rejoin a live race channel if the app was refreshed mid-race.
    ensureRaceSession();
    // Installed app: catch the forgeos://auth deep link that completes Google
    // sign-in (the round-trip happens in the system browser).
    initAuthDeepLinks();
    // Restore any live Supabase session and keep stores in sync.
    const stopAuth = initAuth();
    // Best-effort workout reminders while the app is open.
    const stopReminders = startReminderScheduler(() => useSettings.getState().reminder);
    // Offline sync engine: flush queued writes whenever we regain connectivity.
    const off = onReconnect(() => void syncQueue());
    // Auto cloud-backup when the app is backgrounded (no-ops if signed out/offline),
    // and a fresh wearable pull when it comes back to the foreground so Garmin
    // data stays current without the user ever opening the Health screen.
    const onHide = () => {
      if (document.visibilityState === 'hidden') { void pushCloudBackup(); void pushMyActivity(); }
      else { syncHealth(20); void syncWebUpdate(); }
    };
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
        <LockScreen
          code={appLock.code}
          onUnlock={(entered) => {
            // A device that still stores the old cleartext PIN upgrades itself
            // the first time it is unlocked — one unlock, no plaintext left.
            if (isLegacyPasscode(appLock.code)) {
              void hashPasscode(entered).then((secret) => useSettings.getState().set('appLock', { enabled: true, code: secret }));
            }
            setLocked(false);
          }}
        />
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <UpdatePrompt />
      <Toaster />
      <DialogHost />
      <PasswordReset />
      <ErrorBoundary>
      <HashRouter>
        <Suspense fallback={<ScreenSkeleton />}>
        <Routes>
          <Route element={<PublicShell />}>
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/download" element={<Download />} />
            <Route path="/add-friend" element={<AddFriend />} />
          </Route>
          <Route
            element={
              <RequireOnboarding>
                <AppShell />
              </RequireOnboarding>
            }
          >
            <Route path="/home" element={<HomeRoute />} />
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
            <Route path="/import-workout" element={<ImportWorkout />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/workout/:id" element={<WorkoutEdit />} />
            <Route path="/exercise/:id" element={<ExerciseDetail />} />
            <Route path="/cookbook" element={<Cookbook />} />
            <Route path="/recipe/:id" element={<RecipeDetail />} />
            <Route path="/nutrition-plan" element={<NutritionPlanScreen />} />
            <Route path="/trainer" element={<TrainerScreen />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/health" element={<Health />} />
            <Route path="/import-progress" element={<ImportProgress />} />
            <Route path="/race-join" element={<RaceJoin />} />
            <Route path="/u" element={<PublicProfile />} />
            <Route path="/quote/:id" element={<QuoteDeepDive />} />
            <Route path="/wrapped" element={<Wrapped />} />
          </Route>
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
        </Suspense>
      </HashRouter>
      </ErrorBoundary>
    </PhoneFrame>
  );
}

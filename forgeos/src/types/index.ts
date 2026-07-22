// ---- Core domain types for ForgeOS ----

export type Sex = 'male' | 'female';
export type Goal = 'lose' | 'maintain' | 'gain' | 'recomp' | 'strength';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type ExerciseCategory =
  | 'Powerlifting'
  | 'Bodybuilding'
  | 'Plyometrics'
  | 'Calisthenics'
  | 'Olympic'
  | 'CrossFit'
  | 'Cardio';

export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Biceps'
  | 'Triceps'
  | 'Quads'
  | 'Hamstrings'
  | 'Glutes'
  | 'Calves'
  | 'Core'
  | 'Full Body';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  primary: MuscleGroup;
  secondary: MuscleGroup[];
  equipment: string;
  isCore?: boolean; // a "core lift" eligible for plateau detection
  videoUrl?: string;
}

export type SubTargetKind = 'tut' | 'band' | 'isometric' | 'none';

export interface SetEntry {
  id: string;
  weightKg: number;
  reps: number;
  rpe?: number; // 1-10
  completed: boolean;
  // flexible sub-targets
  subKind?: SubTargetKind;
  tutSeconds?: number;
  bandColor?: string;
  isoSeconds?: number;
  note?: string;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  sets: SetEntry[];
  // superset/circuit linkage — exercises sharing a groupId alternate rest
  supersetGroup?: string;
  restPresetSec?: number;
}

export interface Workout {
  id: string;
  name: string;
  date: string; // ISO
  exercises: WorkoutExercise[];
  durationSec?: number;
  completed: boolean;
  totalVolumeKg?: number;
  xpEarned?: number;
  spotifyTrack?: SpotifyTrack | null;
  synced?: boolean; // offline-queue status
  cardio?: CardioLog;
}

// A user-defined extra metric on a cardio log (e.g. "Avg HR" → "152 bpm").
// Value is free text so you can log whatever you want, in your own units.
export interface CardioMetric {
  id: string;
  label: string;
  value: string;
}

export interface CardioLog {
  machine: string;
  distanceKm: number;
  durationMin: number;
  calories?: number;
  metrics?: CardioMetric[];
}

// A dated body snapshot for the Progress layer (weight + girths + optional photo).
export interface BodyStat {
  date: string; // yyyy-mm-dd
  weightKg?: number;
  waistCm?: number;
  chestCm?: number;
  armCm?: number;
  thighCm?: number;
  hipCm?: number;
  bodyFatPct?: number;
  photo?: string; // compressed data URL
}

export interface PR {
  id: string;
  exerciseId: string;
  exerciseName: string;
  weightKg: number;
  reps: number;
  e1rm: number;
  date: string;
  spotifyTrack?: SpotifyTrack | null;
}

export interface WeighIn {
  date: string; // ISO date
  weightKg: number;
}

// ---- Plans ----
export type Weekday = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface ExerciseTarget {
  sets: number;
  reps: number;
  weightKg?: number; // planned working weight (0/undefined = auto-progress)
}

export interface PlannedDay {
  day: Weekday;
  label: string; // e.g. "Push", "Rest", "Legs"
  exerciseIds: string[];
  rest: boolean;
  targets?: Record<string, ExerciseTarget>; // per-exercise sets×reps
}

export interface SavedPlan {
  id: string;
  name: string;
  plan: WeekPlan;
  savedAt: string;
}

export interface WeekPlan {
  id: string;
  blockType: 'hypertrophy' | 'strength';
  days: PlannedDay[];
}

// ---- User / profile ----
export interface MacroTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  authProvider?: 'google' | 'apple' | 'email' | 'guest';
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  goalWeightKg?: number; // target on the scale — drives the trend ETA on the weigh-in card
  activity: ActivityLevel;
  experience: ExperienceLevel;
  bodyFatPct?: number;
  tdee: number;
  bmr: number;
  macros: MacroTargets;
  quizAnswers: Record<string, string>;
  specialRequest?: string;
  about?: string; // free-text self-description from onboarding — feeds tailored coaching
  noWeekends?: boolean;
  onboarded: boolean;
  joinedAt?: string; // "member since" — preserved across progress imports
  friendCode?: string; // unique per-user code others use to add them
}

// ---- Gamification ----
export interface RankTier {
  name: string;
  sub: number; // sub-tier (1..n)
  minXp: number;
  color: string;
  unlocksTheme?: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  scope: 'daily' | 'weekly' | 'monthly' | 'yearly';
  xp: number;
  coins: number;
  target: number;
  // sleepMin/steps/weekSteps/sleepNights are recovery metrics synced as
  // absolute values from healthStore (not bumped incrementally).
  metric: 'sets' | 'sessions' | 'volume' | 'pr' | 'streak' | 'sleepMin' | 'steps' | 'weekSteps' | 'sleepNights';
}

export interface UserQuest {
  questId: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
  assignedAt: string;
}

export interface StreakWager {
  active: boolean;
  targetSessions: number;
  staked: number;
  deadline: string;
  startedAt?: string; // window opens here — past workouts within [startedAt, deadline] count
  progress: number;
}

// ---- Social ----
export interface Friend {
  id: string;
  name: string;
  rank: string;
  xp: number;
  online: boolean;
  avatarSeed: string;
  trainingNow?: boolean;
  streak?: number;
  weeklySteps?: number; // this week's step count (shared via Garmin sync)
  lastActiveISO?: string;
  cheeredAt?: string; // last time you cheered them
  friendCode?: string; // set when added via a real invite link (dedup + "real" badge)
}

export interface FriendRequest {
  id: string;
  name: string;
  avatarSeed: string;
  rank: string;
  xp: number;
  direction: 'incoming' | 'outgoing';
  createdAt: string;
  mutuals?: number;
}

export interface FeedComment {
  id: string;
  authorName: string;
  avatarSeed: string;
  body: string;
  createdAt: string;
}

export type DuelMetric = 'volume' | 'sessions' | 'sets';

export interface Duel {
  id: string;
  opponentName: string;
  opponentAvatar: string;
  metric: DuelMetric;
  target: number;
  myProgress: number;
  theirProgress: number;
  endsAt: string;
  createdAt: string;
  status: 'active' | 'won' | 'lost';
  /** Real friend's profile id — present only on live (Supabase-synced) duels. */
  opponentId?: string;
  /** Which duels-table column is mine; absent = local duel with a simulated opponent. */
  side?: 'challenger' | 'opponent';
}

export interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  avatarSeed: string;
  body: string;
  workoutSummary?: { volumeKg: number; sets: number; durationMin: number };
  createdAt: string;
  reactions: Record<string, number>; // emoji -> count
  myReaction?: string;
  flex?: { icon: string; label: string }; // a "flex" badge, e.g. 🏆 New PR
  comments?: FeedComment[];
  mine?: boolean; // authored by the local user
  imageUrl?: string; // optional attached share-card / photo
}

export interface MarketplaceRoutine {
  id: string;
  title: string;
  author: string;
  authorRank: string;
  priceCoins: number;
  weeks: number;
  daysPerWeek: number;
  focus: string;
  rating: number;
  owned?: boolean;
  byMe?: boolean;
  plan?: WeekPlan; // attached week plan that buyers can adopt
}

// ---- Nutrition ----
export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  sugarG: number;
  date: string;
  source: 'manual' | 'scan';
  confidence?: number;
}

export interface FoodItem {
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  sugarG: number;
}

export interface ScanResult extends FoodItem {
  confidence: number;
  tip: string;
  items?: FoodItem[]; // per-food breakdown
}

export interface CardioScan {
  machine: string;
  durationMin: number;
  distanceKm: number;
  calories: number;
  avgPace: string;
  avgHr?: number; // average heart rate (bpm) when the watch/console shows it
  confidence: number;
  tip: string;
}

// ---- Spotify ----
export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  durationMs: number;
}

// ---- Settings ----
export type HealthSource = 'garmin' | 'healthconnect' | 'manual' | 'import';

// One calendar day of wearable / wellness data. Every field is optional because
// different sources (Garmin export, Health Connect, manual entry) fill in
// different subsets — we merge them per day rather than overwrite wholesale.
export interface HealthDay {
  date: string; // local 'YYYY-MM-DD'
  sleepMinutes?: number; // total time asleep
  sleepScore?: number; // 0–100 (Garmin sleep score) if available
  steps?: number;
  restingHr?: number; // bpm
  activeCalories?: number; // kcal burned in activity
  bodyBattery?: number; // 0–100 (Garmin)
  stress?: number; // 0–100 (Garmin)
  source: HealthSource;
  updatedAt: number;
}

// A workout session recorded on the watch (Garmin → Health Connect →
// ExerciseSessionRecord). `id` is Health Connect's stable record UUID — the
// dedupe key that makes importing the same session twice impossible.
export interface GarminWorkout {
  id: string;
  type: string; // normalised: 'running' | 'cycling' | 'strength' | … | 'workout'
  title?: string; // the name Garmin gave it (e.g. "Morning Run")
  start: string; // ISO instant
  date: string; // local 'YYYY-MM-DD'
  durationMin: number;
  distanceKm?: number;
  calories?: number;
}

export type Language = 'en' | 'sk';

export type QuoteGenrePref = QuoteGenre | 'all';

export type ThemeId =
  | 'forge-dark'
  | 'iron-dawn'
  | 'crimson-titan'
  | 'arctic-steel'
  | 'midnight-ocean'
  | 'forest-moss'
  | 'rose-quartz'
  | 'volcanic-ash'
  | 'emerald-forge'
  | 'obsidian-platinum'
  | 'cyber-lime'
  | 'royal-amethyst'
  | 'synthwave'
  | 'blood-moon'
  | 'solar-flare'
  | 'nebula'
  | 'sunset-blaze'
  | 'daybreak-light'
  | 'paper-light';
export type QuoteGenre = 'stoic' | 'biblical' | 'zen' | 'warrior';

export interface GymConfig {
  name: string;
  lat: number;
  lng: number;
  radiusM: number;
  maxWeightKg: number; // heaviest available weight (e.g. dumbbells), default 20
}

export interface ReminderConfig {
  enabled: boolean;
  time: string; // "HH:MM"
  days: number[]; // 0=Mon … 6=Sun
}

export interface AppLock {
  enabled: boolean;
  code: string; // local passcode (app lock, not account auth)
}

// Design mode = the visual language, orthogonal to the colour `theme`.
// 'classic' = the original ForgeOS look · 'nova' = the gradient-glass redesign ·
// 'bolt' = the bold editorial / neo-brutalist ground-up redesign (grotesque
// display type, flat high-contrast blocks, hard offset shadows, anchored nav).
// Every mode drives off the theme variables, so all colour themes keep working.
export type DesignMode = 'classic' | 'nova' | 'bolt';

export interface Settings {
  language: Language;
  gym: GymConfig;
  appLock: AppLock;
  publicProfile: boolean;
  heavyQuotesEnabled: boolean; // heavy-set quote "drops"
  weeklyGoal: number; // planned sessions per week (drives the week streak)
  streakMode: 'weekly' | 'daily';
  reminder: ReminderConfig;
  theme: ThemeId;
  autoTheme: boolean; // day = light, night = dark
  designMode: DesignMode; // visual language: classic · nova · bolt
  quoteGenre: QuoteGenrePref;
  leaderboardPublic: boolean;
  shareActivity: boolean; // let friends see your real workout activity (live backend)
  streakGambling: boolean;
  marketplaceEnabled: boolean;
  xpToCoinRate: number; // XP per 1 coin
  geofenceEnabled: boolean;
  hapticsEnabled: boolean;
  recoveryEnabled: boolean; // show Health & recovery (sleep/readiness) across the app
  bedtimeNudge: boolean; // evening "aim for 8h" notification (APK, needs recovery on)
  autoImportWorkouts: boolean; // watch-recorded workouts flow into history (needs recovery on)
  prefillWeights: boolean; // new sets start at last time's weights AND reps, set for set
  units: 'metric';
}

// ---- Quotes ----
export interface Quote {
  id: string;
  genre: QuoteGenre;
  text: string;
  source: string;
  deepDive: string;
}

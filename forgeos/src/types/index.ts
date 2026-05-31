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
export type Weekday = 'Mo' | 'Di' | 'Mi' | 'Do' | 'Fr' | 'Sa' | 'So';

export interface PlannedDay {
  day: Weekday;
  label: string; // e.g. "Push", "Rest", "Legs"
  exerciseIds: string[];
  rest: boolean;
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
  activity: ActivityLevel;
  experience: ExperienceLevel;
  bodyFatPct?: number;
  tdee: number;
  bmr: number;
  macros: MacroTargets;
  quizAnswers: Record<string, string>;
  onboarded: boolean;
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
  metric: 'sets' | 'sessions' | 'volume' | 'pr' | 'streak';
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

export interface ScanResult {
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  sugarG: number;
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
export type Language = 'en' | 'sk';

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
  | 'solar-flare';
export type QuoteGenre = 'stoic' | 'biblical';

export interface Settings {
  language: Language;
  theme: ThemeId;
  quoteGenre: QuoteGenre;
  leaderboardPublic: boolean;
  streakGambling: boolean;
  marketplaceEnabled: boolean;
  xpToCoinRate: number; // XP per 1 coin
  geofenceEnabled: boolean;
  hapticsEnabled: boolean;
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

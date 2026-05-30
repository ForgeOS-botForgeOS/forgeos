# ForgeOS 🔥

A gamified, enterprise-scale **fitness · nutrition · social** app built on an 80/20 philosophy.
Vite + React + TypeScript, Zustand (persisted), Tailwind theming, Recharts, Framer Motion,
@dnd-kit, IndexedDB offline queue, and a Supabase backend scaffold with a **full mock fallback** —
every screen works with zero keys.

> Metric / EU throughout: kg (2.5 kg increments), cm, kcal, protein g/kg, TDEE via Mifflin-St Jeor, weekdays Mo–So.

## Features

- **Onboarding** — OAuth/email sign-in hub, 10-question ice-breaker (pick or write-your-own), metric goal input → auto TDEE/macros, a scored fitness test (level + body-fat band), and an auto-generated, fully editable week plan.
- **Home** — calorie ring, macro bars, science tip of the day, weekly volume chart, weigh-in tracker with rolling average, volume heatmap, and a once-per-day Stoic/Biblical quote popup with deep-dive screen.
- **Train** — live set logging (kg+reps), Epley+Brzycki e1RM, RPE slider, smart ±increments, swipe-to-complete/delete, long-press notes, ghost overlay of last week, rest timer presets, plate/warm-up/1RM tools, superset builder, substitution engine, custom exercises, flexible sub-targets (TUT/band/isometric), Plateau Breaker, and an adaptive periodisation engine.
- **Library** — 150+ exercises across 6 categories, search + filter, Web NFC pairing with graceful fallback.
- **Nutrition** — AI photo macro scanner (mock or live), food log, macro tracking, goal-aligned tips, recomp calculator with calorie cycling.
- **Social** — feed with emoji reactions, friends, live multiplayer race (Supabase Realtime scaffold), routine marketplace (Forge Coins), canvas workout share-card generator.
- **Quests** — Bronze→Strongman ranks with exponential XP curve, opt-in leaderboard, Forge Coins, streak system + optional streak gambling, daily/weekly/monthly/yearly quest board, PR Hall of Fame with attached Spotify track.
- **Spotify** — player UI + OAuth scaffold, attach-a-song-to-a-PR.
- **Profile/Settings** — theme switcher (Forge Dark / Iron Dawn + 2 rank-locked), quote genre, leaderboard privacy, streak gambling, marketplace, XP→coin rate, geofence check-in, offline-sync status, week-plan editor.
- **Background systems** — geofenced check-ins, IndexedDB offline sync queue, volume heatmap, local-notification-ready quote/streak library.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run preview  # serve the build
```

No environment variables are required — the app falls back to a complete mock data layer.

## Environment

Copy `.env.example` to `.env.local` and fill in any you want to go live (all optional):

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Postgres + Auth + Realtime + Storage |
| `VITE_VISION_API_URL`, `VITE_VISION_API_KEY` | AI photo → macros endpoint |
| `VITE_SPOTIFY_CLIENT_ID` | Spotify Web playback OAuth |

## Backend

Apply `supabase/schema.sql` in the Supabase SQL editor — it creates profiles, workouts, sets,
exercises, friendships, feed_posts, reactions, leaderboard_entries, quests, user_quests,
marketplace_routines, purchases, prs, weigh_ins, with row-level security and a new-user trigger.
Auth is pluggable (Google + Apple OAuth + email/password) in `src/lib/supabase.ts`.
Live realtime/socket points are marked `// TODO: wire backend`.

## Project structure

```
src/
  components/        shared UI, PhoneFrame, TabBar, Heatmap, WeighInTracker, train/*
  data/              exercises (150+), ranks + XP curve, quests, quotes, tips
  lib/               fitness math, analytics, supabase, vision, spotify, offlineQueue, geo, haptics, shareCard
  state/             Zustand slices (user, workout, gamification, social, nutrition, settings)
  screens/           Home, Train, Library, Nutrition, Social, Quests, Profile, Spotify, QuoteDeepDive
  screens/onboarding multi-step flow + plan generator + fitness test
supabase/schema.sql  Postgres schema + RLS
```

## Deploy to Vercel

1. Push to GitHub and import the repo in Vercel.
2. Framework preset: **Vite**. Build command `npm run build`, output `dist`.
3. Add any `VITE_*` env vars under Project → Settings → Environment Variables.
4. Routing uses `HashRouter`, so no SPA rewrite config is needed.

Built with Claude Code.

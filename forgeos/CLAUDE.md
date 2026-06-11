# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo layout (important)

The **git root is the parent dir** (`my-claude-project/`), not this folder. The app lives in `forgeos/`. Siblings of `forgeos/`:
- `.github/workflows/` — `deploy.yml` (GitHub Pages website) and `android.yml` (Capacitor APK). Both run with `working-directory: forgeos`.
- `worker/` — a Cloudflare Worker (`worker/src/index.js`) providing the optional vision endpoint (food/cardio/progress scanning via a free vision model).

After running `git` commands the shell cwd can reset to the git root; **prefix app commands with `cd forgeos`** (or use absolute paths) or `npm` won't find `package.json`.

## Commands

```bash
cd forgeos
npm install
npm run dev        # vite dev server
npm run build      # tsc -b (strict typecheck) + vite build  — ALWAYS run before committing
npm run lint       # eslint
npm test           # vitest run (whole suite)
npx vitest run src/lib/import/import.test.ts            # one test file
npx vitest run -t "keeps a recent streak alive"         # one test by name
node scripts/generate-icons.cjs                         # regenerate PWA/app icons from code
```

Build/test gotchas:
- **Node 18.** The `build` script needs `NODE_OPTIONS=--require=./scripts/crypto-polyfill.cjs` (workbox needs `crypto`); it's already wired into the npm script. `vitest` is pinned to **1.6.x** because newer versions require Node 20.
- **`tsc` is strict** (`noUnusedLocals`/`noUnusedParameters`). The build fails on any unused import/var — trim them. This is the most common build break.
- Test files (`src/**/*.test.ts`) are **excluded from the production `tsc` build** via `tsconfig.app.json`; they only run under Vitest (node environment, no DOM).

## Deploy

Pushing to `main` triggers **two** CI builds (the website and the APK). The default branch worked on is often a feature branch, so deploy by pushing to `main` explicitly: `git push origin HEAD:main`.
- **Website** (`deploy.yml`) builds with `DEPLOY_BASE=/forgeos/` (GitHub Pages subpath) → `https://forgeos-botforgeos.github.io/forgeos/`.
- **APK** (`android.yml`) builds the Capacitor Android app and publishes `forgeos.apk` to a rolling `app-latest` GitHub release; the in-app `/download` page links to it.
- **Base path matters:** the website uses base `/forgeos/`; the Capacitor app uses base `/` (the default `npm run build`, no `DEPLOY_BASE`). Never hardcode the base — it's driven by `vite.config.ts` reading `DEPLOY_BASE`.

## Architecture (big picture)

**Client-first, offline-first, mock-by-default.** There is no required backend — Zustand stores persisted to `localStorage` are the source of truth, and every external integration degrades to realistic mock data. `isBackendLive` / `visionIsLive` / `googleIsLive` gate any live calls; `src/lib/repositories.ts` and `src/lib/supabase.ts` are no-ops when keys are absent. Treat the stores as the schema; the optional Supabase backend (`supabase/schema.sql`) mirrors them.

**State = `src/state/*Store.ts`** (Zustand + `persist`). Each slice owns one domain and is the canonical data model:
- `gamificationStore` — XP, coins, ranks, **streaks**, heavyLifts, quests, wager. `userStore` — profile, weighIns, bodyStats, savedPlans. `workoutStore` — history, PRs, the active session. Plus `nutrition`, `social`, `settings`, `cosmetics`, `quote`, `import`.
- Cross-store writes happen via `useX.getState()` / `useX.setState()` (e.g. `workoutStore.addManualWorkout` calls `useGami.getState().countSession`). Watch for **import cycles** — lower-level stores must not import higher-level ones.
- **Zustand v5 selector gotcha:** a selector that returns a fresh object/array on every call breaks `useSyncExternalStore` (and selecting a stable *getter function* makes the component non-reactive — this caused a real "laggy" bug). Select primitives, or select raw state and derive with `useMemo`.

**Routing:** `App.tsx` uses `HashRouter` with lazy-loaded screens. Routes inside `AppShell` are gated by `RequireOnboarding`; a few (`/onboarding`, `/download`) are public. Everything is wrapped in `PhoneFrame` (a fixed phone-sized viewport).

**Theming:** ~15 themes are pure **CSS variables** switched by `data-theme` on `<html>` (`src/index.css`). Use Tailwind classes that reference the vars (`bg-surface`, `text-accent`, `rgb(var(--accent))`) — never hardcode colors. `settingsStore.applyTheme` sets the attribute; `autoTheme` swaps light/dark by time of day.

**Gamification model (non-obvious):**
- **Streak is weekly = "weeks you showed up"**: `weekStreak` increments on the first session of a week and only resets when a whole week is skipped. The daily `streakDays` still exists and is shown secondarily. `weeklyGoal` (settings) is an adherence target, not a gate.
- Ranks are XP-derived (`src/data/ranks.ts`); achievements (`src/data/achievements.ts`, 50+) are computed from a stats snapshot, never granted directly — raising stats auto-unlocks them.

**Feedback layer:** use `toast()` / `celebrate()` from `src/lib/toast.ts` (a tiny Zustand store rendered by `components/Toaster.tsx`) instead of `window.alert`. `celebrate()` fires confetti. Animation is Framer Motion throughout; shared interactive primitives live in `components/ui.tsx` (springy `Button`/`Pill`/`Toggle`, `Sheet` with swipe-to-dismiss).

**Optional AI vision** (`src/lib/vision.ts`): posts an image + `mode` (`food` | `cardio` | `progress`) to the Cloudflare Worker (`VITE_VISION_API_URL`). Returns DB-grounded, editable estimates; mocks when no worker.

**Generic progress import** (`src/lib/import/`, see its `README.md`): one adapter-free pipeline — `ingest (3 trust-tagged lanes) → normalize (heuristic key-matching → canonical schema) → validate → light verify → timezone-aware streak continuity → map → idempotent merge (keeps the better value, never demotes) → snapshot-based undo`. The pure rules in `mergeRules.ts` / `normalize.ts` / `streak.ts` are unit-tested; `merge.ts` is the only part that writes stores.

## Conventions

- **Metric only** (kg in 2.5 kg increments, cm, kcal, protein g/kg, TDEE via Mifflin-St Jeor in `src/lib/fitness.ts`).
- i18n via `src/lib/i18n.ts` (`useT()`), EN + SK. User-facing strings should go through `t()` where the surrounding code does.
- Commit messages end with the `Co-Authored-By` trailer; only push when asked.

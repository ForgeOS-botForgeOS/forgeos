# V2 Redesign — Inventory & Parity Checklist (Phase 0)

> The full list of everything V2 must still satisfy. Scope is **visual layer only**:
> features, flows, IA, data, and business logic are **untouched**. V2 is a from-scratch
> visual language delivered through the existing design-mode plumbing (one `.ui-v2`
> class on `<html>` + scoped CSS + theme variables), superseding Bolt/Nova into a clean
> **Legacy ⟷ V2** toggle. Every item below must render and work identically in behaviour
> under V2; only its skin changes.

## Delivery mechanism (decided)

- **Toggle:** `settings.designMode` collapses to `'legacy' | 'v2'` (retire `classic`/`nova`/`bolt`; coerce them on rehydrate — `classic → legacy`, `nova`/`bolt` → `v2` or `legacy`, TBD Phase 2). Persisted, no restart, flips everything visible in one switch. Lives in Settings → App design.
- **Legacy = the current app, pixel-for-pixel** (no `.ui-*` class). Never modified.
- **V2 = `.ui-v2` class + scoped CSS**, driven entirely by theme variables. **No hardcoded hex in V2 CSS** — theme vars only (same rule Bolt/Nova already follow).
- **Design-system axis × theme axis are independent.** Every theme must render correctly under both systems.

## Restyle surfaces (the hook classes V2 owns)

V2 must give a complete, coherent treatment to each of these (Legacy leaves them as-is):

- `#phone-root` — app backdrop
- `.fx-card` — every Card (static + `.cursor-pointer` interactive variant)
- `.fx-primary` — primary Button
- Button variants `ghost` / `outline` / `danger` (currently unclassed — V2 may add hooks)
- `.fx-tabbar` — bottom navigation
- `.fx-sheet` — bottom sheets
- `.screen-head h1`, `h1`, `h2` — headers / display type
- `input`, `textarea`, `select` — form controls
- App-wide `font-family`
- Shared primitives in `components/ui.tsx`: `Pill`, `Stat`, `Ring`, `Toggle`, `Badge`, `SectionTitle` — verify each reads well under V2 (add hook classes if a Tailwind-only primitive needs V2-specific form)

## Screens — parity list (27)

Each must pass under V2 including **loading, empty, error, and offline states** where they exist.

**Primary tabs (bottom nav):**
- [ ] `Home` — calorie Ring + macros, weekly volume, weigh-in, daily quote, Wrapped teaser
- [ ] `Train` — live set logging, SetRow, RestTimer, RaceBar, Tools, "Your coach" tips
- [ ] `Nutrition` — daily log, macro scanner entry, barcode, recipes
- [ ] `Social` — live feed, friends, step race, live race, duels, rivalries, weekly review
- [ ] `Quests` — side quests, streak, wager
- [ ] `Profile` (You) — settings hub, theme picker, **App design picker (the toggle)**, tutorials

**Secondary / pushed:**
- [ ] `Library` (exercise library, 150+) · `History` · `Calendar` (Heatmap) · `Progress`
- [ ] `Achievements` · `Shop` · `Collection` · `Quests` detail
- [ ] `Health` (Garmin/readiness) · `Spotify` (player UI)
- [ ] `PlanEditor` · `WorkoutEdit` · `ImportPlan` · `ImportWorkout` · `ImportProgress`
- [ ] `Wrapped` (ceremony) + `WrappedTeaser` · `QuoteDeepDive`
- [ ] `AddFriend` · `RaceJoin` · `PublicProfile` (public/outside-app shell)

**Onboarding:**
- [ ] `Onboarding` (tap-quiz **and** type-it-yourself free-text path) · `FitnessTest`

**Public shell (outside AppShell):**
- [ ] `Download` · `PublicProfile` · lock screen / password reset / error screen

## Reusable components — parity list

- [ ] `PhoneFrame`, `Screen` (header + enter motion), `TabBar`
- [ ] `ui.tsx`: Card, Button, Pill, SectionTitle, Stat, Ring, Sheet, Toggle, Badge
- [ ] `Toaster` / `toast()` / `celebrate()` (confetti), `HeavyDrop`, `Celebrate`, `CountUp`
- [ ] `DailyQuote`, `Readiness`, `CloudStatus`, `WeighInTracker`, `Heatmap`, `Sparkline`, `Skeleton`
- [ ] `WeeklyRecap`, `WeeklyReviewCard`, `WrappedTeaser`
- [ ] `train/`: SetRow (completion burst), RestTimer (countdown ring), RaceBar, Tools
- [ ] `race/RaceHub`
- [ ] `CardioForm`, `BarcodeScanner`, `CreateExercise`, `ForgeLogo` (V2 mark), `InstallButton`, `UpdatePrompt`, `LockScreen`, `SecuritySheets`, `PasswordReset`, `ErrorBoundary`, `Tutorial`

## Feature systems (behaviour frozen — must not regress)

- [ ] Training math: e1RM (Epley/Brzycki), TDEE (Mifflin-St Jeor), progressive overload, periodisation, plateau breaker, plate/warm-up calc, supersets, substitution, ghost overlay
- [ ] Gamification: XP curve, ranks (Bronze→Strongman), Forge Coins, **weekly streak**, quests, wager, achievements (computed from stats), cosmetics/shop
- [ ] Nutrition: AI photo scan (vision worker), barcode, daily log, recomp calc, recipes
- [ ] Health: Garmin Health Connect, readiness score + morning notification, cardio
- [ ] Social: live feed (Realtime), friends/invites/public profiles, step race, live workout race (3 modes), real duels + rivalries + rematches, weekly review, marketplace, share card
- [ ] Platform: offline-first stores, sync engine, silent OTA web update + one-tap APK self-update, geofence check-ins, i18n EN/SK, metric-only, app lock, reminders, auto day/night theme

## Theme system (frozen names, re-authored palettes under V2)

~19 themes as `[data-theme='…']` CSS-var blocks: forge-dark (default), iron-dawn, emerald-forge, obsidian-platinum, crimson-titan, arctic-steel, synthwave, solar-flare, midnight-ocean, forest-moss, rose-quartz, volcanic-ash, cyber-lime, royal-amethyst, daybreak-light, paper-light, blood-moon, nebula, sunset-blaze. Two are light. Rank-locks stay as-is.

**Phase 2 decision to confirm:** the master prompt wants every theme's *palette* re-authored for V2. Options — (a) V2 inherits the existing per-theme vars and only reshapes form (lowest risk, themes "just work"); (b) V2 overrides palettes per theme via `.ui-v2[data-theme='…']` blocks (matches the prompt's "genuinely new palettes"). Default to (b) for the hero themes, (a) fallback for the long tail, to bound the work.

## QA matrix (Phase 7)

`screens × { legacy, v2 } × themes × { light-sensitive states, offline }` — plus: the toggle flips **everything** with **no visual leakage** between systems (no V2 rule bleeding into Legacy and vice-versa), reduced-motion respected, contrast ratios met, keyboard/screen-reader reachable, small-screen safe.

## Out of scope for V2 CSS (handled separately)

- **OS launcher icon** — global on a Capacitor PWA, can't swap per-toggle at runtime. New icon designed in Phase 6, shipped via a native build (`NATIVE_VERSION` bump, Peter pushes). In-app branding (`ForgeLogo`, splash) **does** swap with the toggle.

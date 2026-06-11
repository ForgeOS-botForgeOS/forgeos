# ForgeOS — Generic Progress Import

Migrate progress from **any** app into ForgeOS. One flexible pipeline normalizes
arbitrary input into a canonical schema, then **merges** it into the user's
existing progress keeping the **better value** — an import can only ever help.

There are **no per-app adapters**. A heuristic normalizer maps arbitrary keys
(`current_streak`, `xp`, `points`, `joined`, `gems`, …) onto one schema.

## Three ingestion lanes (`lanes.ts`)

| Lane | Input | Trust | Notes |
|------|-------|-------|-------|
| `api` | Pasted structured JSON export | **high** | Real OAuth needs a server; without a backend ForgeOS accepts the app's JSON export. |
| `file` | `.json` / `.csv` / `.xml` upload | **medium** | Parsed client-side. |
| `screenshot` | Image(s) → vision model | **low** | Uses the vision worker (`VITE_VISION_API_URL`); falls back to a manual typed form. |

All three return a structured object → everything downstream speaks **canonical**.

## Pipeline (`pipeline.ts`)

`ingest → normalize → validate → verify → map → preview → commit (merge) → audit`

1. **Normalize** (`normalize.ts`) — heuristic key matching → `CanonicalProgress`, with **per-field confidence**.
2. **Validate** (`validate.ts`) — bad rows are **skipped with a reason**, never throwing.
3. **Verify** (`verify.ts`, light) — rejects low-confidence screenshots; clamps impossible streaks vs. account age; **caps & quarantines** currency/XP above per-trust limits. No heavy anti-cheat.
4. **Streak continuity** (`streak.ts`) — computed in the **user's timezone**. Recent last-active ⇒ streak kept **alive** with a one-day grace; stale ⇒ preserved as a **longest-streak record** only.
5. **Map** (`mapToForge.ts`) — canonical → `ForgePatch` (candidate values) + honest "couldn't transfer" notes.
6. **Preview** — shown to the user **before** any write.
7. **Merge / commit** (`merge.ts`, rules in `mergeRules.ts`) — **idempotent**; re-running changes nothing.
8. **Audit / undo** (`state/importStore.ts`) — every import stores a snapshot; fully reversible.

## Canonical schema (`canonical.ts`)

`CanonicalProgress`: `source`, `trust`, `timezone`, `memberSince`,
`streak{current,longest,lastActive,startedAt,freezes}`,
`totals{xp,sessions,timeMinutes,heavyLifts}`, `level{rank,value}`,
`currency{coins}`, `achievements[]`, `personalBests[]`, `history[]` (heatmap),
`bodyStats[]`, `settings{weeklyGoal,units,reminderTime}`, `confidence{}`.

## Mapping into ForgeOS stores

| Canonical | ForgeOS | Rule |
|-----------|---------|------|
| `totals.xp` | `gami.xp` | `max` |
| `currency.coins` | `gami.coins` | `max` + one-time +50 welcome |
| `streak.current` | `gami.streakDays` | `max` (only if continuity = alive) |
| `streak.longest` | `gami.bestStreak` | `max` |
| `totals.heavyLifts` | `gami.heavyLifts` | `max` |
| `history[]` | `workout.history` | union by `imp:<source>:<date>` id |
| `personalBests[]` | `workout.prs` | keep higher e1RM per exercise |
| `bodyStats[]` | `user.bodyStats` + `weighIns` | union by date; existing wins |
| `memberSince` | `profile.joinedAt` | earliest |
| `settings.weeklyGoal` | `settings.weeklyGoal` | fill-in |

ForgeOS achievements are XP/stat-derived, so imported totals **auto-unlock**
matching badges. Source-only badges are summarised (count) and surfaced.

## Guarantees
- **Never worse off** — every value is `max(current, imported)`.
- **Idempotent** — deterministic ids + `max` mean re-imports are no-ops (the +50 welcome applies once per source).
- **Reversible** — `undoImport(id)` restores the pre-import snapshot.
- **Privacy** — everything stays on-device; only screenshots you choose are sent to the reader, then discarded (never stored).

## Tests
`src/lib/import/import.test.ts` (Vitest) covers normalize, streak continuity,
verify caps/clamps, validate row-skipping, PB→PR mapping, and the
never-worse-off / idempotent merge rules. Run `npm test`.

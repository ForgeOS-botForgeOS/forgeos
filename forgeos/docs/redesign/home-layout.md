# V2 Home — chosen layout (Phase 5)

## Decision: "A × C" — Focus hero + summary gauges + rails

After reviewing five rendered concepts, Peter chose the **A × C combination**
(2026-07-22). Home (in V2) is composed top-to-bottom as:

1. **Focus hero (A)** — one decisive "today's focus" block: the session heading
   + a big primary **Start** action. It owns "what to train", so C's training
   rail is dropped (no repetition).
2. **Summary gauges (C)** — three conic-ring gauges: **Energy · Protein · Steps**,
   each a live % with the value in the hole.
3. **Rails (C)** — horizontally-scrollable shelves:
   - **Recovery** — Readiness · Sleep · Resting HR
   - **Progress** — Volume (week) · Weight · PRs (all-time)

Secondary sections (tip, Wrapped teaser, weekly review, weigh-in, heatmap, rank)
continue to flow below, as in Legacy. Readiness / weekly-volume / health-glance
are surfaced in the gauges + rails for V2, so their standalone Legacy cards are
guarded `!v2` to avoid duplication.

### Rendered concepts (artifacts, private to Peter)
- Bento dashboard — https://claude.ai/code/artifact/adf10171-c219-4a18-acf6-a7eb7d902947
- A / B / C gallery — https://claude.ai/code/artifact/d9c15583-4983-4199-bfe6-584991fac854
- "The Ledger" (editorial, not chosen) — https://claude.ai/code/artifact/3c2a4783-bba7-4b88-96b4-9b209592a252
- **A × C (chosen)** — https://claude.ai/code/artifact/7a673a83-4213-4506-8d2e-b78641e4908c

### Data wiring (all existing stores — features untouched)
- Energy/Protein: today's nutrition totals vs `profile.macros`.
- Steps/Sleep/Resting HR: latest `healthStore` day (`sortedDays`).
- Readiness: `readinessFromDays` (`score` + `label`).
- Volume: this week's summed `workoutStore` history.
- Weight: latest `userStore.weighIns`. PRs: `gamificationStore.heavyLifts`.
- Focus: `history` "trained today?" + Start → `/train`.

Implemented mode-aware in `Home.tsx` (`HomeAC` + `Gauge`/`Rail`/`Chip`); the
Legacy Home renders byte-identically when not in `v2`. The earlier bento build
(`BentoTop`) is superseded by this.

## Where this sits in the phase plan
Phase 5 (screen recomposition) is **in progress** — Home is the first screen
locked to a final design. Remaining before Phase 7 (collapse to Legacy⟷V2 +
flip default + ship): recompose the other core screens (Train, Social, Nutrition,
Quests, Profile), then Phase 6 brand. Phase 7's default-flip is an
all-users change and needs Peter's explicit go-ahead.

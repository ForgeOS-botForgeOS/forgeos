# V2 "Tempo" — Token Reference (Phase 2)

> The foundational token layer for the chosen direction (Tempo — broadcast-sport
> telemetry). Scoped under `.ui-v2`; driven by the theme variables so every colour
> theme works. **The default look since 2026-09-27 (Phase 7 done):** Nova and Bolt are
> retired (a saved value of either is coerced to Tempo), and the picker is Tempo ⟷ Legacy.

## Colour — default theme re-authored (`forge-dark → tempo`)

| Token | Channels (RGB) | Hex | Role |
|---|---|---|---|
| `--bg` | `14 17 22` | `#0E1116` | App ground (Graphite) |
| `--surface` | `22 27 34` | `#161B22` | Panel |
| `--surface-2` | `30 37 48` | `#1E2530` | Raised panel |
| `--line` | `42 51 64` | `#2A3340` | Hairline / border |
| `--text` | `237 241 246` | `#EDF1F6` | Signal white |
| `--muted` | `138 151 166` | `#8A97A6` | Readout grey |
| `--accent` | `47 230 196` | `#2FE6C4` | Signal teal — live state & action |
| `--accent-2` | `255 90 60` | `#FF5A3C` | Heat — PRs / records only |

**Semantics:** the accent is reserved for *live state and action* (never decoration);
`--accent-2` (heat) appears only on PRs/records. `--success/--warn/--danger` inherit the
theme defaults for now.

**Other themes:** Phase 2 re-authors only the hero (`forge-dark`). The remaining ~18 themes
render in Tempo *form* using their own existing palettes; hero-theme palette re-authoring for
the rest is a bounded Phase-2/5 follow-up (see `inventory.md`).

## Typography

| Token | Value | Used for |
|---|---|---|
| `--v2-display` | `'Saira Condensed', 'Saira', system-ui` | Screen titles, headings, primary buttons (condensed, italic emphasis, uppercase) |
| `--v2-body` | `'Saira', system-ui` | Body, labels, inputs |
| (numerics) | `Saira` + `font-variant-numeric: tabular-nums`, weight 700 | Big readouts — **replaces** Legacy's JetBrains-Mono stat numbers (via `.ui-v2 .font-mono` retarget) |

Contrast strategy: one superfamily in multiple widths/weights (condensed display + normal
body), so the type is cohesive and unmistakably not Inter/Jakarta/Space Grotesk.

## Shape

| Token | Value | Used for |
|---|---|---|
| `--v2-r-card` | `8px` | Cards, sheet top corners |
| `--v2-r-control` | `6px` | Buttons, inputs |

Flat telemetry panels: thin `1px` hairline borders, **no shadow**, small radius. No glass,
no offset shadows, no gradient sheen.

## Motion

| Token | Value | Used for |
|---|---|---|
| `--v2-ease-sweep` | `cubic-bezier(0.22, 1, 0.36, 1)` | Sweeps, card/border transitions |
| `--v2-dur-fast` | `140ms` | Hover/press/focus |
| `--v2-dur` | `220ms` | Meter sweeps, entrances |
| `--v2-dur-enter` | `460ms` | A screen section wiping in |
| `--v2-stagger` | `45ms` | Gap between sections of one screen |

**Choreography (2026-09-27):** a screen fades in in 160ms and does not move; its direct
sections wipe in left→right (`clip-path` + 6px slide) one after another, and cards nested in
a section inherit its delay (`--v2-i`). The screen title's skewed signal bar sweeps out under
it. Primary buttons get a light band on hover/press; the meter has a bright leading "needle";
skeletons scan instead of pulse. All of it is off under `prefers-reduced-motion` and in the
bigger-controls mode (including the delays, which the global rule would otherwise leave).

Global `prefers-reduced-motion` (already app-wide) collapses these. Full meter-sweep and
count-up choreography lands with the primitives in Phase 4.

## Backdrop & chrome

- `#phone-root`: flat `--bg` + faint horizontal **scanlines** (`--text` @ 2%, 3px pitch) — a
  telemetry screen texture, no glow.
- `.fx-tabbar`: solid anchored strip, **signal top keyline** (`--accent` @ 50%), no blur.
- `.fx-sheet`: squared top, signal keyline, deep cast for separation.

## Surfaces covered in Phase 2

`#phone-root` · `.fx-card` (static + interactive) · `.fx-primary` · `.fx-tabbar` · `.fx-sheet`
· `.screen-head h1` / `h1` / `h2` · `input`/`textarea`/`select` · app font · stat numerals ·
`ForgeLogo` V2 mark (signal-teal tile, heat spark).

## Charts (2026-09-27)

`components/chartKit.tsx` hands every recharts chart its Tempo geometry and paint — a
gradient area under each trend line, signal bars that fade into the baseline, squared bar
tops, dashed horizontal baselines, a 900ms reveal. Type and chrome (ticks, the tooltip
readout panel, the hover cursor, the ringed active dot) are CSS under "Tempo charts". Every
kit helper returns the Legacy value untouched outside Tempo.

## Radius language

`rounded-2xl`/`-3xl` → 8px and `rounded-xl` → 6px under `.ui-v2`, so hand-built panels and
buttons match `<Card>`/`<Button>`; `rounded-full` (avatars, dots) is left alone.

## Deferred to later phases

- **Signature meter** (segmented meter + count-up replacing the `Ring`) → Phase 4 (component
  primitive; can't be pure CSS over an SVG ring).
- `Pill` / `Toggle` / `Badge` / `Stat` / chart theming refinements → Phase 4.
- Per-screen composition, empty/loading/error states → Phase 5.
- ~~Toggle collapse, retire classic/nova/bolt, flip default → Phase 7~~ — done 2026-09-27.

## Preview specimen

No synthetic specimen screen was added (it would require touching the frozen `App.tsx`
router). Instead V2 is **directly previewable**: Settings → App design → *V2 · Tempo* renders
the real app in Tempo, which is a truer specimen than a swatch page.

# V2 "Tempo" — Token Reference (Phase 2)

> The foundational token layer for the chosen direction (Tempo — broadcast-sport
> telemetry). Scoped under `.ui-v2`; driven by the theme variables so every colour
> theme works. Selectable now as **Settings → App design → V2 · Tempo (preview)**;
> becomes the Legacy⟷V2 default at QA sign-off (Phase 7).

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

## Deferred to later phases

- **Signature meter** (segmented meter + count-up replacing the `Ring`) → Phase 4 (component
  primitive; can't be pure CSS over an SVG ring).
- `Pill` / `Toggle` / `Badge` / `Stat` / chart theming refinements → Phase 4.
- Per-screen composition, empty/loading/error states → Phase 5.
- Toggle collapse to `legacy | v2`, retire classic/nova/bolt, flip default → Phase 7.

## Preview specimen

No synthetic specimen screen was added (it would require touching the frozen `App.tsx`
router). Instead V2 is **directly previewable**: Settings → App design → *V2 · Tempo* renders
the real app in Tempo, which is a truer specimen than a swatch page.

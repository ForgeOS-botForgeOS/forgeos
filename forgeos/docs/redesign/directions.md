# V2 Redesign — Phase 1: Three Design Directions

> Three genuinely distinct directions for the from-scratch V2 skin. Each derives from the
> app's subject matter (effort, load, tempo, recovery, accumulation), commits its boldness
> in one place, and avoids every entry in `anti-patterns.md` (Legacy DNA, Bolt/Nova tells,
> the generic-AI rejects). Palettes below re-author the **default `forge-dark`** theme; the
> other themes get the same treatment in Phase 2. **Pick one — no implementation until then.**

---

## Direction A — "TEMPO" (broadcast-sport telemetry)

**Manifesto.** Your training, rendered like a live sports broadcast. Data is the interface:
every screen reads like a race telemetry overlay — sweeping meters, tabular readouts that
tick up, a persistent "tempo line". It's fast, precise, a little bit adrenaline. It fits a
training app because a workout *is* telemetry: load, pace, volume, accumulation — shown as
signal, not decoration. The boldness lives in the **data layer and motion**; the chrome
disappears.

**Palette (forge-dark → tempo)**
| Role | Hex | Name |
|---|---|---|
| `--bg` | `#0E1116` | Graphite |
| `--surface` | `#161B22` | Slate panel |
| `--surface-2` | `#1E2530` | Raised |
| `--line` | `#2A3340` | Hairline |
| `--text` | `#EDF1F6` | Signal white |
| `--muted` | `#8A97A6` | Readout grey |
| `--accent` | `#2FE6C4` | Signal teal (live state / action) |
| `--accent-2` | `#FF5A3C` | Heat (PRs / records only) |

**Type.** The **Saira** superfamily — one family, multiple widths: **Saira Condensed** (700,
italic for emphasis) as the broadcast display face; **Saira** (400/500) for body; **Saira**
heavy with tabular figures for the big readouts. Sporty, condensed, cohesive — nothing like
Inter/Jakarta/Space Grotesk.

**Layout.** A top **status strip** of live readouts; the calorie/target as a **horizontal
segmented meter** (not the legacy ring); macros as three thin sweeping bars; volume as a
"tempo line" sparkline with a delta. Tabular numerals everywhere.

```
┌─────────────────────────────┐
│ MON 07:14        ◦ LIVE  🔥12│  status strip (blinking LIVE dot)
│ TODAY / PUSH                 │  condensed italic label
│ ENERGY        1 840 / 2 400  │  big tabular readout
│ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░  76%       │  segmented meter (sweeps in)
│ P ▓▓▓▓▓░128  C ▓▓▓░190  F ▓… │  three thin macro bars
├─────────────────────────────┤
│ VOLUME  ╱╲   ╱╲__╱    +8%    │  tempo-line sparkline
│ 24 350 kg this week          │
├─────────────────────────────┤
│ ▸ START WORKOUT     (signal) │  signal-filled bar + chevron
└─────────────────────────────┘
```

**Signature element.** The **segmented live meter + count-up readout** that replaces the ring
everywhere a value has a target — paired with a thin sweeping "tempo line" motif.

**Honest risk.** Telemetry can read cold / techy-masculine, and "fitness = data HUD" is a
somewhat expected move — it must earn its voice through the broadcast-*graphics* character
(condensed italics, chevrons, sweep motion), or it collapses into a generic dark dashboard.

---

## Direction B — "STUDIO" (cool luxury editorial)

**Manifesto.** Your training as a beautifully typeset journal. Quiet, confident, spacious —
the opposite of a loud gym app. Your key number each day is set like a **magazine cover
headline**; everything else recedes into generous whitespace and calm labels. Colour is
almost absent, so the one accent means something. It fits training as **reflection and
accumulation over time** — recovery, streaks, the long arc — rendered with restraint and
premium polish. Boldness lives in **typography and whitespace**.

**Palette (forge-dark → studio)**
| Role | Hex | Name |
|---|---|---|
| `--bg` | `#12131A` | Ink (cool near-black) |
| `--surface` | `#1B1D26` | Paper-dark |
| `--surface-2` | `#242732` | Raised |
| `--line` | `#33374A` | Rule |
| `--text` | `#F4F5F7` | Off-white |
| `--muted` | `#9A9EAD` | Caption grey |
| `--accent` | `#A9C7FF` | Ice periwinkle (action / state, used sparingly) |
| `--accent-2` | `#F2C078` | Soft gold (achievements only) |

**Type.** A contrast-axis pairing: **Fraunces** (a characterful high-contrast serif) for
the giant display numerals and headers, against **Hanken Grotesk** for body. Big serif
numbers-as-headlines is the bet — cool and editorial, never earthy/coastal (explicitly *not*
the cream+serif+terracotta cliché).

**Layout.** Minimal chrome, content edge-to-edge, framing by space not boxes. One oversized
display numeral is the hero; macros and totals are type-led rows; a single hairline gives
breathing room; the action is a restrained text link with the accent.

```
┌─────────────────────────────┐
│ Tuesday, 22 July            │  quiet label
│                             │
│   1,840                     │  giant serif numeral (Fraunces)
│   kcal today · 560 to go    │  quiet caption
│   ───────────────────       │  one hairline of breathing room
│   Protein   128 g           │  editorial type-led rows
│   Carbs     190 g           │
│   Fat        52 g           │
│                             │
│   This week  24,350 kg  ↑   │
│              Begin  →       │  restrained accent action
└─────────────────────────────┘
```

**Signature element.** The **oversized editorial display numeral** — your most important
metric on each screen printed like a cover number, quiet caption beneath.

**Honest risk.** Calm/editorial can feel low-energy for a workout app — the wrong mood for a
user hyped mid-session. It wins on premium feel but bets against "make me feel pumped."

---

## Direction C — "PULSE" (playful-premium, tactile)

**Manifesto.** Progress that feels *good in the hand*. Chunky, confident, springy — the
energy of the best consumer apps (the fun-but-premium end), where every completion is a
little reward of light and motion, and every surface feels physically pressable. It fits
training as **habit, momentum, and reward** — the dopamine of showing up. Boldness lives in
**motion and tactility**: real soft-shadow depth, spring physics, satisfying press states,
celebratory bursts. Gamification is expressed as light and motion, not badges and ribbons.

**Palette (forge-dark → pulse)**
| Role | Hex | Name |
|---|---|---|
| `--bg` | `#0F0E13` | Near-black |
| `--surface` | `#191921` | Card (noticeably lifted from bg) |
| `--surface-2` | `#232330` | Raised |
| `--line` | `#302F3D` | Edge |
| `--text` | `#F6F4FA` | Bright ink |
| `--muted` | `#9C98A8` | Muted |
| `--accent` | `#FF4D5E` | Punch coral (action / live) |
| `--accent-2` | `#FFC24B` | Reward gold (coins / bursts) |

**Type.** **Bricolage Grotesque** (expressive, characterful) for display + big rounded bold
numerals, with **Figtree** (friendly humanist) for body. Confident and warm without being
childish; explicitly not the rounded-geometric Jakarta of Nova.

**Layout.** A larger bg↔surface contrast so cards feel card-*forward*; soft real shadows for
depth (not glass, not brutalist offset); a big friendly progress element; a vivid accent CTA
that springs on press; a reward chip that bursts light on completion.

```
┌─────────────────────────────┐
│  Hey Peter 👋      streak 12 │
│ ╭───────────────────────────╮│
│ │     ◜◝ 1,840 / 2,400      ││  chunky elevated card, soft shadow
│ │   (  ●  )  76% today       ││  big rounded progress
│ ╰───────────────────────────╯│
│ ╭──────╮ ╭──────╮ ╭──────╮  │
│ │P 128g│ │C 190g│ │F 52g │  │  bouncy stat tiles (spring on tap)
│ ╰──────╯ ╰──────╯ ╰──────╯  │
│ ╭───────────────────────────╮│
│ │  ▶  Start workout  (coral)││  vivid CTA, press = spring
│ ╰───────────────────────────╯│
│   🪙 +40 today · tap to open │  reward chip, light burst
└─────────────────────────────┘
```

**Signature element.** The **reward moment** — completions trigger a spring + light burst,
and every surface has a tactile press-depth. The app *feels* good to touch.

**Honest risk.** Playful can undercut credibility with serious lifters and tip into
"childish" if the motion isn't disciplined — the boldness must stay in *one* place (the
reward moment), or it reads as a toy.

---

## Self-critique — "would I have made this for any fitness app?"

- **Tempo:** partially yes — "fitness = data" is a reflex. Kept, but only because the specific
  *broadcast-graphics* voice (condensed italics, sweep, chevrons, meters-not-rings) is a
  committed identity, not the default dark dashboard. Risk noted above; watch for it in Phase 2.
- **Studio:** no — a calm cool-editorial *luxury* register is unexpected for a gym app (most
  shout). Distinct from Legacy/Bolt/Nova and from the cream-serif cliché. Passes.
- **Pulse:** the playful-premium lane is common for *habit* apps, but for a serious *lifting*
  app it's a real bet, and the "soft real depth + one reward moment" commitment is a specific
  voice rather than a generic bounce-everything. Passes with the discipline caveat.

## Recommendation

If you want **maximum "nothing like the current app" + energy that suits lifting**, I lean
**Tempo**. If you want **premium and calm that ages well**, **Studio**. If you want
**fun/rewarding that pulls you back daily**, **Pulse**. All three are fully buildable on the
existing plumbing across every theme.

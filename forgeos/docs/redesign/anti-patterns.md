# V2 Redesign — Anti-Patterns (Phase 0)

> An explicit catalogue of what the **current (Legacy)** design does, plus the generic-AI
> defaults to avoid. **If a V2 decision appears on this list, it's wrong** — V2 must be
> describable without referring to Legacy. Every V2 screen must stand on its own; "like
> Legacy but different colours" fails the brief.

## A. Legacy visual DNA — V2 must NOT echo these

**Typography**
- Body/UI in **Inter**; stat numbers in **JetBrains Mono** (`font-mono`).
- Headings: `font-extrabold` + `tracking-tight`; screen `h1` = `text-2xl`.
- Section titles: **small uppercase, wide-tracked, muted** (`SectionTitle`).
- → V2 uses a **different family stack and a different hierarchy engine** (not Inter, not "extrabold tight heading + tiny uppercase eyebrow label"). Numeric face must not be JetBrains Mono.

**Shape & radii**
- Cards `rounded-2xl` (16px); buttons `rounded-xl` (12px); pills/toggles/badges `rounded-full`; sheets `rounded-t-2xl`.
- → V2 commits to its **own radius language** (whatever it is, it is not this mixed 16/12/full set).

**Surfaces & elevation**
- Cards = `bg-surface` + **1px `border-line`** + `p-4`, near-flat, framing by thin border.
- Ghost = `bg-surface-2`; outline = `border-line`.
- Depth is minimal — borders + `backdrop-blur` on the sheet scrim and tab bar. No real elevation system.
- → V2 uses a **deliberate elevation/contrast strategy** that is not "thin border around a slightly-lighter box."

**Colour usage**
- Single **accent** per theme drives buttons (`bg-accent text-black`), active nav, rings, badges — accent is used broadly, semi-decoratively.
- → V2 keeps a **deep neutral ground + one decisive accent reserved for state/action**, not sprinkled as decoration.

**Navigation**
- Fixed **bottom 6-tab bar**, `backdrop-blur`, `bg-surface/90`, a **top 0.5px accent indicator** that springs between tabs (`layoutId`), active icon **spring-scales 1.12** + strokeWidth bump, **10px labels**.
- → IA stays (scope = visual only), but V2's tab-bar **form** must not be "blurred translucent bar + top sliding accent line + scaling icon + tiny label." Re-express the same destinations with a different visual mechanic.

**Motion**
- Screen enter: `opacity 0→1 + translateY 10→0`, `0.28s`, ease `[0.16, 1, 0.3, 1]`.
- `animate-fade-in-up` on cards; spring `layoutId` indicators; `celebrate()` confetti; Framer Motion throughout.
- → V2 authors its **own motion tokens** (curves/durations/choreography). Not the same 0.28s expo fade-up on every screen and every card (the uniform-entrance reflex).

**Signature primitives**
- Calorie **Ring** (SVG progress ring, `-rotate-90`); **Stat** = big mono number + tiny muted label; **RestTimer** depleting ring; **SetRow** completion burst.
- → V2 may show the *same data*, but its hero data treatment must not be "SVG ring + big mono number + tiny label."

## B. Do NOT reskin Bolt or Nova either

Bolt and Nova are being retired into V2. V2 is a **fresh Phase-1 direction**, not "Bolt again" or "Nova again." It may deliberately *absorb a proven mechanic* (e.g. an anchored nav, a press interaction) only if it's re-derived to fit V2's own language — never copied. If V2 reads as a recolour of Bolt or Nova, redo it.

- **Nova tells to avoid repeating:** Plus Jakarta Sans; vivid gradient atmospheres; glassy floating pill nav; gradient pill buttons + heat glow; gradient logo.
- **Bolt tells to avoid repeating:** Space Grotesk; keyline-grid backdrop; hard accent offset shadows / press-to-flush; anchored bordered bar + block-underline tab; uppercase display headers; sharp ink logo tile.

## C. Generic-AI defaults — automatic rejections (from the brief)

1. Cream/off-white background + high-contrast serif + terracotta accent.
2. Near-black background + one acid-green or vermilion accent.
3. Newspaper/broadsheet layout with hairline rules and zero radius.
4. Purple→blue gradients on cards, glassmorphism as a crutch, neon glow on everything.
5. `01 / 02 / 03` numbered markers where the content isn't actually a sequence.
6. Tiny uppercase tracked eyebrow above every section (Legacy already does this — see A).
7. Side-stripe accent borders (`border-left` as decoration); gradient text (`background-clip:text`); identical icon-heading-text card grids; the hero-metric SaaS template.

## D. Hard rules

- **No hardcoded colours/sizes/durations in V2 CSS** — theme vars + V2 tokens only.
- **Legacy files stay untouched.** If a Legacy file must change (e.g. to read the toggle), ask first and explain why.
- **No visual leakage:** a V2 rule must never affect Legacy, and vice-versa. Scope everything under `.ui-v2`.
- **Quality floor, unannounced:** contrast met, reduced-motion respected, keyboard/screen-reader reachable, small screens safe.

## E. The test for every V2 surface

1. Can I describe it **without** referencing Legacy, Bolt, or Nova? If not → reskin, redo.
2. Would I have produced this exact treatment for *any* fitness app? If yes → too generic, redo.
3. Does the boldness live in **one** decisive place, with discipline around it? If it's loud everywhere → redo.

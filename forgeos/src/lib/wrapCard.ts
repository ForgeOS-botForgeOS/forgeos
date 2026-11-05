import type { WorkoutWrap } from './workoutWrap';
import type { Recap, RecapSection } from './wrapRecap';

// The Wrap's recap page as a 1080x1920 story image, in the archetype's own
// colours (the monthly card uses the theme instead). It draws the same Recap
// the page shows, so the picture a friend gets matches the screen. Pure
// canvas, nothing leaves the phone.

const W = 1080;
const H = 1920;
const PAD = 64;
const GAP = 24;
// The card uses whatever typeface the current design mode shows on screen.
let SANS = 'Inter, sans-serif';
let MONO = 'ui-monospace, monospace';
const SECTIONS_TOP_MIN = 960;
const SECTIONS_BOTTOM = 1780;

type Ctx = CanvasRenderingContext2D;
interface Block { h: number; draw: (ctx: Ctx, x: number, y: number, w: number) => void }

export function generateWrapCard(wrap: WorkoutWrap, recap: Recap): string {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const base = canvas.getContext('2d');
  // Content is drawn on its own layer first so a short card (a run, a watch
  // session) can be centred instead of leaving the bottom half empty.
  const layer = document.createElement('canvas');
  layer.width = W;
  layer.height = H;
  const ctx = layer.getContext('2d');
  if (!base || !ctx) return '';
  readPageFonts();
  paintBackground(base, wrap);

  let y = drawHeader(ctx, recap);
  y = drawBig(ctx, recap, y + 36);
  if (recap.stats.length) y = drawStats(ctx, recap, y + GAP);

  const rows = layoutRows(recap.sections, SECTIONS_BOTTOM - Math.max(y + GAP, SECTIONS_TOP_MIN));
  let sy = Math.max(y + GAP, SECTIONS_TOP_MIN);
  for (const row of rows) {
    const colW = (W - PAD * 2 - GAP * (row.length - 1)) / row.length;
    const h = Math.max(...row.map((b) => b.h));
    row.forEach((b, i) => {
      const x = PAD + i * (colW + GAP);
      tile(ctx, x, sy, colW, h);
      b.draw(ctx, x, sy, colW);
    });
    sy += h + GAP;
  }
  const bottom = rows.length ? sy - GAP : y;
  const slack = SECTIONS_BOTTOM - bottom;
  base.drawImage(layer, 0, slack > 0 ? Math.round(slack / 2) : 0);

  base.textAlign = 'center';
  base.fillStyle = 'rgba(255,255,255,0.6)';
  base.font = `600 32px ${SANS}`;
  base.fillText(recap.footer, W / 2, H - 64);
  return canvas.toDataURL('image/png');
}

function readPageFonts() {
  try {
    SANS = getComputedStyle(document.body).fontFamily || SANS;
    const probe = document.createElement('span');
    probe.className = 'font-mono';
    document.body.appendChild(probe);
    MONO = getComputedStyle(probe).fontFamily || MONO;
    probe.remove();
  } catch { /* keep the defaults */ }
}

function paintBackground(ctx: Ctx, wrap: WorkoutWrap) {
  const bg = ctx.createLinearGradient(0, 0, W * 0.4, H);
  bg.addColorStop(0, wrap.palette.from);
  bg.addColorStop(0.55, wrap.palette.via);
  bg.addColorStop(1, wrap.palette.to);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  // Two soft light blobs, placed by the seed so every card is a little different.
  const blob = (x: number, y: number, r: number, a: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  const s = wrap.workoutId.length + wrap.variant * 97;
  blob(200 + (s * 37) % 680, 240 + (s * 53) % 260, 520, 0.22);
  blob(300 + (s * 71) % 500, 1300 + (s * 29) % 300, 600, 0.1);
}

function drawHeader(ctx: Ctx, r: Recap): number {
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `800 30px ${SANS}`;
  ctx.fillText(spaced(`FORGEOS · ${r.kicker}`.toUpperCase()), W / 2, 104);
  ctx.font = '100px serif';
  ctx.fillText(r.emoji, W / 2, 222);
  ctx.fillStyle = '#fff';
  ctx.font = `900 92px ${SANS}`;
  let y = wrapText(ctx, r.title.toUpperCase(), W / 2, 334, W - PAD * 2, 96, 2);
  ctx.font = `800 46px ${SANS}`;
  y = wrapText(ctx, r.name, W / 2, y + 8, W - PAD * 2, 54, 1);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `500 34px ${SANS}`;
  y = wrapText(ctx, r.line, W / 2, y + 4, W - PAD * 3, 44, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = `600 28px ${SANS}`;
  return wrapText(ctx, r.meta, W / 2, y + 4, W - PAD * 2, 36, 1);
}

function drawBig(ctx: Ctx, r: Recap, top: number): number {
  const h = r.big.caption ? 250 : 206;
  tile(ctx, PAD, top, W - PAD * 2, h, 0.16);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = `900 ${fit(ctx, r.big.value, 124, W - PAD * 4, MONO, 900)}px ${MONO}`;
  ctx.fillText(r.big.value, W / 2, top + 124);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = `800 30px ${SANS}`;
  ctx.fillText(spaced(r.big.unit.toUpperCase()), W / 2, top + 176);
  if (r.big.caption) {
    ctx.fillStyle = '#fff';
    ctx.font = `600 32px ${SANS}`;
    ctx.fillText(r.big.caption, W / 2, top + 222);
  }
  return top + h;
}

function drawStats(ctx: Ctx, r: Recap, top: number): number {
  const n = r.stats.length;
  const colW = (W - PAD * 2 - GAP * (n - 1)) / n;
  const h = 124;
  r.stats.forEach((s, i) => {
    const x = PAD + i * (colW + GAP);
    tile(ctx, x, top, colW, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = `800 ${fit(ctx, s.value, 62, colW - 24, MONO, 800)}px ${MONO}`;
    ctx.fillText(s.value, x + colW / 2, top + 68);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `700 24px ${SANS}`;
    ctx.fillText(s.label.toUpperCase(), x + colW / 2, top + 102);
  });
  return top + h;
}

// Half-width tiles pair up side by side; lists take the full width. If the
// card would overflow, the last rows are dropped rather than squeezed unreadable.
function layoutRows(sections: RecapSection[], budget: number): Block[][] {
  const half: Block[] = [];
  const full: Block[] = [];
  for (const s of sections) (isHalf(s) ? half : full).push(block(s));
  const rows: Block[][] = [];
  for (let i = 0; i < half.length; i += 2) rows.push(half.slice(i, i + 2));
  for (const b of full) rows.push([b]);
  const kept: Block[][] = [];
  let used = 0;
  for (const row of rows) {
    const h = Math.max(...row.map((b) => b.h)) + GAP;
    if (used + h > budget + GAP) break;
    used += h;
    kept.push(row);
  }
  return kept;
}

const isHalf = (s: RecapSection) => s.kind === 'top' || s.kind === 'versus' || s.kind === 'comeback' || s.kind === 'cardio';

function block(s: RecapSection): Block {
  const label = (ctx: Ctx, x: number, y: number, w: number) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `800 22px ${SANS}`;
    ellipsis(ctx, spaced(s.label.toUpperCase()), x + 28, y + 46, w - 56);
  };
  switch (s.kind) {
    case 'comeback':
    case 'cardio':
      return {
        h: 160,
        draw(ctx, x, y, w) {
          label(ctx, x, y, w);
          ctx.fillStyle = '#fff';
          ctx.font = `800 40px ${SANS}`;
          wrapText(ctx, s.value, x + 28, y + 104, w - 56, 48, 2, 'left');
        },
      };
    case 'top':
      return {
        h: 210,
        draw(ctx, x, y, w) {
          label(ctx, x, y, w);
          ctx.textAlign = 'left';
          ctx.fillStyle = '#fff';
          ctx.font = `700 30px ${SANS}`;
          ellipsis(ctx, s.exercise, x + 28, y + 90, w - 56);
          ctx.font = `900 ${fit(ctx, s.value, 54, w - 56, MONO, 900)}px ${MONO}`;
          ctx.fillText(s.value, x + 28, y + 150);
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.font = `500 22px ${SANS}`;
          ellipsis(ctx, s.detail, x + 28, y + 186, w - 56);
        },
      };
    case 'versus':
      return {
        h: 210,
        draw(ctx, x, y, w) {
          label(ctx, x, y, w);
          ctx.textAlign = 'left';
          ctx.fillStyle = '#fff';
          ctx.font = `900 64px ${MONO}`;
          ctx.fillText(s.value, x + 28, y + 128);
          ctx.fillStyle = 'rgba(255,255,255,0.75)';
          ctx.font = `500 22px ${SANS}`;
          ellipsis(ctx, s.line, x + 28, y + 182, w - 56);
          const max = Math.max(...s.history, 1);
          const bw = 18;
          s.history.forEach((v, i) => {
            const bh = Math.max(6, (v / max) * 80);
            const bx = x + w - 28 - (s.history.length - i) * (bw + 8);
            ctx.fillStyle = i === s.history.length - 1 ? '#fff' : 'rgba(255,255,255,0.35)';
            roundRect(ctx, bx, y + 140 - bh, bw, bh, 6);
          });
        },
      };
    case 'prs':
      return {
        h: 76 + s.items.length * 50 + (s.more ? 34 : 0),
        draw(ctx, x, y, w) {
          label(ctx, x, y, w);
          s.items.forEach((p, i) => {
            const ly = y + 100 + i * 50;
            ctx.textAlign = 'left';
            ctx.fillStyle = '#fff';
            ctx.font = `700 32px ${SANS}`;
            ellipsis(ctx, `🏆 ${p.name}`, x + 28, ly, w - 360);
            ctx.textAlign = 'right';
            ctx.font = `900 34px ${MONO}`;
            ctx.fillText(p.value, x + w - 28, ly);
          });
          if (s.more) {
            ctx.textAlign = 'left';
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = `600 24px ${SANS}`;
            ctx.fillText(`+${s.more}`, x + 28, y + 100 + s.items.length * 50);
          }
        },
      };
    case 'muscles':
      return {
        h: 72 + s.bars.length * 48,
        draw(ctx, x, y, w) {
          label(ctx, x, y, w);
          s.bars.forEach((m, i) => {
            const ly = y + 92 + i * 48;
            ctx.textAlign = 'left';
            ctx.fillStyle = '#fff';
            ctx.font = `700 26px ${SANS}`;
            ctx.fillText(m.name, x + 28, ly + 8);
            ctx.textAlign = 'right';
            ctx.font = `700 24px ${MONO}`;
            ctx.fillText(`${m.pct}%`, x + w - 28, ly + 8);
            const bx = x + 260;
            const bw = w - 260 - 130;
            ctx.fillStyle = 'rgba(255,255,255,0.18)';
            roundRect(ctx, bx, ly - 10, bw, 18, 9);
            ctx.fillStyle = '#fff';
            roundRect(ctx, bx, ly - 10, Math.max(18, (bw * m.pct) / 100), 18, 9);
          });
        },
      };
  }
}

function tile(ctx: Ctx, x: number, y: number, w: number, h: number, a = 0.12) {
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  roundRect(ctx, x, y, w, h, 36);
}

function roundRect(ctx: Ctx, x: number, y: number, rw: number, rh: number, r: number) {
  const rr = Math.min(r, rw / 2, rh / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + rw, y, x + rw, y + rh, rr);
  ctx.arcTo(x + rw, y + rh, x, y + rh, rr);
  ctx.arcTo(x, y + rh, x, y, rr);
  ctx.arcTo(x, y, x + rw, y, rr);
  ctx.closePath();
  ctx.fill();
}

const spaced = (s: string) => s.split('').join(' ');

/** Largest font size (down to 60% of `size`) at which `str` fits in `maxW`. */
function fit(ctx: Ctx, str: string, size: number, maxW: number, family: string, weight: number): number {
  let px = size;
  ctx.font = `${weight} ${px}px ${family}`;
  while (px > size * 0.6 && ctx.measureText(str).width > maxW) {
    px -= 4;
    ctx.font = `${weight} ${px}px ${family}`;
  }
  return px;
}

function ellipsis(ctx: Ctx, str: string, x: number, y: number, maxW: number) {
  let s = str;
  if (ctx.measureText(s).width > maxW) {
    while (s.length > 1 && ctx.measureText(`${s}…`).width > maxW) s = s.slice(0, -1);
    s = `${s.trimEnd()}…`;
  }
  ctx.fillText(s, x, y);
}

/** Draws up to `maxLines` lines from baseline `y`; returns the baseline after the last one. */
function wrapText(ctx: Ctx, str: string, x: number, y: number, maxW: number, lineH: number, maxLines: number, align: CanvasTextAlign = 'center'): number {
  ctx.textAlign = align;
  const words = str.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(next).width > maxW && cur) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  const shown = lines.slice(0, maxLines);
  shown.forEach((l, i) => {
    if (i === maxLines - 1 && lines.length > maxLines) ellipsis(ctx, `${l} ${lines.slice(maxLines).join(' ')}`, x, y + i * lineH, maxW);
    else ctx.fillText(l, x, y + i * lineH);
  });
  return y + (shown.length - 1) * lineH + lineH;
}

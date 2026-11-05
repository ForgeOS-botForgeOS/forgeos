import type { WorkoutWrap } from './workoutWrap';

// The Wrap as a 1080x1920 story image, in the archetype's own colours (the
// monthly card uses the theme instead). Pure canvas, nothing leaves the phone.
export interface WrapCardText {
  title: string;
  line: string;
  workoutName: string;
  dateLabel: string;
  bigValue: string;
  bigLabel: string;
  stats: [string, string][]; // value, label; up to 4
  footer: string;
}

export function generateWrapCard(wrap: WorkoutWrap, emoji: string, text: WrapCardText): string {
  const w = 1080;
  const h = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const bg = ctx.createLinearGradient(0, 0, w * 0.4, h);
  bg.addColorStop(0, wrap.palette.from);
  bg.addColorStop(0.55, wrap.palette.via);
  bg.addColorStop(1, wrap.palette.to);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Two soft light blobs, placed by the seed so every card is a little different.
  const blob = (x: number, y: number, r: number, a: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  };
  const s = wrap.workoutId.length + wrap.variant * 97;
  blob(200 + (s * 37) % 680, 300 + (s * 53) % 300, 520, 0.22);
  blob(300 + (s * 71) % 500, 1300 + (s * 29) % 300, 600, 0.12);

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '800 40px Inter, sans-serif';
  ctx.fillText('FORGEOS · WRAP', w / 2, 150);

  ctx.font = '200px serif';
  ctx.fillText(emoji, w / 2, 430);

  ctx.fillStyle = '#fff';
  ctx.font = '900 112px Inter, sans-serif';
  wrapText(ctx, text.title.toUpperCase(), w / 2, 610, w - 140, 118);

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '600 46px Inter, sans-serif';
  wrapText(ctx, text.line, w / 2, 790, w - 200, 58);

  ctx.fillStyle = '#fff';
  ctx.font = '900 200px JetBrains Mono, monospace';
  ctx.fillText(text.bigValue, w / 2, 1150);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '700 44px Inter, sans-serif';
  ctx.fillText(text.bigLabel.toUpperCase(), w / 2, 1225);

  const stats = text.stats.slice(0, 4);
  const colW = (w - 120) / Math.max(1, stats.length);
  stats.forEach(([v, l], i) => {
    const x = 60 + colW * i + colW / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundRect(ctx, x - colW / 2 + 12, 1330, colW - 24, 220, 36);
    ctx.fillStyle = '#fff';
    ctx.font = '800 76px JetBrains Mono, monospace';
    ctx.fillText(v, x, 1450);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '600 34px Inter, sans-serif';
    ctx.fillText(l.toUpperCase(), x, 1505);
  });

  ctx.fillStyle = '#fff';
  ctx.font = '800 52px Inter, sans-serif';
  ctx.fillText(text.workoutName, w / 2, 1680);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '500 38px Inter, sans-serif';
  ctx.fillText(text.dateLabel, w / 2, 1740);
  ctx.fillText(text.footer, w / 2, h - 70);

  return canvas.toDataURL('image/png');
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, rw: number, rh: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + rw, y, x + rw, y + rh, r);
  ctx.arcTo(x + rw, y + rh, x, y + rh, r);
  ctx.arcTo(x, y + rh, x, y, r);
  ctx.arcTo(x, y, x + rw, y, r);
  ctx.closePath();
  ctx.fill();
}

function wrapText(ctx: CanvasRenderingContext2D, str: string, x: number, y: number, maxW: number, lineH: number) {
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
  lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, x, y + i * lineH));
}

// Render a workout summary share card to a canvas (Instagram Stories ratio)
// and trigger a download. Pure canvas — no external services.
export interface ShareCardData {
  name: string;
  rank: string;
  volumeKg: number;
  sets: number;
  durationMin: number;
  prText?: string;
}

export function generateShareCard(d: ShareCardData): string {
  const w = 1080;
  const h = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // read live theme tokens so the card matches the app
  const css = getComputedStyle(document.documentElement);
  const rgb = (v: string) => `rgb(${css.getPropertyValue(v).trim() || '255 92 53'})`;
  const bg = rgb('--bg');
  const accent = rgb('--accent');
  const text = rgb('--text');
  const muted = rgb('--muted');

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // accent glow
  const grad = ctx.createRadialGradient(w / 2, h * 0.28, 50, w / 2, h * 0.28, 700);
  grad.addColorStop(0, accent.replace('rgb', 'rgba').replace(')', ', 0.25)'));
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = '900 64px Inter, sans-serif';
  ctx.fillText('FORGEOS', w / 2, 220);

  ctx.fillStyle = text;
  ctx.font = '800 96px Inter, sans-serif';
  ctx.fillText(d.name, w / 2, 360);
  ctx.fillStyle = muted;
  ctx.font = '600 48px Inter, sans-serif';
  ctx.fillText(d.rank, w / 2, 440);

  const stats: [string, string][] = [
    [`${d.volumeKg.toLocaleString()} kg`, 'total volume'],
    [`${d.sets}`, 'working sets'],
    [`${d.durationMin} min`, 'duration'],
  ];
  let y = 760;
  for (const [v, l] of stats) {
    ctx.fillStyle = text;
    ctx.font = '800 120px JetBrains Mono, monospace';
    ctx.fillText(v, w / 2, y);
    ctx.fillStyle = muted;
    ctx.font = '500 44px Inter, sans-serif';
    ctx.fillText(l.toUpperCase(), w / 2, y + 70);
    y += 280;
  }

  if (d.prText) {
    ctx.fillStyle = accent;
    ctx.font = '800 64px Inter, sans-serif';
    ctx.fillText('🏆 ' + d.prText, w / 2, y + 40);
  }

  ctx.fillStyle = muted;
  ctx.font = '500 40px Inter, sans-serif';
  ctx.fillText('forged with ForgeOS', w / 2, h - 120);

  return canvas.toDataURL('image/png');
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

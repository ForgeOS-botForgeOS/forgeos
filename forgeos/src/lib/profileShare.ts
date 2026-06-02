// Shareable public profile: encode a read-only snapshot into a link, and render
// a profile card to canvas. Toggleable on/off in settings.
export interface PublicProfile {
  name: string;
  rank: string;
  xp: number;
  streak: number;
  sessions: number;
  achievements: number;
  title?: string;
  bestLifts: { name: string; e1rm: number }[];
}

export function encodeProfile(p: PublicProfile): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(p)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeProfile(code: string): PublicProfile | null {
  try {
    const json = decodeURIComponent(escape(atob(code.replace(/-/g, '+').replace(/_/g, '/'))));
    const p = JSON.parse(json) as PublicProfile;
    return p && p.name ? p : null;
  } catch {
    return null;
  }
}

export function profileUrl(p: PublicProfile): string {
  return `${window.location.href.split('#')[0]}#/u?d=${encodeProfile(p)}`;
}

export async function shareProfile(p: PublicProfile): Promise<'shared' | 'copied'> {
  const url = profileUrl(p);
  const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string; url?: string }) => Promise<void> };
  if (nav.share) {
    try {
      await nav.share({ title: `${p.name} on ForgeOS`, text: `${p.rank} · ${p.xp.toLocaleString()} XP · ${p.streak}-day streak 💪`, url });
      return 'shared';
    } catch {
      /* cancelled */
    }
  }
  await navigator.clipboard.writeText(url);
  return 'copied';
}

export function generateProfileCard(p: PublicProfile): string {
  const w = 1080;
  const h = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const css = getComputedStyle(document.documentElement);
  const rgb = (v: string) => `rgb(${css.getPropertyValue(v).trim() || '255 92 53'})`;
  const accent = rgb('--accent');
  const text = rgb('--text');
  const muted = rgb('--muted');

  ctx.fillStyle = rgb('--bg');
  ctx.fillRect(0, 0, w, h);
  const grad = ctx.createRadialGradient(w / 2, h * 0.26, 50, w / 2, h * 0.26, 760);
  grad.addColorStop(0, accent.replace('rgb', 'rgba').replace(')', ', 0.28)'));
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = '900 60px Inter, sans-serif';
  ctx.fillText('FORGEOS', w / 2, 180);

  ctx.fillStyle = text;
  ctx.font = '800 104px Inter, sans-serif';
  ctx.fillText(p.name, w / 2, 330);
  ctx.fillStyle = accent;
  ctx.font = '700 52px Inter, sans-serif';
  ctx.fillText(p.rank + (p.title ? ` · ${p.title}` : ''), w / 2, 410);

  const stats: [string, string][] = [
    [p.xp.toLocaleString(), 'XP'],
    [`${p.streak}`, 'DAY STREAK'],
    [`${p.sessions}`, 'SESSIONS'],
    [`${p.achievements}`, 'ACHIEVEMENTS'],
  ];
  let y = 600;
  for (const [v, l] of stats) {
    ctx.fillStyle = text;
    ctx.font = '800 96px JetBrains Mono, monospace';
    ctx.fillText(v, w / 2, y);
    ctx.fillStyle = muted;
    ctx.font = '500 40px Inter, sans-serif';
    ctx.fillText(l, w / 2, y + 56);
    y += 230;
  }

  if (p.bestLifts.length) {
    ctx.fillStyle = accent;
    ctx.font = '700 46px Inter, sans-serif';
    ctx.fillText('TOP LIFTS', w / 2, y + 20);
    y += 90;
    ctx.fillStyle = text;
    ctx.font = '600 50px Inter, sans-serif';
    for (const lift of p.bestLifts.slice(0, 3)) {
      ctx.fillText(`${lift.name} — ${lift.e1rm} kg`, w / 2, y);
      y += 72;
    }
  }

  ctx.fillStyle = muted;
  ctx.font = '500 38px Inter, sans-serif';
  ctx.fillText('forged with ForgeOS', w / 2, h - 110);
  return canvas.toDataURL('image/png');
}

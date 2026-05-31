import type { WeekPlan } from '../types';

// Encode a week plan into a compact URL-safe string and back, so it can be
// shared via a link or code with friends (no backend needed).
export function encodePlan(plan: WeekPlan): string {
  const json = JSON.stringify(plan);
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function decodePlan(code: string): WeekPlan | null {
  try {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(escape(atob(b64)));
    const plan = JSON.parse(json) as WeekPlan;
    if (!plan || !Array.isArray(plan.days)) return null;
    return plan;
  } catch {
    return null;
  }
}

// Full shareable link that opens the in-app import screen.
export function planShareUrl(plan: WeekPlan): string {
  const base = window.location.href.split('#')[0];
  return `${base}#/import?p=${encodePlan(plan)}`;
}

export async function sharePlan(plan: WeekPlan, name: string): Promise<'shared' | 'copied'> {
  const url = planShareUrl(plan);
  const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string; url?: string }) => Promise<void> };
  if (nav.share) {
    try {
      await nav.share({ title: 'My ForgeOS plan', text: `Check out my "${name}" training week on ForgeOS 💪`, url });
      return 'shared';
    } catch {
      /* user cancelled — fall through to copy */
    }
  }
  await navigator.clipboard.writeText(url);
  return 'copied';
}

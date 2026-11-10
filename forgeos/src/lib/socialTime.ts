export type TFn = (key: string, params?: Record<string, string | number>) => string;

/** "5m ago", "3h ago", "2d ago". A time in the future reads as "0m ago". */
export function timeAgo(iso: string, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/** How long a duel has left, in the caller's language. */
export function daysLeft(t: TFn, iso: string, now = Date.now()): string {
  const d = Math.ceil((new Date(iso).getTime() - now) / 86400000);
  return d <= 0 ? t('duel.ending') : t('duel.daysLeft', { n: d });
}

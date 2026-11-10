/**
 * "2026-09-26" → "26 Sep" (or "26. 9." in Slovak). Charts used to print the
 * raw "09-26" slice of the ISO string, which reads as month-day to nobody here.
 * Parsed at local noon so a date-only string never slips a day across a timezone.
 */
export function shortDate(isoDate: string, locale = 'en-GB'): string {
  const d = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(locale, { day: 'numeric', month: locale.startsWith('sk') ? 'numeric' : 'short' });
}

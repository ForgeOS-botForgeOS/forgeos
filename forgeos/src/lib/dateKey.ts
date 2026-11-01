// Calendar-day keys in the user's LOCAL timezone. `toISOString().slice(0, 10)`
// is the UTC day, which is "yesterday" for the first 1-2 hours after local
// midnight in Europe, so a 00:30 Monday session landed in the previous week.
const pad = (n: number) => String(n).padStart(2, '0');

/** yyyy-mm-dd of `d` in local time. */
export function localDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Monday (yyyy-mm-dd, local) of the week containing `d`. */
export function localMondayKey(d: Date = new Date()): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return localDateKey(x);
}

/** Monday key for a yyyy-mm-dd day key (parsed as a local calendar date). */
export function mondayOfKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return localMondayKey(new Date(y, m - 1, d));
}

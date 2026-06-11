import type { CanonicalProgress } from './canonical';

export interface ValidationIssue { record: string; reason: string }
export interface ValidationResult { clean: CanonicalProgress; issues: ValidationIssue[] }

const okDate = (d?: string) => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d));
const posOrUndef = (n?: number) => (typeof n === 'number' && isFinite(n) && n >= 0 ? n : undefined);

// Validate per-record: bad rows are SKIPPED (with a reason), never throwing — a
// single malformed entry must not fail the whole migration.
export function validate(c: CanonicalProgress): ValidationResult {
  const issues: ValidationIssue[] = [];

  const history = (c.history ?? []).filter((h, i) => {
    if (!okDate(h.date)) { issues.push({ record: `history[${i}]`, reason: `invalid date "${h.date}"` }); return false; }
    return true;
  }).map((h) => ({ ...h, volumeKg: posOrUndef(h.volumeKg), distanceKm: posOrUndef(h.distanceKm), durationMin: posOrUndef(h.durationMin) }));

  const bodyStats = (c.bodyStats ?? []).filter((b, i) => {
    if (!okDate(b.date)) { issues.push({ record: `bodyStats[${i}]`, reason: `invalid date "${b.date}"` }); return false; }
    return true;
  });

  const personalBests = (c.personalBests ?? []).filter((p, i) => {
    if (!p.name) { issues.push({ record: `personalBests[${i}]`, reason: 'missing name' }); return false; }
    return true;
  });

  return {
    clean: {
      ...c,
      history: history.length ? history : undefined,
      bodyStats: bodyStats.length ? bodyStats : undefined,
      personalBests: personalBests.length ? personalBests : undefined,
      totals: c.totals && {
        xp: posOrUndef(c.totals.xp),
        sessions: posOrUndef(c.totals.sessions),
        timeMinutes: posOrUndef(c.totals.timeMinutes),
        heavyLifts: posOrUndef(c.totals.heavyLifts),
      },
      currency: c.currency && { coins: posOrUndef(c.currency.coins) },
    },
    issues,
  };
}

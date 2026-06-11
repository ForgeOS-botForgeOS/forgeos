import type { CanonicalProgress, TrustLevel } from './canonical';

export interface VerifyReport {
  rejected: boolean; // too low-confidence to import at all (screenshot lane)
  warnings: string[];
  quarantined: string[]; // values held back as "unverified" rather than granted
}

// Per-trust caps on directly-granted currency/XP. Lower-trust lanes can't grant
// large unlocks outright — excess is quarantined (not applied), not cheated in.
const CAPS: Record<TrustLevel, { coins: number; xp: number }> = {
  high: { coins: 100000, xp: 10000000 },
  medium: { coins: 5000, xp: 500000 },
  low: { coins: 800, xp: 60000 },
};
const MIN_SCREENSHOT_CONF = 0.45;

// Light verification — plausibility + caps, NOT heavy anti-cheat.
export function verify(c: CanonicalProgress): { canonical: CanonicalProgress; report: VerifyReport } {
  const report: VerifyReport = { rejected: false, warnings: [], quarantined: [] };
  const out: CanonicalProgress = structuredClone(c);

  // Screenshot lane: reject if the extraction confidence is just too low.
  if (c.trust === 'low') {
    const vals = Object.values(c.confidence);
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    if (avg < MIN_SCREENSHOT_CONF) {
      report.rejected = true;
      report.warnings.push(`Image too unclear to trust (confidence ${(avg * 100) | 0}%). Try a sharper screenshot or use a file/API import.`);
      return { canonical: out, report };
    }
  }

  // Plausibility: a streak can't be longer than the account has existed.
  if (out.memberSince && out.streak) {
    const ageDays = Math.floor((Date.now() - Date.parse(out.memberSince)) / 86400000);
    if (ageDays >= 0) {
      for (const key of ['current', 'longest'] as const) {
        const v = out.streak[key];
        if (typeof v === 'number' && v > ageDays + 1) {
          report.warnings.push(`${key} streak ${v} exceeds account age ${ageDays}d — clamped to ${ageDays}.`);
          out.streak[key] = ageDays;
        }
      }
    }
  }

  // Currency / XP caps by trust level — excess quarantined.
  const cap = CAPS[out.trust];
  if (out.currency?.coins != null && out.currency.coins > cap.coins) {
    report.quarantined.push(`${out.currency.coins - cap.coins} coins (above ${out.trust}-trust cap)`);
    out.currency.coins = cap.coins;
  }
  if (out.totals?.xp != null && out.totals.xp > cap.xp) {
    report.quarantined.push(`${out.totals.xp - cap.xp} XP (above ${out.trust}-trust cap)`);
    out.totals.xp = cap.xp;
  }

  return { canonical: out, report };
}

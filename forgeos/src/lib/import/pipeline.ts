import type { Ingested } from './lanes';
import type { CanonicalProgress } from './canonical';
import type { ForgePatch } from './mapToForge';
import type { StreakDecision } from './streak';
import type { ValidationIssue } from './validate';
import type { VerifyReport } from './verify';
import { normalizeStructured } from './normalize';
import { validate } from './validate';
import { verify } from './verify';
import { decideStreak } from './streak';
import { mapToForge } from './mapToForge';

export const userTimezone = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'UTC'; }
};

export interface ImportPreview {
  source: string;
  canonical: CanonicalProgress;
  streak: StreakDecision;
  patch: ForgePatch;
  issues: ValidationIssue[];
  report: VerifyReport;
  rejected: boolean;
}

// ingest → normalize → validate → verify → map. Pure (no store writes) so the UI
// can show a preview and the user confirms BEFORE anything is committed.
export function buildPreview(ing: Ingested, source: string): ImportPreview {
  const normalized = normalizeStructured(ing.raw, source || 'your old app', ing.trust);
  const { clean, issues } = validate(normalized);
  const { canonical, report } = verify(clean);
  const streak = decideStreak(canonical.streak, canonical.timezone || userTimezone());
  const patch = mapToForge(canonical, streak);
  return { source: canonical.source, canonical, streak, patch, issues, report, rejected: report.rejected };
}

import type { HealthDay, HealthSource } from '../types';

// Forgiving importer for wearable data. Turns whatever a user can get out of
// Garmin (or any tracker) into HealthDay rows: a CSV, a JSON array, or Garmin's
// own "Export Your Data" sleep JSON. Heuristic on purpose — column names and
// units vary wildly between apps, so we match loosely and coerce sensibly.

export interface HealthParse {
  days: HealthDay[];
  format: string; // human label of what we detected
  notes: string[];
}

const DATE_KEYS = ['date', 'day', 'calendardate', 'calendar_date', 'timestamp', 'time', 'datetime'];
const FIELD_MATCHERS: { key: keyof HealthDay; match: RegExp; kind: 'sleep' | 'num' }[] = [
  { key: 'sleepMinutes', match: /sleep.*(min|dur|time|hours|hrs|h)|^sleep$|asleep|total_?sleep/i, kind: 'sleep' },
  { key: 'sleepScore', match: /sleep.*score|score.*sleep/i, kind: 'num' },
  { key: 'steps', match: /steps|step_?count/i, kind: 'num' },
  { key: 'restingHr', match: /resting.*(hr|heart)|rhr|resting_?heart/i, kind: 'num' },
  { key: 'activeCalories', match: /active.*cal|calor|kcal|energy/i, kind: 'num' },
  { key: 'bodyBattery', match: /body.?battery|battery/i, kind: 'num' },
  { key: 'stress', match: /stress/i, kind: 'num' },
];

/** Normalise any reasonable date string to local 'YYYY-MM-DD'. Returns '' if unusable. */
export function normDate(raw: unknown): string {
  if (raw == null) return '';
  const s = String(raw).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})/); // MM/DD/YYYY or DD.MM.YYYY-ish
  if (us) {
    const [, a, b, y] = us;
    const mm = a.padStart(2, '0');
    const dd = b.padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }
  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }
  return '';
}

/** Coerce a sleep value (hours, "7h 30m", "7:30", minutes, or seconds) to minutes. */
export function sleepToMinutes(raw: unknown): number | undefined {
  if (raw == null || raw === '') return undefined;
  if (typeof raw === 'number') {
    if (raw <= 0) return undefined;
    if (raw <= 24) return Math.round(raw * 60); // hours
    if (raw <= 1440) return Math.round(raw); // minutes
    return Math.round(raw / 60); // seconds
  }
  const s = String(raw).trim().toLowerCase();
  const hm = s.match(/(\d+(?:\.\d+)?)\s*h(?:ours?)?\s*(\d+)?\s*m?/);
  if (hm && /h/.test(s)) return Math.round(parseFloat(hm[1]) * 60 + (hm[2] ? parseInt(hm[2], 10) : 0));
  const colon = s.match(/^(\d+):(\d{2})$/);
  if (colon) return parseInt(colon[1], 10) * 60 + parseInt(colon[2], 10);
  const n = parseFloat(s);
  if (Number.isNaN(n)) return undefined;
  return sleepToMinutes(n);
}

function num(raw: unknown): number | undefined {
  if (raw == null || raw === '') return undefined;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[, ]/g, ''));
  return Number.isNaN(n) ? undefined : Math.round(n);
}

// Build a HealthDay from a generic record keyed by lower-cased column names.
function rowToDay(rec: Record<string, unknown>, source: HealthSource): HealthDay | null {
  const lower: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rec)) lower[k.trim().toLowerCase()] = v;

  let date = '';
  for (const dk of DATE_KEYS) if (lower[dk] != null && (date = normDate(lower[dk]))) break;
  if (!date) return null;

  const day: HealthDay = { date, source, updatedAt: Date.now() };
  for (const [colName, val] of Object.entries(lower)) {
    if (val == null || val === '') continue;
    for (const f of FIELD_MATCHERS) {
      if (day[f.key] !== undefined) continue;
      if (!f.match.test(colName)) continue;
      const parsed = f.kind === 'sleep' ? sleepToMinutes(val) : num(val);
      if (parsed !== undefined) (day[f.key] as number) = parsed;
    }
  }
  // Nothing but a date isn't worth importing.
  const hasData = FIELD_MATCHERS.some((f) => day[f.key] !== undefined);
  return hasData ? day : null;
}

// Garmin "Export Your Data" sleep file: an array of { calendarDate, sleepTimeInSeconds, ... }.
function parseGarminSleep(arr: Record<string, unknown>[]): HealthDay[] {
  const out: HealthDay[] = [];
  for (const r of arr) {
    const date = normDate(r.calendarDate ?? r.calendar_date);
    if (!date) continue;
    const secs = num(r.sleepTimeInSeconds ?? r.sleepTimeSeconds);
    const day: HealthDay = { date, source: 'garmin', updatedAt: Date.now() };
    if (secs !== undefined) day.sleepMinutes = Math.round(secs / 60);
    const score = num((r.sleepScores as Record<string, unknown>)?.overall ?? r.overallSleepScore);
    if (score !== undefined) day.sleepScore = score;
    if (day.sleepMinutes !== undefined || day.sleepScore !== undefined) out.push(day);
  }
  return out;
}

function parseCsv(text: string, source: HealthSource): HealthDay[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);
  const out: HealthDay[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const rec: Record<string, unknown> = {};
    headers.forEach((h, idx) => (rec[h] = cells[idx]));
    const day = rowToDay(rec, source);
    if (day) out.push(day);
  }
  return out;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; }
      else q = !q;
    } else if (c === ',' && !q) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** Main entry: detect the format of pasted/uploaded text and extract HealthDays. */
export function parseHealthText(text: string): HealthParse {
  const trimmed = text.trim();
  if (!trimmed) return { days: [], format: 'empty', notes: ['Nothing to read.'] };

  // JSON first (array of records or { days: [...] } or Garmin sleep export).
  if (trimmed[0] === '[' || trimmed[0] === '{') {
    try {
      const parsed = JSON.parse(trimmed);
      const arr: Record<string, unknown>[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.days) ? parsed.days
        : Array.isArray(parsed.records) ? parsed.records
        : [parsed];
      const looksGarmin = arr.some((r) => 'calendarDate' in r && ('sleepTimeInSeconds' in r || 'sleepTimeSeconds' in r));
      if (looksGarmin) {
        const days = parseGarminSleep(arr);
        return { days, format: 'Garmin sleep export', notes: [`Read ${days.length} night(s) of sleep.`] };
      }
      const days = arr.map((r) => rowToDay(r, 'import')).filter((d): d is HealthDay => !!d);
      return { days, format: 'JSON', notes: [`Read ${days.length} day(s).`] };
    } catch {
      return { days: [], format: 'json-error', notes: ['That looked like JSON but could not be parsed.'] };
    }
  }

  // Otherwise treat as CSV.
  const days = parseCsv(trimmed, 'import');
  return { days, format: 'CSV', notes: days.length ? [`Read ${days.length} day(s).`] : ['No rows matched a date + a metric. Check the headers.'] };
}

/** A copy-paste template so users know exactly what columns we understand. */
export const HEALTH_CSV_TEMPLATE = `date,sleep,steps,restingHR,activeCalories,bodyBattery,stress
2026-06-25,7h 32m,9450,52,640,78,28
2026-06-26,6.8,11200,54,820,71,34`;

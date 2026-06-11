import type { CanonicalBody, CanonicalDay, CanonicalPB, CanonicalProgress, TrustLevel } from './canonical';
import { emptyCanonical } from './canonical';

// Flexible normalizer: maps ARBITRARY structured input (any app's JSON/CSV/XML,
// any key names, any nesting) into ForgeOS's canonical progress schema using
// keyword heuristics — no per-app adapters. Returns per-field confidence so the
// screenshot lane can be verified more strictly than the API lane.

interface Entry { key: string; value: unknown }

function flatten(obj: unknown, out: Entry[] = [], depth = 0): Entry[] {
  if (depth > 6 || obj == null) return out;
  if (Array.isArray(obj)) {
    obj.forEach((v) => flatten(v, out, depth + 1));
    return out;
  }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out.push({ key: k.toLowerCase(), value: v });
      if (v && typeof v === 'object') flatten(v, out, depth + 1);
    }
  }
  return out;
}

const num = (v: unknown): number | undefined => {
  if (typeof v === 'number' && isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[, ]/g, ''));
    if (isFinite(n)) return n;
  }
  return undefined;
};

const toISODate = (v: unknown): string | undefined => {
  if (typeof v !== 'string' && typeof v !== 'number') return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
};

// Find the first entry whose key matches any pattern; earlier patterns are more
// specific and score higher confidence.
function pick(entries: Entry[], patterns: RegExp[], coerce: (v: unknown) => unknown) {
  for (let i = 0; i < patterns.length; i++) {
    for (const e of entries) {
      if (patterns[i].test(e.key)) {
        const c = coerce(e.value);
        if (c !== undefined && c !== null && c !== '') {
          return { value: c, conf: i === 0 ? 0.92 : 0.7 - i * 0.05 };
        }
      }
    }
  }
  return undefined;
}

function classifyArrays(input: unknown): { history: CanonicalDay[]; bodies: CanonicalBody[]; pbs: CanonicalPB[]; achievements: string[] } {
  const history: CanonicalDay[] = [];
  const bodies: CanonicalBody[] = [];
  const pbs: CanonicalPB[] = [];
  const achievements: string[] = [];

  const visit = (node: unknown, depth = 0) => {
    if (depth > 6 || node == null) return;
    if (Array.isArray(node)) {
      for (const el of node) {
        if (typeof el === 'string') { achievements.push(el); continue; }
        if (el && typeof el === 'object') {
          const e = flatten(el);
          const get = (re: RegExp) => e.find((x) => re.test(x.key))?.value;
          const date = toISODate(get(/date|day|timestamp|completed|created/));
          const weight = num(get(/^weight|weightkg|bodyweight|mass/));
          const waist = num(get(/waist/));
          const name = (get(/^name|title|exercise|achievement|badge/) as string) || undefined;
          const e1 = num(get(/e1rm|1rm|onerepmax|estimated/));
          const reps = num(get(/^reps|rep$/));
          const dist = num(get(/distance|km|miles/));
          const vol = num(get(/volume|tonnage|load/));
          const dur = num(get(/duration|minutes|time/));

          if (name && (e1 || weight || reps || dist)) {
            pbs.push({ name, e1rm: e1, weightKg: weight, reps, distanceKm: dist, date: date?.slice(0, 10) });
          } else if (date && (weight || waist)) {
            bodies.push({ date: date.slice(0, 10), weightKg: weight, waistCm: waist, bodyFatPct: num(get(/bodyfat|fat%/)), chestCm: num(get(/chest/)), armCm: num(get(/arm|bicep/)), thighCm: num(get(/thigh/)), hipCm: num(get(/hip/)) });
          } else if (date && (vol || dist || dur || num(get(/sessions|count/)))) {
            history.push({ date: date.slice(0, 10), volumeKg: vol, distanceKm: dist, durationMin: dur, sessions: num(get(/sessions|count/)) ?? 1 });
          } else if (name) {
            achievements.push(name);
          }
          visit(el, depth + 1);
        }
      }
      return;
    }
    if (typeof node === 'object') for (const v of Object.values(node as Record<string, unknown>)) visit(v, depth + 1);
  };
  visit(input);
  return { history, bodies, pbs, achievements };
}

export function normalizeStructured(input: unknown, source: string, trust: TrustLevel): CanonicalProgress {
  const out = emptyCanonical(source, trust);
  const entries = flatten(input);
  const conf = out.confidence;

  const setNum = (field: string, patterns: RegExp[], assign: (n: number) => void) => {
    const r = pick(entries, patterns, num);
    if (r) { assign(r.value as number); conf[field] = r.conf; }
  };
  const setStr = (field: string, patterns: RegExp[], assign: (s: string) => void) => {
    const r = pick(entries, patterns, (v) => (typeof v === 'string' ? v : undefined));
    if (r) { assign(r.value as string); conf[field] = r.conf; }
  };
  const setDate = (field: string, patterns: RegExp[], assign: (s: string) => void) => {
    const r = pick(entries, patterns, toISODate);
    if (r) { assign(r.value as string); conf[field] = r.conf; }
  };

  out.streak = {};
  setNum('streak.current', [/current.?streak|streak.?count|^streak$|daystreak/, /streak/], (n) => (out.streak!.current = Math.round(n)));
  setNum('streak.longest', [/longest.?streak|max.?streak|best.?streak|record.?streak/], (n) => (out.streak!.longest = Math.round(n)));
  setDate('streak.lastActive', [/last.?active|last.?session|last.?workout|last.?practice|lastlog/], (s) => (out.streak!.lastActive = s));
  setDate('streak.startedAt', [/streak.?start|started/], (s) => (out.streak!.startedAt = s));
  setNum('streak.freezes', [/freeze|repair|streak.?save/], (n) => (out.streak!.freezes = Math.round(n)));
  if (!Object.keys(out.streak).length) out.streak = undefined;

  out.totals = {};
  setNum('totals.xp', [/^xp$|experience|^points$|total.?points|score/], (n) => (out.totals!.xp = Math.round(n)));
  setNum('totals.sessions', [/total.?sessions|total.?workouts|sessions|workouts|activities|lessons.?completed|sessions.?completed/], (n) => (out.totals!.sessions = Math.round(n)));
  setNum('totals.timeMinutes', [/total.?minutes|minutes.?spent|time.?minutes|active.?minutes/], (n) => (out.totals!.timeMinutes = Math.round(n)));
  setNum('totals.heavyLifts', [/heavy.?lifts|100kg|plates/], (n) => (out.totals!.heavyLifts = Math.round(n)));
  if (!Object.keys(out.totals).length) out.totals = undefined;

  out.currency = {};
  setNum('currency.coins', [/coins|gems|gold|currency|tokens/], (n) => (out.currency!.coins = Math.round(n)));
  if (!Object.keys(out.currency).length) out.currency = undefined;

  out.level = {};
  setStr('level.rank', [/^rank$|tier|league|division|belt/], (s) => (out.level!.rank = s));
  setNum('level.value', [/^level$|lvl/], (n) => (out.level!.value = Math.round(n)));
  if (!Object.keys(out.level).length) out.level = undefined;

  setDate('memberSince', [/member.?since|join.?date|joined|created.?at|registered|signup|sign.?up/], (s) => (out.memberSince = s));
  setStr('timezone', [/timezone|tz|time.?zone/], (s) => (out.timezone = s));

  out.settings = {};
  setNum('settings.weeklyGoal', [/weekly.?goal|sessions.?per.?week|days.?per.?week|goal.?per.?week/], (n) => (out.settings!.weeklyGoal = Math.round(n)));
  setStr('settings.units', [/units|unit.?system|measurement/], (s) => (out.settings!.units = s));
  if (!Object.keys(out.settings).length) out.settings = undefined;

  const { history, bodies, pbs, achievements } = classifyArrays(input);
  if (history.length) { out.history = history; conf['history'] = 0.8; }
  if (bodies.length) { out.bodyStats = bodies; conf['bodyStats'] = 0.8; }
  if (pbs.length) { out.personalBests = pbs; conf['personalBests'] = 0.75; }
  if (achievements.length) { out.achievements = [...new Set(achievements)].map((name) => ({ name })); conf['achievements'] = 0.7; }

  return out;
}

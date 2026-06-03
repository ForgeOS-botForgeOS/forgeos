import { EXERCISES, exerciseById } from '../data/exercises';
import type { ExerciseTarget, MuscleGroup, PlannedDay, Weekday } from '../types';
import { exercisesForFocus, inferFocus } from '../screens/onboarding/planGenerator';

export interface BuiltDay {
  label: string;
  exerciseIds: string[];
  targets: Record<string, ExerciseTarget>;
}

const MUSCLE_WORDS: Record<string, MuscleGroup> = {
  chest: 'Chest', back: 'Back', shoulder: 'Shoulders', delt: 'Shoulders', bicep: 'Biceps', tricep: 'Triceps',
  arm: 'Biceps', quad: 'Quads', leg: 'Quads', ham: 'Hamstrings', glute: 'Glutes', calf: 'Calves', core: 'Core', ab: 'Core',
};

// Build a professional-style day from a name + focus + skip instructions.
export function buildSmartDay(name: string, focusText: string, skipText: string, goal: 'hypertrophy' | 'strength' = 'hypertrophy'): BuiltDay {
  const focus = inferFocus(`${name} ${focusText}`);
  let ids = exercisesForFocus(focus, 6);

  // Emphasise any muscle named in the focus text with 1–2 extra movements.
  const focusLower = focusText.toLowerCase();
  for (const [word, muscle] of Object.entries(MUSCLE_WORDS)) {
    if (focusLower.includes(word)) {
      const extra = EXERCISES.filter((e) => e.primary === muscle && e.category !== 'Cardio' && !ids.includes(e.id)).slice(0, 2).map((e) => e.id);
      ids = [...extra, ...ids];
    }
  }

  // Apply skip instructions: drop exercises matching skip keywords/equipment/joints.
  const skip = skipText.toLowerCase();
  if (skip.trim()) {
    const jointMap: Record<string, RegExp> = {
      knee: /squat|lunge|jump|pistol|step-up|sprint/i,
      shoulder: /overhead|snatch|jerk|press|handstand/i,
      back: /deadlift|good morning|bent.?over row|rack pull/i,
      wrist: /barbell curl|skull|dip/i,
    };
    const words = skip.split(/[^a-z]+/).filter((w) => w.length > 2);
    ids = ids.filter((id) => {
      const ex = exerciseById(id);
      if (!ex) return false;
      const n = ex.name.toLowerCase();
      const eq = ex.equipment.toLowerCase();
      for (const w of words) {
        if (jointMap[w] && jointMap[w].test(n)) return false;
        if (n.includes(w) || eq.includes(w) || ex.primary.toLowerCase().includes(w)) return false;
      }
      return true;
    });
    // Backfill if we removed too many.
    if (ids.length < 4) {
      const more = exercisesForFocus(focus, 8).filter((id) => !ids.includes(id));
      ids = [...ids, ...more].slice(0, 6);
    }
  }

  ids = [...new Set(ids)].slice(0, 7);

  // Sets/reps: first 2 (compounds) heavier, rest accessory.
  const targets: Record<string, ExerciseTarget> = {};
  ids.forEach((id, i) => {
    targets[id] = goal === 'strength'
      ? { sets: i < 2 ? 5 : 3, reps: i < 2 ? 5 : 8 }
      : { sets: i < 2 ? 4 : 3, reps: i < 2 ? 6 : 12 };
  });

  const label = name.trim() || focus;
  return { label, exerciseIds: ids, targets };
}

// Parse a pasted workout (free text) into matched exercises + targets.
// Handles lines like: "Bench Press 3x8 100kg", "Squat 5 x 5 @120", "- Deadlift 3x5".
export function parsePastedWorkout(text: string): BuiltDay {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const exerciseIds: string[] = [];
  const targets: Record<string, ExerciseTarget> = {};

  for (const line of lines) {
    const setsReps = line.match(/(\d+)\s*[x×]\s*(\d+)/i);
    const weight = line.match(/(\d+(?:\.\d+)?)\s*(?:kg|@)/i) || line.match(/@\s*(\d+(?:\.\d+)?)/);
    // strip numbers/markup to isolate the exercise name
    const namePart = line.replace(/(\d+)\s*[x×]\s*(\d+)/gi, '').replace(/@?\s*\d+(?:\.\d+)?\s*(kg)?/gi, '').replace(/^[\-*•\d.\s]+/, '').trim();
    if (!namePart) continue;
    const match = bestExerciseMatch(namePart);
    if (!match || exerciseIds.includes(match)) continue;
    exerciseIds.push(match);
    targets[match] = {
      sets: setsReps ? Number(setsReps[1]) : 3,
      reps: setsReps ? Number(setsReps[2]) : 8,
      weightKg: weight ? Number(weight[1]) : 0,
    };
  }
  return { label: 'Pasted workout', exerciseIds, targets };
}

// ---- Whole-week paste ----
const WEEKDAYS: Weekday[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_ALIASES: Record<string, Weekday> = {
  monday: 'Mon', mon: 'Mon', tuesday: 'Tue', tue: 'Tue', tues: 'Tue', wednesday: 'Wed', wed: 'Wed',
  thursday: 'Thu', thu: 'Thu', thurs: 'Thu', friday: 'Fri', fri: 'Fri', saturday: 'Sat', sat: 'Sat', sunday: 'Sun', sun: 'Sun',
};

interface Section { day?: Weekday; dayIndex?: number; label?: string; lines: string[] }

// Is this line a day header (e.g. "Monday", "Mon - Push", "Day 1: Legs")?
function detectHeader(line: string): Omit<Section, 'lines'> | null {
  const l = line.replace(/[*#>•]/g, '').trim();
  const dayN = l.match(/^day\s*(\d+)\s*[:\-–—.)]*\s*(.*)$/i);
  if (dayN) return { dayIndex: Number(dayN[1]) - 1, label: dayN[2].trim() || undefined };
  const m = l.match(/^([a-zA-Z]+)\s*[:\-–—.)]*\s*(.*)$/);
  if (m && DAY_ALIASES[m[1].toLowerCase()]) return { day: DAY_ALIASES[m[1].toLowerCase()], label: m[2].trim() || undefined };
  return null;
}

const isRestText = (s: string) => /\b(rest|off|recovery|none)\b/i.test(s);

// Parse a pasted full week into 7 PlannedDays. Splits on day headers; lines
// under each header are matched as exercises. Unlisted days become rest days.
export function parsePastedWeek(text: string): { days: PlannedDay[]; matchedDays: number; matchedExercises: number } {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const sections: Section[] = [];
  let cur: Section | null = null;

  for (const line of lines) {
    const looksExercise = /\d+\s*[x×]\s*\d+/i.test(line);
    const h = !looksExercise ? detectHeader(line) : null;
    if (h) {
      cur = { ...h, lines: [] };
      sections.push(cur);
    } else if (cur) {
      cur.lines.push(line);
    } else {
      cur = { lines: [line] };
      sections.push(cur);
    }
  }

  // Place each section onto a weekday: explicit name → that day; "Day N" → Nth;
  // otherwise fill the next free slot from Monday.
  const byDay = new Map<Weekday, Section>();
  const free = () => WEEKDAYS.find((d) => !byDay.has(d));
  for (const sec of sections) {
    let day = sec.day ?? (sec.dayIndex != null ? WEEKDAYS[sec.dayIndex] : undefined) ?? free();
    if (!day) continue;
    byDay.set(day, sec);
  }

  let matchedDays = 0;
  let matchedExercises = 0;
  const days: PlannedDay[] = WEEKDAYS.map((day) => {
    const sec = byDay.get(day);
    if (!sec) return { day, label: 'Rest', exerciseIds: [], rest: true };
    const built = parsePastedWorkout(sec.lines.join('\n'));
    const restDay = built.exerciseIds.length === 0 && (isRestText(sec.label ?? '') || sec.lines.every(isRestText));
    if (restDay) return { day, label: 'Rest', exerciseIds: [], rest: true };
    if (built.exerciseIds.length) { matchedDays++; matchedExercises += built.exerciseIds.length; }
    const label = (sec.label && !isRestText(sec.label))
      ? sec.label
      : (built.exerciseIds.length ? inferFocus(sec.lines.join(' ')) : 'Rest');
    return { day, label: label || 'Workout', exerciseIds: built.exerciseIds, rest: built.exerciseIds.length === 0, targets: built.targets };
  });

  return { days, matchedDays, matchedExercises };
}

function bestExerciseMatch(name: string): string | null {
  const words = name.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2);
  if (!words.length) return null;
  let best: { id: string; score: number } | null = null;
  for (const e of EXERCISES) {
    const en = e.name.toLowerCase();
    let score = 0;
    for (const w of words) if (en.includes(w)) score += w.length;
    // exact-ish name boost
    if (en === name.toLowerCase()) score += 100;
    if (score > 0 && (!best || score > best.score)) best = { id: e.id, score };
  }
  return best ? best.id : null;
}

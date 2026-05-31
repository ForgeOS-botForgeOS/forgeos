import type { WeekPlan } from '../types';
import { EXERCISES, exerciseById } from '../data/exercises';

// Rule-based plan tailoring from a free-text request (offline, deterministic).
// e.g. "bad knees" swaps squats/lunges for leg press & hip thrust.
interface Rule {
  match: RegExp;
  // exercise-name keywords to replace, and the safer movement to use
  avoid: RegExp;
  preferIds: string[]; // candidate replacements (same area, gentler)
  note: string;
}

const byName = (kw: string) => EXERCISES.find((e) => e.name.toLowerCase().includes(kw))?.id;
const ids = (...kws: string[]) => kws.map(byName).filter(Boolean) as string[];

const RULES: Rule[] = [
  {
    match: /knee|acl|meniscus/,
    avoid: /squat|lunge|jump|pistol|step-up|box jump|sprint/,
    preferIds: ids('leg press', 'hip thrust', 'lying leg curl', 'leg extension', 'glute bridge'),
    note: 'Knee-friendly: swapped deep-knee/impact moves for leg press, hip thrust & curls.',
  },
  {
    match: /shoulder|rotator|overhead/,
    avoid: /overhead|snatch|jerk|push press|handstand|behind the neck/,
    preferIds: ids('incline dumbbell press', 'cable lateral raise', 'face pull', 'chest-supported row'),
    note: 'Shoulder-friendly: removed overhead pressing in favour of inclines, lateral raises & face pulls.',
  },
  {
    match: /back|spine|disc|hernia|sciatic/,
    avoid: /deadlift|good morning|bent.?over row|rack pull|clean|snatch/,
    preferIds: ids('chest-supported row', 'hip thrust', 'lat pulldown', 'leg press'),
    note: 'Back-friendly: replaced heavy spinal-loading lifts with supported rows, hip thrust & pulldowns.',
  },
  {
    match: /wrist|elbow|tendon/,
    avoid: /barbell curl|skull|close-grip|dip/,
    preferIds: ids('hammer curl', 'cable triceps pushdown', 'incline dumbbell curl'),
    note: 'Joint-friendly arms: swapped to cable/dumbbell variations.',
  },
];

export interface TailorResult {
  plan: WeekPlan;
  notes: string[];
}

export function tailorPlan(plan: WeekPlan, request: string): TailorResult {
  const text = (request || '').toLowerCase();
  const notes: string[] = [];
  let days = plan.days;

  for (const rule of RULES) {
    if (!rule.match.test(text) || rule.preferIds.length === 0) continue;
    let changed = false;
    days = days.map((d) => {
      if (d.rest) return d;
      let pi = 0;
      const exerciseIds = d.exerciseIds.map((id) => {
        const ex = exerciseById(id);
        if (ex && rule.avoid.test(ex.name.toLowerCase())) {
          // pick a replacement not already in the day
          const repl = rule.preferIds.find((r) => !d.exerciseIds.includes(r)) ?? rule.preferIds[pi % rule.preferIds.length];
          pi += 1;
          changed = true;
          return repl;
        }
        return id;
      });
      return { ...d, exerciseIds };
    });
    if (changed) notes.push(rule.note);
  }

  // "short on time / busy" → trim each training day to 3 exercises.
  if (/short|busy|no time|quick|30 min|20 min/.test(text)) {
    days = days.map((d) => (d.rest ? d : { ...d, exerciseIds: d.exerciseIds.slice(0, 3) }));
    notes.push('Time-saver: trimmed each day to 3 key exercises.');
  }

  return { plan: { ...plan, days }, notes };
}

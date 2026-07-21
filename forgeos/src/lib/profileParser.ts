import type { ExperienceLevel, Goal, Sex } from '../types';

// Parse a free-text self-description into structured onboarding hints, so a user
// who finds the tap-through quiz fiddly can just *say* who they are and we fill
// the form in for them. 100% local heuristics (EN + common SK words) — no AI,
// no uploads, and every field is a best-effort guess the user then confirms on
// the metrics screen. Nothing here is trusted blindly; it only pre-fills.

export interface ParsedProfile {
  age?: number;
  heightCm?: number;
  weightKg?: number;
  sex?: Sex;
  goal?: Goal;
  experience?: ExperienceLevel;
  daysPerWeek?: number;
  /** One of the ICE_BREAKER style labels, so the plan generator understands it. */
  style?: string;
  /** Human-readable limitations we spotted (injuries, time, equipment). */
  constraints: string[];
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// Ordered so the first matching phrase wins where it matters.
const GOAL_WORDS: { re: RegExp; goal: Goal }[] = [
  { re: /\b(recomp|recomposition|tone|toned|lean out|body recomp)\b/i, goal: 'recomp' },
  { re: /\b(lose|losing|cut|cutting|drop (?:fat|weight)|fat ?loss|weight ?loss|slim|leaner|schudn|chudnut)\w*/i, goal: 'lose' },
  { re: /\b(strength|stronger|powerlift|power ?lifting|1 ?rm|one ?rep ?max|lift heavy|sila|silnej)\w*/i, goal: 'strength' },
  { re: /\b(gain|bulk|build muscle|put on|mass|grow|size|hypertroph|naber|pribra|svaly)\w*/i, goal: 'gain' },
  { re: /\b(maintain|maintenance|stay the same|keep my|udrz)\w*/i, goal: 'maintain' },
];

const EXPERIENCE_WORDS: { re: RegExp; level: ExperienceLevel }[] = [
  { re: /\b(complete beginner|total beginner|beginner|newbie|new to (?:this|lifting|the gym)|just start|never (?:lifted|trained)|starting out|zaciatocn|zacinam)\w*/i, level: 'beginner' },
  { re: /\b(advanced|experienced|many years|\d+\s*years|know my numbers|competit|compet(?:e|ed)|pokrocil|rokov)\w*/i, level: 'advanced' },
  { re: /\b(intermediate|on and off|for a while|couple(?: of)? years|stredne)\w*/i, level: 'intermediate' },
];

const STYLE_WORDS: { re: RegExp; style: string }[] = [
  { re: /\b(power ?lift|powerlifting|strength training|squat.+bench.+deadlift)\w*/i, style: 'Powerlifting' },
  { re: /\b(bodybuild|hypertroph|physique|aesthetic|mirror muscles)\w*/i, style: 'Bodybuilding' },
  { re: /\b(calisthenic|bodyweight|body-weight|street workout|pull ?ups?)\w*/i, style: 'Calisthenics' },
  { re: /\b(crossfit|functional|wod|metcon)\w*/i, style: 'CrossFit-style' },
  { re: /\b(cardio|running|runner|\brun\b|endurance|jog|cycling)\w*/i, style: 'Cardio' },
];

const CONSTRAINT_WORDS: { re: RegExp; label: string }[] = [
  { re: /\b(knee|kolen)\w*/i, label: 'knees' },
  { re: /\b(lower ?back|back pain|bad back|herniat|chrbt|chrbat)\w*/i, label: 'lower back' },
  { re: /\b(shoulder|rotator|rameno)\w*/i, label: 'shoulders' },
  { re: /\b(wrist|zapast)\w*/i, label: 'wrists' },
  { re: /\b(elbow|loket)\w*/i, label: 'elbows' },
  { re: /\b(hip|bedr)\w*/i, label: 'hips' },
  { re: /\b(ankle|clenk)\w*/i, label: 'ankles' },
  { re: /\b(no time|short on time|busy|limited time|malo casu|nemam cas)\w*/i, label: 'limited time' },
  { re: /\b(at home|home workout|no gym|doma|bez posilky)\w*/i, label: 'training at home' },
  { re: /\b(no equipment|bodyweight only|dumbbells? only|bez vybaven)\w*/i, label: 'minimal equipment' },
];

function matchGoal(text: string): Goal | undefined {
  for (const row of GOAL_WORDS) if (row.re.test(text)) return row.goal;
  return undefined;
}

function matchExperience(text: string): ExperienceLevel | undefined {
  for (const row of EXPERIENCE_WORDS) if (row.re.test(text)) return row.level;
  return undefined;
}

function matchStyle(text: string): string | undefined {
  for (const row of STYLE_WORDS) if (row.re.test(text)) return row.style;
  return undefined;
}

function parseAge(text: string): number | undefined {
  // "16 years old", "16yo", "age 16", "16 rokov" — but never a kg/cm number.
  const explicit = text.match(/\b(\d{1,2})\s*(?:yo|y\/o|years?\s*old|year-?old|rokov|rocn)\b/i);
  if (explicit) return clamp(Number(explicit[1]), 10, 90);
  const phrased = text.match(/\b(?:i'?m|im|age[d]?|mam)\s+(\d{1,2})\b(?!\s*(?:kg|cm|k[gm]))/i);
  if (phrased) return clamp(Number(phrased[1]), 10, 90);
  return undefined;
}

function parseWeight(text: string): number | undefined {
  const m = text.match(/\b(\d{2,3}(?:[.,]\d)?)\s*(?:kg|kilo?g?r?a?m?s?|kíl)\b/i);
  if (!m) return undefined;
  return clamp(Number(m[1].replace(',', '.')), 30, 300);
}

function parseHeight(text: string): number | undefined {
  const cm = text.match(/\b(\d{3})\s*cm\b/i);
  if (cm) return clamp(Number(cm[1]), 120, 230);
  const m = text.match(/\b(1[.,]\d{1,2})\s*m\b/i);
  if (m) return clamp(Math.round(Number(m[1].replace(',', '.')) * 100), 120, 230);
  return undefined;
}

function parseSex(text: string): Sex | undefined {
  if (/\b(female|woman|girl|she\/her|zena|dievca)\b/i.test(text)) return 'female';
  if (/\b(male|\bman\b|guy|boy|he\/him|muz|chlap)\b/i.test(text)) return 'male';
  return undefined;
}

function parseDays(text: string): number | undefined {
  const m = text.match(/\b([1-7])\s*(?:x|×|days?|times|dni|dní|krat)\b/i);
  if (m) return clamp(Number(m[1]), 1, 7);
  const m2 = text.match(/\b([1-7])\s*(?:x|times|days?)\s*(?:a|per|\/)\s*week/i);
  if (m2) return clamp(Number(m2[1]), 1, 7);
  return undefined;
}

/**
 * Best-effort extraction of onboarding hints from a free-text blurb. Always
 * returns an object; every field is optional except `constraints` (may be []).
 */
export function parseAbout(raw: string): ParsedProfile {
  const text = ` ${(raw || '').toLowerCase()} `;
  const constraints: string[] = [];
  for (const c of CONSTRAINT_WORDS) if (c.re.test(text)) constraints.push(c.label);

  return {
    age: parseAge(text),
    heightCm: parseHeight(text),
    weightKg: parseWeight(text),
    sex: parseSex(text),
    goal: matchGoal(text),
    experience: matchExperience(text),
    daysPerWeek: parseDays(text),
    style: matchStyle(text),
    constraints: [...new Set(constraints)],
  };
}

/** How many fields we managed to fill — drives the "we caught N things" hint. */
export function parsedFieldCount(p: ParsedProfile): number {
  const fields = [p.age, p.heightCm, p.weightKg, p.sex, p.goal, p.experience, p.daysPerWeek, p.style];
  return fields.filter((v) => v !== undefined).length + p.constraints.length;
}

import type { ExerciseCategory, MuscleGroup } from '../types';

// "AI coach" for user-created exercises: reads the name + the user's own
// answer to "what does it do / how do you perform it" and works out which
// muscles it trains, what kind of exercise it is, and how much XP creating
// it earns (richer, clearer descriptions earn more).
//
// Offline-first like everything else: a keyword engine that always works,
// optionally upgraded by the vision Worker when one is configured (keys stay
// server-side — see security.test.ts).

export interface ExerciseClassification {
  primary: MuscleGroup;
  secondary: MuscleGroup[];
  category: ExerciseCategory;
  equipment: string;
  confidence: number; // 0..1 — how sure the keyword engine is
  xp: number; // creation reward
  feedback: string; // coach-style answer shown to the user
}

const WORKER_URL = import.meta.env.VITE_VISION_API_URL as string | undefined;

// Keyword → muscle evidence. Order matters only for tie-breaks (first hit wins ties).
const MUSCLE_HINTS: [MuscleGroup, RegExp][] = [
  ['Chest', /\b(chest|pecs?|bench|push[- ]?ups?|fl(y|ies)|dips?)\b/i],
  ['Back', /\b(back|lats?|rows?|pull[- ]?ups?|pulldowns?|deadlifts?|shrugs?|traps?)\b/i],
  ['Shoulders', /\b(shoulders?|delts?|overhead|lateral raises?|face pulls?|arnold)\b/i],
  ['Biceps', /\b(biceps?|curls?|chin[- ]?ups?)\b/i],
  ['Triceps', /\b(triceps?|extensions?|pushdowns?|skull ?crushers?|close[- ]?grip)\b/i],
  ['Quads', /\b(quads?|quadriceps|squats?|lunges?|leg press|step[- ]?ups?|knee extensions?|pistols?)\b/i],
  ['Hamstrings', /\b(hamstrings?|hammies|leg curls?|romanian|rdls?|good ?mornings?|nordics?)\b/i],
  ['Glutes', /\b(glutes?|butt|hip thrusts?|bridges?|kickbacks?|hips?)\b/i],
  ['Calves', /\b(calf|calves|raise on toes|toe raises?)\b/i],
  ['Core', /\b(core|abs?|plank|crunch(es)?|sit[- ]?ups?|obliques?|rotations?|hollow|l[- ]?sit)\b/i],
  ['Full Body', /\b(full body|whole body|burpees?|cleans?|snatch(es)?|thrusters?|carr(y|ies)|sled|swings?)\b/i],
];

const CATEGORY_HINTS: [ExerciseCategory, RegExp][] = [
  ['Cardio', /\b(run|sprint|bike|row(ing)? machine|jump rope|cardio|treadmill|conditioning)\b/i],
  ['Plyometrics', /\b(jump|hop|bound|explosive|plyo)\b/i],
  ['Olympic', /\b(clean|snatch|jerk)\b/i],
  ['Calisthenics', /\b(bodyweight|no equipment|bar only|push[- ]?up|pull[- ]?up|dip|plank|pistol|muscle[- ]?up)\b/i],
  ['CrossFit', /\b(wod|amrap|emom|crossfit|kipping)\b/i],
  ['Powerlifting', /\b(1rm|max|heavy (single|double|triple)|powerlifting|low bar)\b/i],
];

const EQUIPMENT_HINTS: [string, RegExp][] = [
  ['Barbell', /\bbar(bell)?\b/i],
  ['Dumbbell', /\bdumbbell|db\b/i],
  ['Kettlebell', /\bkettlebell|kb\b/i],
  ['Cable', /\bcable|pulley\b/i],
  ['Machine', /\bmachine|smith\b/i],
  ['Band', /\bband\b/i],
  ['Bodyweight', /\bbodyweight|no equipment|own weight\b/i],
];

export function classifyExerciseLocal(name: string, description: string): ExerciseClassification {
  const text = `${name} ${description}`;

  const hits = MUSCLE_HINTS.filter(([, re]) => re.test(text)).map(([m]) => m);
  const primary = hits[0] ?? 'Full Body';
  const secondary = hits.slice(1, 3);

  const category = CATEGORY_HINTS.find(([, re]) => re.test(text))?.[0] ?? 'Bodybuilding';
  const equipment = EQUIPMENT_HINTS.find(([, re]) => re.test(text))?.[0] ?? 'Bodyweight';

  // Confidence: did we actually recognise muscles, or are we guessing?
  const confidence = Math.min(1, 0.3 + hits.length * 0.25);

  // XP: reward the effort of a real description, capped so it can't be farmed.
  const words = description.trim().split(/\s+/).filter(Boolean).length;
  const xp = Math.min(100, 30 + Math.min(40, words * 2) + hits.length * 10);

  const feedback =
    hits.length === 0
      ? `I couldn't recognise the muscles from that description — tell me what it works (e.g. "targets the chest and triceps") and I'll classify it better.`
      : `Sounds like a ${category.toLowerCase()} move mainly working your ${primary}${secondary.length ? `, with help from ${secondary.join(' and ')}` : ''}. Nice addition to the library!`;

  return { primary, secondary, category, equipment, confidence, xp, feedback };
}

/** Worker-assisted classification when available; local engine otherwise. */
export async function classifyExercise(name: string, description: string): Promise<ExerciseClassification> {
  const local = classifyExerciseLocal(name, description);
  if (!WORKER_URL) return local;
  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'exercise', name, description }),
    });
    if (!res.ok) return local;
    const out = await res.json();
    if (out?.error || !out?.primary) return local;
    return {
      ...local,
      primary: (out.primary as MuscleGroup) ?? local.primary,
      secondary: Array.isArray(out.secondary) ? (out.secondary as MuscleGroup[]).slice(0, 3) : local.secondary,
      category: (out.category as ExerciseCategory) ?? local.category,
      confidence: Math.max(local.confidence, 0.85),
      feedback: typeof out.tip === 'string' && out.tip ? out.tip : local.feedback,
    };
  } catch {
    return local;
  }
}

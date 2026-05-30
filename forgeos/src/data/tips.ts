// Science tip of the day — rotated by day-of-year so it's stable per day.
export const SCIENCE_TIPS: string[] = [
  'Training a muscle 2x/week beats 1x/week for hypertrophy at matched weekly volume (Schoenfeld 2016).',
  '10–20 hard sets per muscle group per week is the sweet spot for most lifters.',
  'Protein around 1.6–2.2 g/kg bodyweight maximises muscle protein synthesis; more rarely helps.',
  'Leaving 1–3 reps in reserve (RPE 7–9) drives growth with far less fatigue than training to failure every set.',
  'Rest 2–3 minutes on compound lifts — short rest cuts total volume and blunts strength gains.',
  'Sleep is anabolic: under 6h/night measurably reduces fat loss and lean-mass retention in a deficit.',
  'Creatine monohydrate (3–5 g/day) is the most evidence-backed legal supplement for strength.',
  'Eccentric (lowering) control under tension is a potent growth stimulus — don’t drop the weight.',
  'A 300–500 kcal deficit preserves more muscle during a cut than an aggressive crash diet.',
  'Caffeine 3–6 mg/kg ~45 min pre-session reliably improves strength and endurance output.',
  'Progressive overload doesn’t only mean more weight — reps, sets, ROM, and tempo all count.',
  'Deloading every 4–8 weeks lets accumulated fatigue dissipate so adaptation can surface.',
  'Full range of motion generally builds more muscle than partials, especially at long muscle lengths.',
  'Carbs around training improve performance and recovery; total daily intake matters most.',
  'Soreness (DOMS) is a poor proxy for a good workout — progress is the real signal.',
];

export function tipOfTheDay(dayIndex: number): string {
  return SCIENCE_TIPS[dayIndex % SCIENCE_TIPS.length];
}

// Form cues keyed by primary muscle — shown on each exercise in the library.
export const MUSCLE_CUES: Record<string, string> = {
  Chest: 'Retract the shoulder blades, keep elbows ~45°, drive through the mid-chest.',
  Back: 'Lead with the elbows, think “pull from the lats”, avoid yanking with biceps.',
  Shoulders: 'Brace the core, don’t arch the lower back; control the eccentric.',
  Biceps: 'Pin the elbows, no swinging — full stretch at the bottom, squeeze at the top.',
  Triceps: 'Lock the elbows in place; only the forearm moves. Full lockout each rep.',
  Quads: 'Knees track over toes, full depth where mobility allows, drive through mid-foot.',
  Hamstrings: 'Hinge at the hips, soft knees, feel the stretch — don’t round the back.',
  Glutes: 'Posterior pelvic tilt at the top, squeeze hard, chin tucked.',
  Calves: 'Full stretch at the bottom, pause and rise to the big toe at the top.',
  Core: 'Brace as if about to be punched; quality of tension over reps.',
  'Full Body': 'Master the sequence light before loading; power comes from the hips.',
};

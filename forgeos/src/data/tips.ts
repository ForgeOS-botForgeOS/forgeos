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

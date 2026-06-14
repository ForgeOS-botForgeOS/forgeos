// The AI bridge: the universal, no-integration way to transfer progress from ANY
// app. The user pastes their export (or a screenshot) into any AI assistant
// together with AI_CONVERT_PROMPT; the AI returns JSON in exactly the shape our
// `api` lane already understands. This is the single source of truth for that
// shape — the same example feeds the prompt, the textarea placeholder, and a
// round-trip test that proves AI output imports cleanly.

/** A complete, realistic example of the JSON the importer accepts. */
export const EXAMPLE_EXPORT = {
  app: 'NameOfYourOldApp',
  memberSince: '2022-03-15',
  currentStreak: 180,
  longestStreak: 240,
  lastActive: '2026-06-14',
  xp: 42000,
  coins: 1500,
  totalSessions: 320,
  weeklyGoal: 4,
  personalBests: [
    { exercise: 'Bench Press', weightKg: 110, reps: 3 },
    { exercise: 'Back Squat', weightKg: 160, reps: 1 },
    { exercise: 'Deadlift', weightKg: 200, reps: 1 },
  ],
  history: [
    { date: '2026-06-10', volumeKg: 8200 },
    { date: '2026-06-12', distanceKm: 5, durationMin: 28 },
  ],
  bodyStats: [{ date: '2026-06-01', weightKg: 82, waistCm: 84 }],
  achievements: ['100 Workouts', 'Early Bird', '6-Month Streak'],
} as const;

/** Plain-English description of every accepted field (also embedded in the prompt). */
export const SCHEMA_HINT = `Return ONE JSON object. All fields are optional — include only what you can find. Never invent numbers.
- app: string (the source app's name)
- memberSince: "YYYY-MM-DD" (when the account was created)
- currentStreak, longestStreak: whole numbers (days)
- lastActive: "YYYY-MM-DD" (last day they trained/logged)
- xp, coins, totalSessions: whole numbers
- weeklyGoal: 1-7 (sessions per week target)
- personalBests: [{ exercise, weightKg, reps }]   (use kg; convert from lb if needed)
- history: [{ date:"YYYY-MM-DD", volumeKg?, distanceKm?, durationMin? }]
- bodyStats: [{ date:"YYYY-MM-DD", weightKg?, waistCm?, bodyFatPct?, chestCm?, armCm?, thighCm?, hipCm? }]
- achievements: [string]`;

/** The exact prompt the user copies and hands to any AI assistant. */
export const AI_CONVERT_PROMPT = `You are converting my fitness/streak progress from another app into a strict JSON format.

I will paste an export, a CSV, or describe a screenshot of my stats. Convert it into ONE JSON object using EXACTLY these keys (omit any you can't find — do NOT make up values):

${SCHEMA_HINT}

Rules:
- Output ONLY the JSON object, no prose, no code fences.
- Use metric units (kg, cm, km). Convert pounds→kg (÷2.205) and miles→km (×1.609) yourself.
- Dates must be "YYYY-MM-DD".
- If a number isn't shown, leave the key out rather than guessing.

Example of the exact shape I want back:
${JSON.stringify(EXAMPLE_EXPORT, null, 2)}

Here is my data:
<<< PASTE YOUR EXPORT / CSV / SCREENSHOT DESCRIPTION HERE >>>`;

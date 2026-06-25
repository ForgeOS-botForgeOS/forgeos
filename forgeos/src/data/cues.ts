import type { Exercise } from '../types';

// Per-exercise coaching, derived from the movement pattern in the name (plus
// equipment + primary muscle). With 1000 exercises we can't hand-write each, so
// we match the pattern and assemble specific, useful cues: how to set up and
// execute, a tempo/breathing cue, and the single most common mistake.
export interface ExerciseCues {
  pattern: string; // human label, e.g. "Horizontal press"
  steps: string[]; // 2–4 ordered how-to cues
  breathing: string;
  mistake: string; // the classic error to avoid
}

interface PatternDef {
  label: string;
  // lowercase keywords that identify the movement in the exercise name
  match: RegExp;
  steps: string[];
  breathing: string;
  mistake: string;
}

// Order matters — the first pattern that matches wins, so put more specific
// movements (deadlift, hip thrust) before broad ones (press, raise).
const PATTERNS: PatternDef[] = [
  {
    label: 'Hip hinge / deadlift',
    match: /deadlift|rdl|romanian|good ?morning|hinge|hip thrust|pull-?through|kettlebell swing|swing/,
    steps: [
      'Brace your core and set a flat back — chest proud, lats tight.',
      'Push your hips back to load the hamstrings, keeping the bar/weight close to your body.',
      'Drive the floor away and snap your hips through to lockout — squeeze the glutes at the top.',
    ],
    breathing: 'Take a big breath and brace at the top, hold it through the rep, exhale at lockout.',
    mistake: 'Rounding the lower back or turning it into a squat — keep the shins vertical and hinge from the hips.',
  },
  {
    label: 'Squat / knee bend',
    match: /squat|lunge|split squat|step-?up|leg press|hack|sissy|pistol|bulgarian/,
    steps: [
      'Set feet about shoulder-width, brace your core, and keep your whole foot planted.',
      'Sit down and back with control, knees tracking over your toes, depth to at least parallel.',
      'Drive up through mid-foot, keeping your chest up the whole way.',
    ],
    breathing: 'Inhale and brace at the top, hold through the bottom, exhale as you stand.',
    mistake: 'Knees caving in or heels lifting — push the knees out and keep weight mid-foot.',
  },
  {
    label: 'Vertical press',
    match: /overhead|ohp|shoulder press|military|push press|arnold|landmine press/,
    steps: [
      'Stack the bar/dumbbells over your shoulders, squeeze glutes and brace to lock the ribcage.',
      'Press straight overhead, moving your head slightly back then through as the weight passes.',
      'Finish with biceps by the ears and the weight stacked over mid-foot.',
    ],
    breathing: 'Breathe in and brace before the rep, exhale near the top.',
    mistake: 'Over-arching the lower back to fake the press — keep ribs down and glutes tight.',
  },
  {
    label: 'Horizontal press',
    match: /bench|chest press|push-?up|dip|fly|flye|pec deck|floor press/,
    steps: [
      'Set the shoulder blades back and down, keep them pinned for the whole set.',
      'Lower under control to the chest with elbows tucked ~45°.',
      'Press up and slightly back, driving through the mid-chest.',
    ],
    breathing: 'Inhale on the way down, exhale as you press.',
    mistake: 'Flaring the elbows straight out to 90° — tuck them to protect the shoulders.',
  },
  {
    label: 'Vertical pull',
    match: /pull-?up|chin-?up|pulldown|lat pull|pull ?down/,
    steps: [
      'Start from a full hang/stretch, then pull your shoulder blades down first.',
      'Drive your elbows down and back, bringing the bar toward your upper chest.',
      'Control the negative all the way back to the stretch.',
    ],
    breathing: 'Exhale as you pull, inhale on the way back up.',
    mistake: 'Using momentum/kipping or stopping halfway — own the full range with the lats.',
  },
  {
    label: 'Horizontal pull / row',
    match: /row|face ?pull|rear delt|reverse fly|inverted/,
    steps: [
      'Hinge or set your torso, keep a neutral spine and proud chest.',
      'Lead with the elbows, pulling toward your lower ribs and squeezing the shoulder blades.',
      'Lower under control to a full stretch without losing back position.',
    ],
    breathing: 'Exhale as you row, inhale as you lower.',
    mistake: 'Yanking with the lower back and shrugging — keep the torso still and drive the elbows.',
  },
  {
    label: 'Biceps curl',
    match: /curl/,
    steps: [
      'Pin your elbows by your sides and keep your shoulders back.',
      'Curl up by contracting the biceps — no swinging at the shoulder.',
      'Squeeze at the top, then lower slowly to a full stretch.',
    ],
    breathing: 'Exhale as you curl up, inhale as you lower.',
    mistake: 'Swinging the weight up with the hips — slow the eccentric and let the biceps do the work.',
  },
  {
    label: 'Triceps extension',
    match: /tricep|pushdown|push-?down|skull|overhead extension|kickback|french press|extension/,
    steps: [
      'Keep your upper arm fixed — only the forearm moves.',
      'Extend fully and squeeze the triceps at lockout.',
      'Control the stretch back without letting the elbow drift.',
    ],
    breathing: 'Exhale as you extend, inhale on the return.',
    mistake: 'Letting the elbows flare and drift forward — keep them tight and still.',
  },
  {
    label: 'Lateral / front raise',
    match: /lateral raise|side raise|front raise|raise|lateral/,
    steps: [
      'Soft bend in the elbows, lead with the elbows not the hands.',
      'Raise to about shoulder height — pour-the-jug feel for side raises.',
      'Lower slowly; resist the weight on the way down.',
    ],
    breathing: 'Exhale as you raise, inhale as you lower.',
    mistake: 'Using momentum and going too heavy — lighter and controlled hits the delts far better.',
  },
  {
    label: 'Calf raise',
    match: /calf|calves|toe press/,
    steps: [
      'Get a full stretch at the bottom, heels dropped below the platform.',
      'Press onto the balls of your feet to the highest point.',
      'Pause at the top and lower slowly for a deep stretch.',
    ],
    breathing: 'Exhale as you press up, inhale on the stretch.',
    mistake: 'Bouncing with a short range — pause top and bottom for the full stretch.',
  },
  {
    label: 'Core / anti-extension',
    match: /plank|crunch|sit-?up|leg raise|hollow|ab |abs|rollout|woodchop|russian twist|dead ?bug|hanging|hyperextension|back extension|superman/,
    steps: [
      'Set a neutral spine and brace your abs before moving.',
      'Move slowly and deliberately — quality of contraction over reps.',
      'Avoid yanking on the neck; keep the movement in the trunk.',
    ],
    breathing: 'Exhale hard as you crunch/brace, breathe shallow to keep tension.',
    mistake: 'Rushing reps and pulling with the hip flexors or neck — slow down and own the core.',
  },
  {
    label: 'Conditioning / cardio',
    match: /run|row|bike|erg|sprint|jump|carry|sled|burpee|battle|skip/,
    steps: [
      'Settle into a sustainable rhythm and posture you can repeat.',
      'Keep your breathing steady and your stride/stroke smooth.',
      'Finish strong but don’t blow up in the first minute.',
    ],
    breathing: 'Rhythmic nasal-in, mouth-out breathing keeps you in control.',
    mistake: 'Going out far too hard and fading — pace the effort.',
  },
];

const FALLBACK: Omit<ExerciseCues, 'pattern'> = {
  steps: [
    'Set a stable position and brace your core before you move.',
    'Control the weight through a full range of motion.',
    'Squeeze the target muscle at the peak and resist the lowering phase.',
  ],
  breathing: 'Exhale on the effort (the hard part), inhale on the return.',
  mistake: 'Using momentum or cutting the range short — slow it down and feel the target muscle.',
};

export function cuesFor(ex: Exercise): ExerciseCues {
  const name = ex.name.toLowerCase();
  const hay = `${name} ${ex.equipment.toLowerCase()}`;
  const hit = PATTERNS.find((p) => p.match.test(hay));
  if (hit) {
    return { pattern: hit.label, steps: hit.steps, breathing: hit.breathing, mistake: hit.mistake };
  }
  return { pattern: `${ex.primary} focus`, ...FALLBACK };
}

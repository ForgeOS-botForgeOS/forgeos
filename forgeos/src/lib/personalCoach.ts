import type { UserProfile } from '../types';

// Turn what the user told us about themselves (their onboarding answers, the
// goal they picked, and anything they typed in their own words) into a couple
// of tailored coaching lines. Pure arithmetic over the profile — no AI — so it
// can't hallucinate, and it re-reads the same free text they wrote so the advice
// genuinely reflects *them*, not a generic template.

export interface PersonalTip {
  icon: string;
  text: string;
}

const GOAL_TIP: Record<UserProfile['goal'], PersonalTip> = {
  lose: { icon: '🔥', text: 'You’re here to lose fat — keep protein high and lean on the calorie ring; the scale follows the deficit, not the sweat.' },
  gain: { icon: '📈', text: 'Building size means eating in a surplus and adding a little weight or a rep most weeks — let progressive overload do the work.' },
  strength: { icon: '🏋️', text: 'Chasing strength — live in the low-rep, heavy range and rest fully between sets; the periodisation engine will steer your blocks.' },
  recomp: { icon: '⚖️', text: 'Recomp is the long game: hold calories near maintenance, push protein, and trust the mirror over the scale.' },
  maintain: { icon: '🧭', text: 'Maintenance is about rhythm — showing up beats intensity here. Your week streak is the metric that matters.' },
};

const ENEMY_TIP: Record<string, PersonalTip> = {
  Motivation: { icon: '🔗', text: 'You said motivation is the enemy — that’s exactly what the streak and quests are for. Never miss twice.' },
  Time: { icon: '⏱️', text: 'Short on time? Use “Repeat last session” and supersets — 30 focused minutes beats a skipped hour.' },
  'Knowing what to do': { icon: '🗺️', text: 'Not sure what to do? Just start today’s planned session — every set is laid out, weights pre-filled.' },
  Plateaus: { icon: '🧱', text: 'Plateaus frustrate you — watch the Plateau breaker card; it flags stalls and hands you the exact fix.' },
  'Recovery & sleep': { icon: '😴', text: 'Recovery is your weak point — the readiness score reads last night’s sleep and dials today’s load for you.' },
};

/** Constraints the user typed (bad knees, limited time…) → a safety-first line. */
function constraintTip(profile: UserProfile): PersonalTip | null {
  const text = `${profile.specialRequest ?? ''} ${profile.about ?? ''}`.toLowerCase();
  if (!text.trim()) return null;
  const joints = ['knee', 'kolen', 'back', 'chrbt', 'shoulder', 'rameno', 'wrist', 'elbow', 'hip', 'ankle'];
  if (joints.some((j) => text.includes(j))) {
    return { icon: '🩹', text: 'We noted your niggle — if a movement hurts, tap the ↻ swap button for a joint-friendly alternative, no ego needed.' };
  }
  if (/(no time|short on time|busy|malo casu|nemam cas)/.test(text)) {
    return { icon: '⏱️', text: 'You mentioned time is tight — the app remembers your last weights, so you can rack up a full session fast.' };
  }
  return null;
}

const EXPERIENCE_TIP: Record<UserProfile['experience'], PersonalTip> = {
  beginner: { icon: '🌱', text: 'As a beginner your fastest wins come from form and just turning up — the ghost overlay shows last week’s target on every set.' },
  intermediate: { icon: '⚙️', text: 'You’re past the basics — let the periodisation engine cycle your blocks so progress doesn’t stall.' },
  advanced: { icon: '🎯', text: 'You know your numbers — lean on e1RM tracking and the PR hall of fame to squeeze out the last few percent.' },
};

const SEP = ' · ';

// Every remaining ice-breaker answer earns a tailored line, so nothing the user
// picked is collected and ignored. Keyed by question id → chosen option.
const QUIZ_TIP: Record<string, Record<string, PersonalTip>> = {
  why: {
    'Get visibly stronger': { icon: '💪', text: 'You came to get stronger — live in the low-rep heavy range and watch your e1RM climb.' },
    'Drop body fat': { icon: '🔥', text: 'You’re here to lean out — the calorie ring + high protein do the work; training keeps the muscle.' },
    'Build the physique': { icon: '🏛️', text: 'Physique is the goal — chase a rep or a little weight most weeks and let the mirror judge, not the scale.' },
    'Mental health & routine': { icon: '🧠', text: 'You train for your head too — the week streak is your anchor; consistency beats intensity.' },
    'Compete one day': { icon: '🏆', text: 'Competing one day? Treat every session as practice — log RPE honestly and let periodisation peak you.' },
  },
  food: {
    Chaos: { icon: '🍕', text: 'Nutrition’s chaotic — start with one habit: hit protein. The photo scanner makes logging a snap.' },
    'I eyeball it': { icon: '👀', text: 'You eyeball food — the barcode scanner gives exact macros on the stuff you eat most.' },
    'I track sometimes': { icon: '📊', text: 'You track on and off — the daily macro ring makes it a 5-second habit; consistency > precision.' },
    'I weigh and log everything': { icon: '⚖️', text: 'You log everything — lean on the recomp calculator to retune targets as your weight moves.' },
  },
  music: {
    'Hard rock / metal': { icon: '🎸', text: 'Metalhead — queue “Forge Heavy” in the player and let the vinyl spin while you lift.' },
    'Hip-hop': { icon: '🎧', text: 'Hip-hop lifter — “PR Energy” is your playlist; start it from the CD player any time.' },
    EDM: { icon: '🚀', text: 'EDM keeps you moving — “Hypertrophy Flow” pairs with high-rep days in the player.' },
    'Whatever hits': { icon: '🔀', text: 'Easy on music — hit play in the mini CD player and let it ride.' },
    'Silence, I focus': { icon: '🤫', text: 'You lift in silence — no judgement; the player’s one tap away on the days you want a push.' },
  },
  reward: {
    'Hitting PRs': { icon: '🏆', text: 'PRs are your fuel — the PR Hall of Fame and the new PR celebration are built to make each one land.' },
    'Seeing the streak grow': { icon: '🔥', text: 'The streak keeps you here — protect it; a streak freeze in the shop covers the odd bad week.' },
    'Beating friends': { icon: '⚔️', text: 'You’re competitive — challenge a friend to a duel or a live race from the Social tab.' },
    'The mirror': { icon: '🪞', text: 'The mirror’s your judge — log weigh-ins and let the trend line, not one day, tell the story.' },
    'Just the habit': { icon: '🧭', text: 'You’re in it for the habit — showing up is the whole game; the week streak is your scoreboard.' },
  },
  social: {
    'Solo always': { icon: '🎧', text: 'You train solo — the app is your spotter: ghost targets, rest pill, and the coach have your back.' },
    'With a partner': { icon: '🤝', text: 'Got a partner? Add them as a friend and run a live race — train side by side in real time.' },
    'Group classes': { icon: '👥', text: 'Group person — the feed and step race keep that social energy going between classes.' },
    'Online community': { icon: '🌐', text: 'You like community — share PRs to the feed and compare on the friends leaderboard.' },
  },
  pace: {
    'Slow and bulletproof': { icon: '🐢', text: 'Slow and steady — small jumps, full recovery; the overload prompts will nudge you gently.' },
    Balanced: { icon: '⚖️', text: 'Balanced progress — add a rep or a little weight when a set feels easy; the app flags when you’re ready.' },
    'Aggressive, I’ll grind': { icon: '⚡', text: 'You’ll grind — push the top sets, but heed the load-spike and overtraining warnings so you don’t dig a hole.' },
  },
};

// Day-of-year seed so the rotating flavour tips change daily.
function daySeed(): number {
  return Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000);
}

/**
 * Up to `max` tailored tips. The strongest signals lead and stay deterministic:
 * constraints they typed → stated enemy → goal. Then a flavour pool drawn from
 * every *other* answer they gave (why / food / music / reward / social / pace),
 * rotated by the day so nothing they picked stays unused — and experience last.
 * De-duplicated by text.
 */
export function personalTips(profile: UserProfile | null | undefined, max = 2, seed = daySeed()): PersonalTip[] {
  if (!profile) return [];
  const out: PersonalTip[] = [];
  const push = (t: PersonalTip | null | undefined) => { if (t && !out.some((o) => o.text === t.text)) out.push(t); };
  const answer = (id: string) => profile.quizAnswers?.[id]?.split(SEP)[0];

  // Strong, deterministic leaders.
  push(constraintTip(profile));
  const enemy = answer('enemy');
  if (enemy) push(ENEMY_TIP[enemy]);
  push(GOAL_TIP[profile.goal]);

  // Flavour pool from every other answer, rotated daily so all of them surface.
  const flavour: PersonalTip[] = [];
  for (const id of Object.keys(QUIZ_TIP)) {
    const a = answer(id);
    if (a && QUIZ_TIP[id][a]) flavour.push(QUIZ_TIP[id][a]);
  }
  if (flavour.length) {
    const off = ((seed % flavour.length) + flavour.length) % flavour.length;
    for (let k = 0; k < flavour.length; k++) push(flavour[(off + k) % flavour.length]);
  }

  push(EXPERIENCE_TIP[profile.experience]);

  return out.slice(0, Math.max(0, max));
}

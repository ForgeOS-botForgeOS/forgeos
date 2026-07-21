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

/**
 * Up to `max` tailored tips, strongest-signal first: constraints they typed →
 * their stated enemy → their goal → their experience. De-duplicated by text.
 */
export function personalTips(profile: UserProfile | null | undefined, max = 2): PersonalTip[] {
  if (!profile) return [];
  const out: PersonalTip[] = [];
  const push = (t: PersonalTip | null) => { if (t && !out.some((o) => o.text === t.text)) out.push(t); };

  push(constraintTip(profile));
  const enemy = profile.quizAnswers?.['enemy']?.split(' · ')[0];
  if (enemy && ENEMY_TIP[enemy]) push(ENEMY_TIP[enemy]);
  push(GOAL_TIP[profile.goal]);
  push(EXPERIENCE_TIP[profile.experience]);

  return out.slice(0, Math.max(0, max));
}

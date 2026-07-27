import { searchHelp } from './knowledge';
import { pickSpecialist, type SpecialistId } from './specialists';
import type { TrainerSnapshot } from './context';

// ---- The trainer with no AI behind it ----
// Mock-first is the house rule: the feature has to be useful before any key is
// configured, offline, and when every provider is down. This is not a fake
// model — it answers from the app's own manual and the user's real numbers, and
// it says plainly that it is the offline version.

export interface OfflineAnswer {
  specialist: SpecialistId;
  text: string;
}

function proteinAdvice(s: TrainerSnapshot): string {
  const target = s.macros?.proteinG;
  const logged = s.todayProteinG ?? 0;
  if (!target) return 'Aim for about 1.8–2.2 g of protein per kg of body weight, spread over four meals.';
  const left = Math.max(0, target - logged);
  const perKg = s.weightKg ? Math.round((target / s.weightKg) * 10) / 10 : null;
  return left > 0
    ? `Your target is ${target} g${perKg ? ` (${perKg} g/kg)` : ''} and you have logged ${logged} g today — ${left} g to go. That is roughly ${Math.ceil(left / 25)} more protein-led servings: quark, chicken, tuna, or a shake.`
    : `You are at ${logged} g against a ${target} g target — that is done for today. Hold that most days and protein stops being the limiting factor.`;
}

function trainingAdvice(s: TrainerSnapshot): string {
  const bits: string[] = [];
  if (s.sessionsLast7 === 0) bits.push('You have not logged a session in the last 7 days. The first one back should be deliberately easy — same exercises, about 20% lighter, stop two reps short.');
  else bits.push(`You have trained ${s.sessionsLast7}× in the last 7 days (${s.sessionsLast28} in 28).`);
  if (s.plateauLifts?.length) bits.push(`${s.plateauLifts[0]} has stalled — swap in a variation for two weeks or run one lighter week, then re-test.`);
  else if (s.topPrs.length) bits.push(`Your best lift on record is ${s.topPrs[0].exerciseName} at ${s.topPrs[0].weightKg} kg × ${s.topPrs[0].reps}. If last session felt like an 8 or less, add 2.5 kg; otherwise add a rep first.`);
  if (s.nextPlanned) bits.push(`Next planned: ${s.nextPlanned}.`);
  return bits.join(' ');
}

function recoveryAdvice(s: TrainerSnapshot): string {
  const bits: string[] = [];
  if (s.avgSleepH) {
    bits.push(
      s.avgSleepH < 7
        ? `You are averaging ${Math.round(s.avgSleepH * 10) / 10} h of sleep. That is the single biggest thing holding your recovery back — an extra 45 minutes will do more than any change to your programme.`
        : `Sleep is averaging ${Math.round(s.avgSleepH * 10) / 10} h, which is solid.`,
    );
  }
  if (s.readiness) bits.push(`Readiness is ${s.readiness}/100. ${s.readiness < 45 ? 'Treat today as technique work or a rest day.' : s.readiness < 70 ? 'Train, but keep the top sets honest rather than heroic.' : 'Good day to push a top set.'}`);
  if (s.sessionsLast7 >= 6) bits.push('Six or more sessions in a week with no easy day is where niggles start. Put one deliberately light day in.');
  if (!bits.length) bits.push('No sleep or readiness data synced yet, so the honest answer is: if you slept badly and feel flat, train lighter and keep the habit.');
  return bits.join(' ');
}

function nutritionAdvice(s: TrainerSnapshot): string {
  const bits = [proteinAdvice(s)];
  if (s.macros && s.todayKcal !== undefined) {
    const left = s.macros.calories - s.todayKcal;
    bits.push(left > 0 ? `Calories: ${s.todayKcal} of ${s.macros.calories} logged, ${left} left.` : `Calories: ${s.todayKcal} logged against a ${s.macros.calories} target.`);
  }
  if ((s.waterMl ?? 0) < 1500 && s.weightKg) bits.push(`Water is at ${s.waterMl ?? 0} ml — aim for about ${Math.round((s.weightKg * 35) / 100) * 100} ml on a training day.`);
  bits.push('Food tab → Nutrition plan gives you the full split for your goal, and the Cookbook has 107 recipes filtered to it.');
  return bits.join(' ');
}

/**
 * Answer without a model: the app manual for app questions, the user's own
 * numbers for everything else.
 */
export function offlineAnswer(question: string, s: TrainerSnapshot): OfflineAnswer {
  const specialist = pickSpecialist(question);

  if (specialist === 'app') {
    const hits = searchHelp(question, 2);
    if (hits.length) {
      return { specialist, text: hits.map((h) => `**${h.title}** — ${h.answer}`).join('\n\n') };
    }
    return {
      specialist,
      text: 'I could not find that in the app manual. Try naming the feature (races, achievements, cookbook, Garmin, themes, backups) and I will point you at the screen.',
    };
  }

  const text =
    specialist === 'nutrition' ? nutritionAdvice(s)
      : specialist === 'recovery' ? recoveryAdvice(s)
        : trainingAdvice(s);

  return { specialist, text };
}

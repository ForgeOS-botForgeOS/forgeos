import { describe, it, expect } from 'vitest';
import { buildUserContext, contextDisclosure, type TrainerSnapshot } from './context';
import { APP_HELP, helpContext, searchHelp } from './knowledge';
import { SHARED_RULES, SPECIALIST_LIST, STARTERS, buildSystemPrompt, pickSpecialist } from './specialists';
import { screenQuestion } from './guardrails';
import { offlineAnswer } from './offline';
import { TRAINER_AGREEMENT, TRAINER_AGREEMENT_VERSION } from '../../data/trainerAgreement';
import type { PR, Workout } from '../../types';

const WORKOUT: Workout = {
  id: 'w1',
  name: 'Push day',
  date: '2026-07-26T18:00:00.000Z',
  completed: true,
  totalVolumeKg: 4200,
  exercises: [{ id: 'we1', exerciseId: 'bench', sets: [{ id: 's1', weightKg: 80, reps: 8, completed: true }] }],
};

const PR_BENCH: PR = {
  id: 'p1', exerciseId: 'bench', exerciseName: 'Bench Press', weightKg: 90, reps: 5, e1rm: 101, date: '2026-07-20',
};

const SNAP: TrainerSnapshot = {
  firstName: 'Peter',
  age: 15,
  sex: 'male',
  heightCm: 178,
  weightKg: 72,
  goal: 'recomp',
  activity: 'moderate',
  experience: 'intermediate',
  tdee: 2600,
  macros: { calories: 2700, proteinG: 158, carbsG: 300, fatG: 70 },
  quizAnswers: { biggestEnemy: 'skipping leg day', trainingDays: '4', motivation: 'get stronger for football' },
  about: 'I want to get strong without getting slow.',
  diet: 'omnivore',
  language: 'en',
  sessionsLast7: 4,
  sessionsLast28: 15,
  weekStreak: 6,
  recentWorkouts: [WORKOUT],
  topPrs: [PR_BENCH],
  avgSleepH: 6.4,
  readiness: 58,
  todayKcal: 1500,
  todayProteinG: 90,
  waterMl: 900,
  memory: ['my left knee clicks on deep squats'],
};

describe('buildUserContext', () => {
  it('includes the numbers a coach needs', () => {
    const ctx = buildUserContext(SNAP);

    expect(ctx).toContain('Goal: recomp');
    expect(ctx).toContain('72');
    expect(ctx).toContain('2600');
    expect(ctx).toContain('Bench Press');
    expect(ctx).toContain('Push day');
  });

  it('includes the onboarding quiz answers — the point of the feature', () => {
    const ctx = buildUserContext(SNAP);

    expect(ctx).toContain('skipping leg day');
    expect(ctx).toContain('get stronger for football');
    expect(ctx).toContain('I want to get strong without getting slow.');
  });

  it('includes what the user asked it to remember', () => {
    expect(buildUserContext(SNAP)).toContain('left knee clicks');
  });

  it('never leaks identifying data even when the snapshot is built carelessly', () => {
    const ctx = buildUserContext({
      ...SNAP,
      // Fields that do not exist on the snapshot type cannot be sent — this
      // asserts the shape stays closed if someone widens it later.
      ...({ email: 'petosupix@gmail.com', id: 'user-123', friendCode: 'FORGE-99' } as Partial<TrainerSnapshot>),
    });

    expect(ctx).not.toContain('@');
    expect(ctx).not.toContain('user-123');
    expect(ctx).not.toContain('FORGE-99');
  });

  it('stays small enough to send on every message', () => {
    const huge: TrainerSnapshot = {
      ...SNAP,
      about: 'x'.repeat(5000),
      recentWorkouts: Array.from({ length: 50 }, (_, i) => ({ ...WORKOUT, id: `w${i}` })),
      topPrs: Array.from({ length: 40 }, (_, i) => ({ ...PR_BENCH, id: `p${i}` })),
      memory: Array.from({ length: 40 }, (_, i) => `fact ${i}`),
      quizAnswers: Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`q${i}`, 'y'.repeat(300)])),
    };

    expect(buildUserContext(huge).length).toBeLessThanOrEqual(2700);
  });

  it('survives an almost-empty profile', () => {
    const ctx = buildUserContext({ goal: 'lose', diet: 'omnivore', language: 'en', sessionsLast7: 0, sessionsLast28: 0, recentWorkouts: [], topPrs: [] });
    expect(ctx).toContain('Goal: lose');
    expect(ctx.length).toBeGreaterThan(20);
  });
});

describe('contextDisclosure', () => {
  it('lists what is sent, including the messages themselves', () => {
    const items = contextDisclosure(SNAP);

    expect(items.join(' | ')).toContain('quiz answers');
    expect(items.join(' | ')).toContain('recent sessions');
    expect(items.some((i) => i.includes('messages you type'))).toBe(true);
  });

  it('does not promise to send data the user has none of', () => {
    const items = contextDisclosure({ goal: 'lose', diet: 'vegan', language: 'sk', sessionsLast7: 0, sessionsLast28: 0, recentWorkouts: [], topPrs: [] });
    expect(items.join(' ')).not.toContain('recent sessions');
    expect(items.join(' ')).not.toContain('best lifts');
  });
});

describe('the app manual', () => {
  it('gives every entry keywords and a real answer', () => {
    for (const e of APP_HELP) {
      expect(e.keywords.length, e.id).toBeGreaterThan(2);
      expect(e.answer.length, e.id).toBeGreaterThan(80);
    }
  });

  it('finds the right entry for app questions', () => {
    expect(searchHelp('how do achievement rewards work')[0].id).toBe('achievements');
    expect(searchHelp('where are the recipes')[0].id).toBe('cookbook');
    expect(searchHelp('how does the streak work')[0].id).toBe('streak');
    expect(searchHelp('how do I start a race with a friend')[0].id).toBe('race');
    expect(searchHelp('garmin sleep sync')[0].id).toBe('garmin');
  });

  it('returns nothing rather than noise for an unrelated question', () => {
    expect(searchHelp('what is the capital of france')).toEqual([]);
    expect(helpContext('what is the capital of france')).toBe('');
  });
});

describe('pickSpecialist', () => {
  it('routes training questions to the strength coach', () => {
    expect(pickSpecialist('my bench press has stalled, what should I do')).toBe('training');
    expect(pickSpecialist('how many sets per week for hypertrophy')).toBe('training');
  });

  it('routes food questions to the nutrition coach', () => {
    expect(pickSpecialist('am I eating enough protein')).toBe('nutrition');
    expect(pickSpecialist('what should I eat before training')).toBe('nutrition');
  });

  it('routes tiredness to the recovery coach', () => {
    expect(pickSpecialist('I feel exhausted and my sleep is bad')).toBe('recovery');
    expect(pickSpecialist('should I take a rest day')).toBe('recovery');
  });

  it('routes app questions to the app guide', () => {
    expect(pickSpecialist('how do I change the theme')).toBe('app');
    expect(pickSpecialist('where is the shopping list')).toBe('app');
    expect(pickSpecialist('how does xp work')).toBe('app');
  });

  it('falls back to training for something with no signal', () => {
    expect(pickSpecialist('hello')).toBe('training');
  });
});

describe('buildSystemPrompt', () => {
  it('carries the shared rules, the persona and the user context', () => {
    const prompt = buildSystemPrompt({ specialist: 'nutrition', userContext: buildUserContext(SNAP), language: 'en' });

    expect(prompt).toContain('Nutrition coach');
    expect(prompt).toContain(SHARED_RULES);
    expect(prompt).toContain('skipping leg day');
  });

  it('always states the minor-safety rules', () => {
    for (const s of SPECIALIST_LIST) {
      const prompt = buildSystemPrompt({ specialist: s.id, userContext: 'x', language: 'en' });
      expect(prompt.toLowerCase(), s.id).toContain('minor');
      expect(prompt.toLowerCase(), s.id).toContain('not a doctor');
      expect(prompt.toLowerCase(), s.id).toContain('metric');
    }
  });

  it('asks for Slovak when the app is in Slovak', () => {
    expect(buildSystemPrompt({ specialist: 'app', userContext: 'x', language: 'sk' })).toContain('Slovak');
  });

  it('only pastes the manual for app questions', () => {
    const withHelp = buildSystemPrompt({ specialist: 'app', userContext: 'x', helpContext: '- Streak: weekly', language: 'en' });
    const without = buildSystemPrompt({ specialist: 'training', userContext: 'x', language: 'en' });

    expect(withHelp).toContain('ForgeOS manual');
    expect(without).not.toContain('ForgeOS manual');
  });

  it('gives every starter question a specialist that exists', () => {
    for (const s of STARTERS) expect(SPECIALIST_LIST.map((x) => x.id)).toContain(s.specialist);
  });
});

describe('guardrails', () => {
  it('never sends self-harm messages to a model, and points at real help', () => {
    const v = screenQuestion('i want to kill myself');

    expect(v.allow).toBe(false);
    expect(v.category).toBe('crisis');
    expect(v.reply).toContain('116 111');
  });

  it('refuses disordered-eating help supportively', () => {
    for (const q of ['how do I purge after eating', 'should I starve myself to lose weight', 'best laxative for weight loss']) {
      const v = screenQuestion(q);
      expect(v.allow, q).toBe(false);
      expect(v.category, q).toBe('disordered-eating');
    }
  });

  it('refuses steroids and SARMs outright', () => {
    for (const q of ['what steroid cycle should I run', 'are sarms safe at 15', 'where do I buy testosterone']) {
      expect(screenQuestion(q).allow, q).toBe(false);
      expect(screenQuestion(q).category, q).toBe('peds');
    }
  });

  it('sends injuries to a professional instead of guessing', () => {
    const v = screenQuestion('my knee hurts and clicks when I squat, what is the diagnosis');

    expect(v.allow).toBe(false);
    expect(v.category).toBe('medical');
    expect(v.reply?.toLowerCase()).toContain('physiotherapist');
  });

  it('refuses crash diets but offers the safe version', () => {
    const v = screenQuestion('how do I lose 10kg in 2 weeks');

    expect(v.allow).toBe(false);
    expect(v.category).toBe('extreme-cut');
    expect(v.reply?.toLowerCase()).toContain('moderate');
  });

  it('declines homework and keeps the scope', () => {
    expect(screenQuestion('write my essay about the cold war').allow).toBe(false);
    expect(screenQuestion('write python code for a web server').category).toBe('off-topic');
  });

  it('lets ordinary questions through untouched', () => {
    for (const q of ['how many sets should I do for chest', 'what should I eat after training', 'is 6 hours of sleep enough']) {
      expect(screenQuestion(q).allow, q).toBe(true);
    }
  });

  it('adds a caution note for soft topics without blocking them', () => {
    const sore = screenQuestion('my legs are really sore after squats');
    expect(sore.allow).toBe(true);
    expect(sore.note?.toLowerCase()).toContain('soreness');

    const supp = screenQuestion('should I take creatine');
    expect(supp.allow).toBe(true);
    expect(supp.note?.toLowerCase()).toContain('food first');
  });
});

describe('the offline trainer', () => {
  it('answers app questions from the manual', () => {
    const a = offlineAnswer('how do achievement rewards work', SNAP);

    expect(a.specialist).toBe('app');
    expect(a.text.toLowerCase()).toContain('tier');
  });

  it('uses real numbers for nutrition', () => {
    const a = offlineAnswer('am I eating enough protein today', SNAP);

    expect(a.specialist).toBe('nutrition');
    expect(a.text).toContain('158');
    expect(a.text).toContain('90');
    expect(a.text).toContain('68'); // 158 - 90 still to go
  });

  it('calls out short sleep for recovery questions', () => {
    const a = offlineAnswer('I am exhausted, should I train', SNAP);

    expect(a.specialist).toBe('recovery');
    expect(a.text).toContain('6.4');
  });

  it('uses their own session count and PR for training questions', () => {
    const a = offlineAnswer('what should I change in my training', SNAP);

    expect(a.specialist).toBe('training');
    expect(a.text).toContain('4');
    expect(a.text).toContain('Bench Press');
  });

  it('says something useful with an empty profile instead of crashing', () => {
    const empty: TrainerSnapshot = { goal: 'lose', diet: 'omnivore', language: 'en', sessionsLast7: 0, sessionsLast28: 0, recentWorkouts: [], topPrs: [] };

    for (const q of ['what should I eat', 'how is my training', 'am I recovered', 'how do themes work']) {
      expect(offlineAnswer(q, empty).text.length, q).toBeGreaterThan(30);
    }
  });
});

describe('the user agreement', () => {
  it('is versioned so a change re-asks for consent', () => {
    expect(TRAINER_AGREEMENT_VERSION).toBeGreaterThanOrEqual(1);
  });

  it('covers the things it legally and honestly has to', () => {
    const all = TRAINER_AGREEMENT.map((s) => `${s.heading} ${s.body}`).join(' ').toLowerCase();

    expect(all).toContain('not medical advice');
    expect(all).toContain('under 18');
    expect(all).toContain('parent');
    expect(all).toContain('withdraw');
    expect(all).toContain('delete');
    expect(all).toContain('never sent'); // the exclusion list
    expect(all).toMatch(/groq|gemini|cloudflare/);
    expect(all).toContain('offline');
  });

  it('names what is never sent', () => {
    const exclusions = TRAINER_AGREEMENT.find((s) => s.heading.includes('never leaves'))!.body.toLowerCase();

    expect(exclusions).toContain('email');
    expect(exclusions).toContain('friend code');
    expect(exclusions).toContain('photo');
  });
});

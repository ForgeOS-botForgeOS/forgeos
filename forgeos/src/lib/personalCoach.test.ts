import { describe, it, expect } from 'vitest';
import { personalTips } from './personalCoach';
import type { UserProfile } from '../types';

function profile(over: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'me', name: 'Test', sex: 'male', age: 25, heightCm: 180, weightKg: 80,
    goal: 'recomp', activity: 'moderate', experience: 'beginner',
    tdee: 2600, bmr: 1800, macros: { calories: 2600, proteinG: 160, carbsG: 300, fatG: 70 },
    quizAnswers: {}, onboarded: true, ...over,
  } as UserProfile;
}

describe('personalTips', () => {
  it('returns nothing without a profile', () => {
    expect(personalTips(null)).toEqual([]);
    expect(personalTips(undefined)).toEqual([]);
  });

  it('leads with a joint-safety tip when the user typed an injury', () => {
    const tips = personalTips(profile({ about: 'bad knees, be careful' }));
    expect(tips[0].icon).toBe('🩹');
  });

  it('reflects the stated training enemy before the generic goal tip', () => {
    const tips = personalTips(profile({ quizAnswers: { enemy: 'Time' }, goal: 'gain' }), 2);
    expect(tips[0].text).toContain('time');
  });

  it('always gives a goal-specific tip', () => {
    expect(personalTips(profile({ goal: 'lose' }))[0].text.toLowerCase()).toContain('fat');
    expect(personalTips(profile({ goal: 'strength' }))[0].text.toLowerCase()).toContain('heavy');
  });

  it('respects the max count and de-duplicates', () => {
    const tips = personalTips(profile({ quizAnswers: { enemy: 'Motivation' } }), 3);
    expect(tips.length).toBeLessThanOrEqual(3);
    const texts = tips.map((t) => t.text);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('surfaces a time tip from free text even without a quiz answer', () => {
    const tips = personalTips(profile({ about: 'I am really busy and short on time' }));
    expect(tips.some((t) => t.text.toLowerCase().includes('fast') || t.text.toLowerCase().includes('time'))).toBe(true);
  });

  it('turns every extra quiz answer into a tip — nothing is collected and ignored', () => {
    // fixed seed for determinism; a wide max so the whole flavour pool shows.
    const tips = personalTips(
      profile({ quizAnswers: { music: 'Hip-hop', food: 'Chaos', reward: 'Hitting PRs', pace: 'Aggressive, I’ll grind', social: 'With a partner', why: 'Compete one day' } }),
      12,
      0,
    );
    const all = tips.map((t) => t.text).join(' | ');
    expect(all).toContain('PR Energy'); // music
    expect(all).toContain('protein'); // food = Chaos
    expect(all).toContain('PR Hall'); // reward
    expect(all).toContain('grind'); // pace = Aggressive
    expect(all).toContain('live race'); // social = With a partner
    expect(all).toContain('practice'); // why = Compete
  });
});

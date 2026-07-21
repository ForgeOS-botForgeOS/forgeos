import { describe, it, expect } from 'vitest';
import { parseAbout, parsedFieldCount } from './profileParser';

describe('parseAbout', () => {
  it('pulls age, height and weight out of a natural sentence', () => {
    const p = parseAbout("I'm 16 years old, 178cm and about 72kg");
    expect(p.age).toBe(16);
    expect(p.heightCm).toBe(178);
    expect(p.weightKg).toBe(72);
  });

  it('does not mistake a bodyweight for an age', () => {
    const p = parseAbout("I'm 80kg and want to build muscle");
    expect(p.age).toBeUndefined();
    expect(p.weightKg).toBe(80);
    expect(p.goal).toBe('gain');
  });

  it('reads height given in metres', () => {
    expect(parseAbout('height 1.83 m').heightCm).toBe(183);
  });

  it('accepts a comma decimal weight', () => {
    expect(parseAbout('I weigh 72,5 kg').weightKg).toBe(72.5);
  });

  it('maps goal keywords to the enum', () => {
    expect(parseAbout('I want to lose fat').goal).toBe('lose');
    expect(parseAbout('trying to get stronger for powerlifting').goal).toBe('strength');
    expect(parseAbout('body recomposition is the aim').goal).toBe('recomp');
    expect(parseAbout('just want to maintain where I am').goal).toBe('maintain');
  });

  it('infers experience level', () => {
    expect(parseAbout('total beginner, never lifted').experience).toBe('beginner');
    expect(parseAbout('been lifting 5 years, I know my numbers').experience).toBe('advanced');
    expect(parseAbout('on and off for a while').experience).toBe('intermediate');
  });

  it('detects sex only when stated', () => {
    expect(parseAbout('27 year old woman').sex).toBe('female');
    expect(parseAbout('I am a guy').sex).toBe('male');
    expect(parseAbout('just here to train').sex).toBeUndefined();
  });

  it('reads days per week in several phrasings', () => {
    expect(parseAbout('I can train 4 days a week').daysPerWeek).toBe(4);
    expect(parseAbout('able to lift 3x per week').daysPerWeek).toBe(3);
  });

  it('recognises a training style', () => {
    expect(parseAbout('big into calisthenics and pull ups').style).toBe('Calisthenics');
    expect(parseAbout('mostly running and endurance').style).toBe('Cardio');
  });

  it('collects injury and lifestyle constraints, de-duplicated', () => {
    const p = parseAbout('bad knees, sore knee, and I am short on time');
    expect(p.constraints).toContain('knees');
    expect(p.constraints).toContain('limited time');
    expect(p.constraints.filter((c) => c === 'knees')).toHaveLength(1);
  });

  it('returns an empty-ish result for junk input', () => {
    const p = parseAbout('hello there');
    expect(parsedFieldCount(p)).toBe(0);
    expect(p.constraints).toEqual([]);
  });

  it('understands a few Slovak words', () => {
    const p = parseAbout('mám 20 rokov, chcem schudnúť');
    expect(p.age).toBe(20);
    expect(p.goal).toBe('lose');
  });

  it('counts the fields it managed to fill', () => {
    const p = parseAbout("I'm 16, 178cm, 72kg, beginner, want to lose fat, bad knees");
    expect(parsedFieldCount(p)).toBeGreaterThanOrEqual(6);
  });
});

import { describe, expect, it } from 'vitest';
import { EXERCISES, EXERCISE_CATEGORIES, exerciseById, isLoadedLift } from './exercises';
import { MORE_EXERCISES } from './exercisesMore';
import { MACHINE_EXERCISES } from './exercisesMachines';
import { cuesFor } from './cues';

const MUSCLES = new Set(['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Full Body']);
const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

describe('exercise catalogue', () => {
  it('holds 2500 exercises: the original 1000, the second thousand and 500 machines', () => {
    expect(MORE_EXERCISES).toHaveLength(1000);
    expect(MACHINE_EXERCISES).toHaveLength(500);
    expect(EXERCISES).toHaveLength(2500);
  });

  it('keeps every id unique', () => {
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
  });

  it('never lists the same name twice', () => {
    // "Z-Press" and "Z Press" both shipped in the first thousand; saved workouts
    // point at both ids, so the pair stays. Nothing else may collide.
    const LEGACY = ['Z Press'];
    const seen = new Map<string, string>();
    const dupes = EXERCISES.filter((e) => {
      const k = key(e.name);
      if (seen.has(k)) return true;
      seen.set(k, e.name);
      return false;
    }).map((e) => e.name);
    expect(dupes).toEqual(LEGACY);
  });

  it('leaves the ids of the first thousand where saved workouts expect them', () => {
    // Ids are positional: appending must never renumber an existing exercise.
    expect(exerciseById('pow-1')?.name).toBe('Back Squat');
    expect(exerciseById('pow-3')?.name).toBe('Bench Press');
    expect(EXERCISES[999].name).toBe('Powell Raise');
    expect(EXERCISES[999].id).toBe('bod-1000');
    expect(EXERCISES[1000].id.endsWith('-1001')).toBe(true);
    expect(EXERCISES[1999].name).toBe(MORE_EXERCISES[999][0]);
    expect(EXERCISES[2000].id.endsWith('-2001')).toBe(true);
  });

  it('starts the second thousand with the most common lifts', () => {
    expect(EXERCISES[1000].name).toBe(MORE_EXERCISES[0][0]);
    expect(EXERCISES.slice(1000, 1010).map((e) => e.name)).toContain('Trap Bar Deadlift');
  });

  it('starts the machines with the Iso-Lateral line every gym has', () => {
    expect(EXERCISES[2000].name).toBe('Iso-Lateral Chest Press');
    const first20 = EXERCISES.slice(2000, 2020).map((e) => e.name);
    expect(first20).toContain('Iso-Lateral Front Lat Pulldown');
    // The Iso-Lateral High Row was already in the library, so it is not repeated.
    expect(EXERCISES.filter((e) => e.name === 'Iso-Lateral High Row')).toHaveLength(1);
  });

  it('gives every exercise a known category, muscle and some equipment', () => {
    for (const e of EXERCISES) {
      expect(EXERCISE_CATEGORIES).toContain(e.category);
      expect(MUSCLES.has(e.primary)).toBe(true);
      expect(e.secondary.every((m) => MUSCLES.has(m) && m !== e.primary)).toBe(true);
      expect(e.equipment.trim().length).toBeGreaterThan(0);
    }
  });

  it('adds a Mobility category of stretches that are not loaded lifts', () => {
    const mobility = EXERCISES.filter((e) => e.category === 'Mobility');
    expect(mobility.length).toBeGreaterThan(100);
    expect(mobility.some((e) => isLoadedLift(e))).toBe(false);
  });
});

describe('coaching cues for the new kinds of exercise', () => {
  const byName = (n: string) => EXERCISES.find((e) => e.name === n)!;

  it('coaches a stretch as a hold, not as a lift', () => {
    const cues = cuesFor(byName('Pigeon Pose'));
    expect(cues.pattern).toBe('Stretch hold');
    expect(cues.steps.join(' ')).not.toMatch(/weight/i);
  });

  it('matches stretches that sound like lifts to mobility cues', () => {
    expect(cuesFor(byName('Squat to Stand')).pattern).toBe('Dynamic mobility');
    expect(cuesFor(byName('Foam Roll Quads')).pattern).toBe('Soft-tissue release');
    expect(cuesFor(byName('Diaphragmatic Breathing')).pattern).toBe('Breathing drill');
  });

  it('coaches footwork drills and sports as conditioning, not lifting', () => {
    expect(cuesFor(byName('Agility Ladder Icky Shuffle')).pattern).toBe('Speed / agility');
    expect(cuesFor(byName('Tennis Match')).pattern).toBe('Conditioning / cardio');
  });

  it('coaches cardio machines as conditioning even when the name says row or fly', () => {
    expect(cuesFor(byName('Rowing 2k Test')).pattern).toBe('Conditioning / cardio');
    expect(cuesFor(byName('Swimming (Butterfly)')).pattern).toBe('Conditioning / cardio');
    expect(cuesFor(byName('Jacobs Ladder')).pattern).toBe('Conditioning / cardio');
  });

  it('coaches calf raises, leg raises and back extensions as what they are', () => {
    expect(cuesFor(byName('Standing Calf Raise')).pattern).toBe('Calf raise');
    expect(cuesFor(byName('Total Gym Calf Raise')).pattern).toBe('Calf raise');
    expect(cuesFor(byName('Hanging Leg Raise')).pattern).toBe('Core / anti-extension');
    expect(cuesFor(byName('GHD Back Extension')).pattern).toBe('Core / anti-extension');
    expect(cuesFor(byName('Cable Lateral Raise')).pattern).toBe('Lateral / front raise');
  });

  it('still coaches the lifts the way it did', () => {
    expect(cuesFor(byName('Back Squat')).pattern).toBe('Squat / knee bend');
    expect(cuesFor(byName('Trap Bar Deadlift')).pattern).toBe('Hip hinge / deadlift');
  });
});

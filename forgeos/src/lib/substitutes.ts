import type { Exercise } from '../types';

// Exercise substitution over the WHOLE library.
//
// The old engine returned the first eight catalogue entries sharing the primary
// muscle, so a library of 1000 offered the same eight lifts forever (88 chest
// exercises, the swap sheet showed the first 8 in file order). This ranks every
// candidate by how well it replaces the lift, lets you narrow by the equipment
// that is actually free, and searches the full library by name.

export type EquipFamily = 'Barbell' | 'Dumbbell' | 'Cable' | 'Machine' | 'Bodyweight' | 'Kettlebell' | 'Other';

export const EQUIP_FAMILIES: readonly EquipFamily[] = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Kettlebell', 'Other'];

const BARBELL = /barbell|bar\b|ssb|safety bar|football bar|cambered|trap bar|ez[ -]?bar|t-bar|landmine|yoke/i;
const MACHINE = /machine|hammer strength|smith|belt squat|reverse hyper|ghd|sled|prowler/i;
const BODYWEIGHT = /bodyweight|none|rings|parallettes|parallel bars|wall|bar$|low bar|step|box|bench|ab wheel|stability ball|hyper bench/i;

/** Collapses the catalogue's ~80 equipment strings into the handful you choose between at a busy gym. */
export function equipFamily(equipment: string): EquipFamily {
  const e = equipment.trim();
  if (/dumbbell/i.test(e)) return 'Dumbbell';
  if (/kettlebell/i.test(e)) return 'Kettlebell';
  if (/cable/i.test(e)) return 'Cable';
  if (MACHINE.test(e)) return 'Machine';
  // "Bar" alone is a pull-up bar; "Barbell", "EZ-Bar", "T-Bar" are loaded bars.
  if (/^bar$/i.test(e) || /^low bar$/i.test(e)) return 'Bodyweight';
  if (BARBELL.test(e)) return 'Barbell';
  if (BODYWEIGHT.test(e)) return 'Bodyweight';
  return 'Other';
}

/**
 * How good a stand-in `c` is for `base`. Same primary muscle is the entry
 * ticket; shared secondaries say the movement pattern overlaps; the same
 * training style and a core lift break ties toward the obvious choice.
 */
export function substituteScore(base: Exercise, c: Exercise): number {
  let score = 0;
  if (c.primary === base.primary) score += 10;
  for (const m of c.secondary) if (base.secondary.includes(m)) score += 2;
  if (c.secondary.includes(base.primary) || base.secondary.includes(c.primary)) score += 1;
  if (c.category === base.category) score += 1;
  if (c.isCore) score += 0.5;
  return score;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export interface SubstituteQuery {
  /** Free text. Empty = alternatives for the same primary muscle; otherwise the whole library. */
  query?: string;
  /** Only equipment of this family. */
  family?: EquipFamily | 'Any';
}

/**
 * Every usable replacement for `base`, best first. With no search text it is
 * the same-muscle list (all of it, not a slice); with search text any exercise
 * whose name, muscle or equipment matches every word, still ranked so the
 * same-muscle matches come first.
 */
export function rankSubstitutes(base: Exercise, pool: readonly Exercise[], opts: SubstituteQuery = {}): Exercise[] {
  const words = norm(opts.query ?? '').split(/\s+/).filter(Boolean);
  const family = opts.family ?? 'Any';
  const matches = (c: Exercise) => {
    if (words.length === 0) return c.primary === base.primary;
    const hay = norm(`${c.name} ${c.primary} ${c.equipment} ${c.category}`);
    return words.every((w) => hay.includes(w));
  };
  return pool
    .filter((c) => c.id !== base.id && matches(c) && (family === 'Any' || equipFamily(c.equipment) === family))
    .map((c) => ({ c, s: substituteScore(base, c) }))
    .sort((a, b) => b.s - a.s || a.c.name.localeCompare(b.c.name))
    .map((x) => x.c);
}

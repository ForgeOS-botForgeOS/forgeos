import type { PR } from '../../types';

// Pure "never worse off" merge rules — kept separate from the store-touching
// merge so they can be unit-tested in isolation.

/** Scalars always take the better (higher) value: an import can't demote you. */
export const betterScalar = (current: number, incoming: number) => Math.max(current, incoming);

/** Keep the higher-e1RM PR per exercise; existing PRs are never lost or lowered. */
export function mergePrs(existing: PR[], incoming: PR[]): PR[] {
  const byEx = new Map(existing.map((p) => [p.exerciseId, p]));
  for (const p of incoming) {
    const cur = byEx.get(p.exerciseId);
    if (!cur || p.e1rm > cur.e1rm) byEx.set(p.exerciseId, p);
  }
  return [...byEx.values()];
}

/** Union dated records by day; existing (real) data wins on conflicts. Idempotent. */
export function unionByDate<T extends { date: string }>(existing: T[], incoming: T[]): T[] {
  const byDate = new Map(existing.map((x) => [x.date.slice(0, 10), x]));
  for (const x of incoming) if (!byDate.has(x.date.slice(0, 10))) byDate.set(x.date.slice(0, 10), x);
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

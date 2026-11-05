import type { WorkoutWrap } from './workoutWrap';

// The last page of a Wrap: every slide on one card. The same model feeds the
// page on screen and the story image that gets shared, so what a friend
// receives is exactly what the lifter saw. Pure: no DOM, no canvas.

type T = (key: string, params?: Record<string, string | number>) => string;

export const RECAP_MAX_PRS = 3;

export type RecapSection =
  | { kind: 'comeback'; label: string; value: string }
  | { kind: 'top'; label: string; exercise: string; value: string; detail: string }
  | { kind: 'prs'; label: string; items: { name: string; value: string }[]; more: number }
  | { kind: 'muscles'; label: string; bars: { name: string; pct: number; detail: string }[] }
  | { kind: 'versus'; label: string; value: string; line: string; history: number[] }
  | { kind: 'cardio'; label: string; value: string };

export interface Recap {
  kicker: string;
  footer: string;
  emoji: string;
  title: string;
  line: string;
  name: string;
  meta: string; // date · time of day · session #n
  big: { value: string; unit: string; caption?: string };
  stats: { value: string; label: string }[]; // up to 4
  sections: RecapSection[];
}

export function formatPace(sec?: number): string {
  if (!sec) return '–';
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

const signed = (t: T, n: number) => (n === 0 ? '=' : n > 0 ? t('ww.versus.up', { n }) : t('ww.versus.down', { n }));

function bigNumber(wrap: WorkoutWrap, t: T, locale: string): Recap['big'] {
  if (wrap.kind === 'cardio') {
    const c = wrap.cardio!;
    return c.distanceKm > 0
      ? { value: String(c.distanceKm), unit: t('ww.cardio.km'), caption: c.machine }
      : { value: String(Math.round(c.durationMin)), unit: t('ww.cardio.min'), caption: c.machine };
  }
  if (wrap.kind === 'watch') return { value: String(wrap.durationMin), unit: t('ww.cardio.min') };
  return {
    value: wrap.volumeKg.toLocaleString(locale),
    unit: `kg · ${t('ww.lbl.volume')}`,
    caption: wrap.equivalent ? t(`ww.eq.${wrap.equivalent.key}`, { n: wrap.equivalent.count }) : undefined,
  };
}

export function recapStats(wrap: WorkoutWrap, t: T): Recap['stats'] {
  const s = (value: string | number, label: string) => ({ value: String(value), label });
  if (wrap.kind === 'cardio') {
    const c = wrap.cardio!;
    return [
      ...(c.distanceKm > 0 ? [s(Math.round(c.durationMin), t('ww.lbl.time'))] : []),
      ...(c.paceSecPerKm ? [s(formatPace(c.paceSecPerKm), t('ww.cardio.pace'))] : []),
      ...(c.speedKmh ? [s(c.speedKmh, t('ww.cardio.speed'))] : []),
      ...(c.calories ? [s(c.calories, t('ww.cardio.kcal'))] : []),
    ].slice(0, 4);
  }
  if (wrap.kind === 'watch') return [];
  return [
    s(wrap.sets, t('ww.lbl.sets')),
    s(wrap.reps, t('ww.lbl.reps')),
    s(wrap.exerciseCount, t('ww.lbl.exercises')),
    ...(wrap.durationMin ? [s(wrap.durationMin, t('ww.lbl.time'))] : []),
  ].slice(0, 4);
}

function sections(wrap: WorkoutWrap, t: T): RecapSection[] {
  const out: RecapSection[] = [];
  if (wrap.slides.includes('comeback')) {
    out.push({ kind: 'comeback', label: t('ww.comeback.label'), value: t('ww.comeback.days', { n: wrap.daysSincePrevious ?? 0 }) });
  }
  if (wrap.cardio?.deltaPct !== undefined && wrap.cardio.deltaPct !== 0) {
    const d = wrap.cardio.deltaPct;
    out.push({
      kind: 'cardio',
      label: wrap.cardio.machine,
      value: d > 0 ? t('ww.cardio.farther', { n: d }) : t('ww.cardio.shorter', { n: Math.abs(d) }),
    });
  }
  if (wrap.topSet) {
    out.push({
      kind: 'top',
      label: t('ww.hero.label'),
      exercise: wrap.topSet.name,
      value: `${wrap.topSet.weightKg} kg × ${wrap.topSet.reps}`,
      detail: t('ww.hero.e1rm', { kg: wrap.topSet.e1rm }),
    });
  }
  if (wrap.prs.length) {
    out.push({
      kind: 'prs',
      label: t('ww.prs.label'),
      items: wrap.prs.slice(0, RECAP_MAX_PRS).map((p) => ({ name: p.name, value: `${p.weightKg} kg × ${p.reps}` })),
      more: Math.max(0, wrap.prs.length - RECAP_MAX_PRS),
    });
  }
  if (wrap.muscles.length > 1) {
    out.push({
      kind: 'muscles',
      label: t('ww.muscles.label'),
      bars: wrap.muscles.map((m) => ({ name: m.muscle, pct: m.pct, detail: t('ww.muscles.sets', { n: m.sets }) })),
    });
  }
  if (wrap.versus) {
    const d = wrap.versus.deltaPct;
    out.push({
      kind: 'versus',
      label: t('ww.versus.label', { name: wrap.name }),
      value: signed(t, d),
      line: d === 0 ? t('ww.versus.same') : d > 0 ? t('ww.versus.upLine') : t('ww.versus.downLine'),
      history: wrap.versus.history,
    });
  }
  return out;
}

export function buildRecap(wrap: WorkoutWrap, t: T, locale: string, dateLabel: string, emoji: string): Recap {
  return {
    kicker: t('ww.recap.kicker'),
    footer: t('ww.recap.footer'),
    emoji,
    title: t(`ww.arch.${wrap.archetype}.title`),
    line: t(`ww.arch.${wrap.archetype}.l${wrap.variant}`),
    name: wrap.name,
    meta: `${dateLabel} · ${t(`ww.tod.${wrap.timeOfDay}`)} · ${t('ww.session', { n: wrap.sessionNumber })}`,
    big: bigNumber(wrap, t, locale),
    stats: recapStats(wrap, t),
    sections: sections(wrap, t),
  };
}

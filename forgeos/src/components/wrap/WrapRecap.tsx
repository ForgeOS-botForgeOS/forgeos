import { useT } from '../../lib/i18n';
import { motion, useReducedMotion } from 'framer-motion';
import type { Recap, RecapSection } from '../../lib/wrapRecap';

// The Wrap's last page: every slide on one card. Laid out like the story image
// that Share and Save send (lib/wrapCard.ts draws the same Recap), so the page
// is the preview of what a friend receives.

const pop = (reduce: boolean | null, i: number) => ({
  initial: reduce ? false : { opacity: 0, y: 18, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: 'spring' as const, stiffness: 260, damping: 24, delay: reduce ? 0 : 0.08 + i * 0.07 },
});

const isHalf = (s: RecapSection) => s.kind === 'top' || s.kind === 'versus' || s.kind === 'comeback' || s.kind === 'cardio';

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-white/70 leading-snug line-clamp-2">{children}</p>;
}

export function WrapRecap({ recap }: { recap: Recap }) {
  const t = useT();
  const reduce = useReducedMotion();
  const half = recap.sections.filter(isHalf);
  const full = recap.sections.filter((s) => !isHalf(s));
  let n = 0;
  return (
    <div className="space-y-2.5">
      <motion.header {...pop(reduce, n++)} className="text-center space-y-0.5">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-white/70">{t('ForgeOS ·')} {recap.kicker}</p>
        <p className="text-4xl pt-1" aria-hidden="true">{recap.emoji}</p>
        <h2 className="text-3xl font-black uppercase leading-none tracking-tight">{recap.title}</h2>
        <p className="text-lg font-extrabold leading-tight">{recap.name}</p>
        <p className="text-xs text-white/85">{recap.line}</p>
        <p className="text-[11px] font-semibold text-white/65">{recap.meta}</p>
      </motion.header>

      <motion.div {...pop(reduce, n++)} className="rounded-3xl bg-white/[0.16] px-4 py-3 text-center">
        <p className="text-5xl font-black font-mono leading-none break-all">{recap.big.value}</p>
        <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.25em] text-white/75">{recap.big.unit}</p>
        {recap.big.caption && <p className="mt-1 text-xs font-semibold">{recap.big.caption}</p>}
      </motion.div>

      {recap.stats.length > 0 && (
        <motion.div {...pop(reduce, n++)} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${recap.stats.length}, minmax(0, 1fr))` }}>
          {recap.stats.map((s) => (
            <div key={s.label} className="rounded-2xl bg-white/[0.12] py-2 text-center">
              <p className="text-lg font-black font-mono leading-tight">{s.value}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/70">{s.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {half.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {half.map((s, i) => (
            <motion.div key={s.kind} {...pop(reduce, n++)} className={`rounded-2xl bg-white/[0.12] p-3 min-w-0 ${half.length % 2 === 1 && i === half.length - 1 ? 'col-span-2' : ''}`}>
              <Section s={s} />
            </motion.div>
          ))}
        </div>
      )}
      {full.map((s) => (
        <motion.div key={s.kind} {...pop(reduce, n++)} className="rounded-2xl bg-white/[0.12] p-3">
          <Section s={s} />
        </motion.div>
      ))}
      <p className="pt-1 text-center text-[10px] font-semibold text-white/60">{recap.footer}</p>
    </div>
  );
}

function Section({ s }: { s: RecapSection }) {
  switch (s.kind) {
    case 'comeback':
    case 'cardio':
      return (
        <>
          <Label>{s.label}</Label>
          <p className="mt-1 text-base font-extrabold leading-tight">{s.value}</p>
        </>
      );
    case 'top':
      return (
        <>
          <Label>{s.label}</Label>
          <p className="mt-1 text-xs font-bold truncate">{s.exercise}</p>
          <p className="text-xl font-black font-mono leading-tight">{s.value}</p>
          <p className="text-[10px] text-white/70 leading-tight">{s.detail}</p>
        </>
      );
    case 'versus': {
      const max = Math.max(...s.history, 1);
      return (
        <>
          <Label>{s.label}</Label>
          <div className="mt-1 flex items-end justify-between gap-2">
            <p className="text-2xl font-black font-mono leading-none">{s.value}</p>
            <div className="flex items-end gap-1 h-8" aria-hidden="true">
              {s.history.map((v, i) => (
                <span key={i} className={`w-1.5 rounded-sm ${i === s.history.length - 1 ? 'bg-white' : 'bg-white/35'}`} style={{ height: `${Math.max(12, (v / max) * 100)}%` }} />
              ))}
            </div>
          </div>
          <p className="mt-1 text-[10px] text-white/75 leading-tight">{s.line}</p>
        </>
      );
    }
    case 'prs':
      return (
        <>
          <Label>{s.label}</Label>
          <ul className="mt-1 space-y-1">
            {s.items.map((p) => (
              <li key={p.name + p.value} className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-bold truncate">🏆 {p.name}</span>
                <span className="text-sm font-black font-mono shrink-0">{p.value}</span>
              </li>
            ))}
          </ul>
          {s.more > 0 && <p className="mt-1 text-[11px] font-semibold text-white/70">+{s.more}</p>}
        </>
      );
    case 'muscles':
      return (
        <>
          <Label>{s.label}</Label>
          <ul className="mt-1.5 space-y-1.5">
            {s.bars.map((m) => (
              <li key={m.name} className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-2 text-xs font-bold">
                <span className="truncate">{m.name}</span>
                <span className="h-2 rounded-full bg-white/[0.18] overflow-hidden">
                  <span className="block h-full rounded-full bg-white" style={{ width: `${m.pct}%` }} />
                </span>
                <span className="text-right font-mono">{m.pct}%</span>
              </li>
            ))}
          </ul>
        </>
      );
  }
}

import { motion, useReducedMotion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { CountUp } from '../CountUp';
import { Confetti } from '../Celebrate';
import { useT } from '../../lib/i18n';
import type { WorkoutWrap, WrapSlide } from '../../lib/workoutWrap';
import { ARCH_EMOJI, formatPace } from './wrapStyle';

// The slides of a workout Wrap. Each slide has its own entrance, and each
// archetype its own emoji and background pattern, so a heavy day, a PR day and
// a run never look alike.

const rise = { initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 } };
const spring = (delay = 0) => ({ type: 'spring' as const, stiffness: 220, damping: 22, delay });

function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/70">{children}</p>;
}

export function Slide({ slide, wrap, dateLabel }: { slide: WrapSlide; wrap: WorkoutWrap; dateLabel: string }) {
  const t = useT();
  const reduce = useReducedMotion();
  const line = t(`ww.arch.${wrap.archetype}.l${wrap.variant}`);

  switch (slide) {
    case 'intro':
      return (
        <div className="flex flex-col items-center text-center gap-5">
          <motion.div
            initial={{ scale: 0.2, rotate: -30, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={spring()}
            className="relative grid place-items-center w-40 h-40"
          >
            <motion.span
              aria-hidden="true"
              className="absolute inset-0 rounded-full border-2 border-dashed border-white/40"
              animate={reduce ? undefined : { rotate: 360 }}
              transition={{ repeat: Infinity, duration: 18, ease: 'linear' }}
            />
            <span className="absolute inset-4 rounded-full blur-2xl" style={{ background: wrap.palette.glow, opacity: 0.55 }} aria-hidden="true" />
            <span className="relative text-7xl" aria-hidden="true">{ARCH_EMOJI[wrap.archetype]}</span>
          </motion.div>
          <motion.div {...rise} transition={spring(0.15)} className="space-y-2">
            <Kicker>{t(`ww.tod.${wrap.timeOfDay}`)} · {t('ww.session', { n: wrap.sessionNumber })}</Kicker>
            <h2 className="text-5xl font-black leading-[0.95] tracking-tight uppercase">{t(`ww.arch.${wrap.archetype}.title`)}</h2>
          </motion.div>
          <motion.p {...rise} transition={spring(0.3)} className="text-lg font-semibold text-white/90 max-w-[18rem]">{line}</motion.p>
          <motion.div {...rise} transition={spring(0.45)} className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold backdrop-blur">
            {wrap.name} · {dateLabel}
          </motion.div>
          {wrap.kind === 'watch' && wrap.durationMin > 0 && (
            <motion.p {...rise} transition={spring(0.6)} className="text-2xl font-black font-mono">{t('ww.watch.minutes', { n: wrap.durationMin })}</motion.p>
          )}
        </div>
      );

    case 'number':
      return (
        <div className="text-center space-y-3">
          <Kicker>{t('ww.number.label')}</Kicker>
          <motion.p
            initial={{ scale: 0.6, opacity: 0, filter: 'blur(12px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            transition={spring()}
            className="text-[4.5rem] leading-none font-black font-mono tracking-tighter"
          >
            <CountUp value={wrap.volumeKg} from={0} duration={1500} />
          </motion.p>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-white/70">{t('ww.number.unit')}</p>
          {wrap.equivalent && (
            <motion.p initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={spring(1.1)} className="text-xl font-bold pt-4">
              {t(`ww.eq.${wrap.equivalent.key}`, { n: wrap.equivalent.count })}
            </motion.p>
          )}
          <motion.p {...rise} transition={spring(1.3)} className="text-sm text-white/75">
            {t('ww.number.detail', { sets: wrap.sets, reps: wrap.reps, ex: wrap.exerciseCount })}
          </motion.p>
        </div>
      );

    case 'hero': {
      const top = wrap.topSet!;
      const plates = Math.min(6, Math.max(1, Math.round(top.weightKg / 25)));
      return (
        <div className="text-center space-y-5">
          <Kicker>{t('ww.hero.label')}</Kicker>
          <motion.p {...rise} transition={spring(0.05)} className="text-2xl font-extrabold">{top.name}</motion.p>
          <div className="flex items-center justify-center gap-1 h-28" aria-hidden="true">
            <span className="w-2 h-6 rounded bg-white/60" />
            {Array.from({ length: plates }).map((_, i) => (
              <motion.span
                key={`l${i}`}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={spring(0.15 + i * 0.08)}
                className="w-3 rounded bg-white"
                style={{ height: `${100 - i * 9}%` }}
              />
            ))}
            <span className="w-24 h-2 rounded bg-white/70" />
            {Array.from({ length: plates }).map((_, i) => (
              <motion.span
                key={`r${i}`}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={spring(0.15 + (plates - 1 - i) * 0.08)}
                className="w-3 rounded bg-white"
                style={{ height: `${100 - (plates - 1 - i) * 9}%` }}
              />
            ))}
            <span className="w-2 h-6 rounded bg-white/60" />
          </div>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring(0.6)} className="text-6xl font-black font-mono">
            {top.weightKg}<span className="text-2xl"> kg</span> <span className="text-white/60">×</span> {top.reps}
          </motion.p>
          <motion.p {...rise} transition={spring(0.8)} className="text-sm text-white/80">{t('ww.hero.e1rm', { kg: top.e1rm })}</motion.p>
        </div>
      );
    }

    case 'prs':
      return (
        <div className="space-y-4">
          {!reduce && <Confetti count={60} />}
          <div className="text-center space-y-2">
            <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={spring()} className="inline-grid place-items-center w-20 h-20 rounded-full bg-white/20">
              <Trophy size={40} aria-hidden="true" />
            </motion.div>
            <Kicker>{t('ww.prs.label')}</Kicker>
          </div>
          <ul className="space-y-2">
            {wrap.prs.slice(0, 5).map((p, i) => (
              <motion.li
                key={`${p.name}-${i}`}
                initial={{ opacity: 0, x: i % 2 ? 40 : -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={spring(0.25 + i * 0.12)}
                className="flex items-center justify-between rounded-2xl bg-white/15 px-4 py-3 backdrop-blur"
              >
                <span className="font-bold text-sm">{p.name}</span>
                <span className="font-mono font-black">{p.weightKg} kg × {p.reps}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      );

    case 'muscles':
      return (
        <div className="space-y-5">
          <div className="text-center"><Kicker>{t('ww.muscles.label')}</Kicker></div>
          {wrap.muscles.map((m, i) => (
            <div key={m.muscle} className="space-y-1">
              <div className="flex justify-between text-sm font-bold">
                <span>{m.muscle}</span>
                <span className="font-mono">{m.pct}% · {t('ww.muscles.sets', { n: m.sets })}</span>
              </div>
              <div className="h-4 rounded-full bg-white/15 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-white"
                  initial={{ width: 0 }}
                  animate={{ width: `${m.pct}%` }}
                  transition={{ duration: reduce ? 0 : 0.9, delay: 0.2 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>
          ))}
        </div>
      );

    case 'versus': {
      const v = wrap.versus!;
      const max = Math.max(...v.history, 1);
      return (
        <div className="text-center space-y-5">
          <Kicker>{t('ww.versus.label', { name: wrap.name })}</Kicker>
          <motion.p initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring()} className="text-7xl font-black font-mono">
            {v.deltaPct === 0 ? '=' : v.deltaPct > 0 ? t('ww.versus.up', { n: v.deltaPct }) : t('ww.versus.down', { n: v.deltaPct })}
          </motion.p>
          <p className="-mt-3 text-sm font-bold uppercase tracking-[0.25em] text-white/70">{t('ww.lbl.volume')}</p>
          <div className="flex items-end justify-center gap-3 h-36" aria-hidden="true">
            {v.history.map((vol, i) => {
              const last = i === v.history.length - 1;
              return (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(8, (vol / max) * 100)}%` }}
                  transition={spring(0.2 + i * 0.1)}
                  className={`w-9 rounded-t-xl ${last ? 'bg-white' : 'bg-white/35'}`}
                />
              );
            })}
          </div>
          <p className="text-sm text-white/80">{v.deltaPct === 0 ? t('ww.versus.same') : v.deltaPct > 0 ? t('ww.versus.upLine') : t('ww.versus.downLine')}</p>
        </div>
      );
    }

    case 'comeback':
      return (
        <div className="text-center space-y-4">
          <Kicker>{t('ww.comeback.label')}</Kicker>
          <motion.p initial={{ opacity: 0, scale: 1.6 }} animate={{ opacity: 1, scale: 1 }} transition={spring()} className="text-7xl font-black font-mono">
            {wrap.daysSincePrevious}
          </motion.p>
          <p className="text-lg font-bold uppercase tracking-widest">{t('ww.comeback.days', { n: wrap.daysSincePrevious ?? 0 })}</p>
          <motion.p {...rise} transition={spring(0.4)} className="text-white/85">{t('ww.comeback.line')}</motion.p>
        </div>
      );

    case 'cardio': {
      const c = wrap.cardio!;
      const tiles: [string, string][] = [
        [String(Math.round(c.durationMin)), t('ww.cardio.min')],
        ...(c.paceSecPerKm ? [[formatPace(c.paceSecPerKm), t('ww.cardio.pace')] as [string, string]] : []),
        ...(c.speedKmh ? [[String(c.speedKmh), t('ww.cardio.speed')] as [string, string]] : []),
        ...(c.calories ? [[String(c.calories), t('ww.cardio.kcal')] as [string, string]] : []),
      ];
      return (
        <div className="text-center space-y-5">
          <Kicker>{c.machine}</Kicker>
          {c.distanceKm > 0 ? (
            <motion.p initial={{ x: -60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={spring()} className="text-[5rem] leading-none font-black font-mono">
              {c.distanceKm}<span className="text-2xl"> {t('ww.cardio.km')}</span>
            </motion.p>
          ) : (
            <motion.p initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring()} className="text-[5rem] leading-none font-black font-mono">
              {Math.round(c.durationMin)}<span className="text-2xl"> min</span>
            </motion.p>
          )}
          {c.deltaPct != null && c.deltaPct !== 0 && (
            <p className="text-lg font-bold">{c.deltaPct > 0 ? t('ww.cardio.farther', { n: c.deltaPct }) : t('ww.cardio.shorter', { n: Math.abs(c.deltaPct) })}</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            {tiles.map(([v, l], i) => (
              <motion.div key={l} {...rise} transition={spring(0.3 + i * 0.1)} className="rounded-2xl bg-white/15 py-3 backdrop-blur">
                <p className="text-2xl font-black font-mono">{v}</p>
                <p className="text-[11px] uppercase tracking-widest text-white/70">{l}</p>
              </motion.div>
            ))}
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}

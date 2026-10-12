import { useMemo } from 'react';
import { Card, SectionTitle } from './ui';
import type { FoodEntry, MacroTargets, UserProfile } from '../types';
import {
  KCAL_PER_G, KCAL_PER_KG_FAT, MEAL_SLOT_LABEL, bySlot, energyBalance, gramsFor, lastDays, macroSplit,
  proteinDense, remaining, sugarCheck, sumEntries, topSources, weekSummary, type MealSlot,
} from '../lib/calInfo';

/** Foods for "what 100 kcal looks like": every one is a key in the built-in food table. */
const HUNDRED_KCAL_FOODS = ['broccoli', 'apple', 'banana', 'chicken breast', 'rice', 'oats', 'bread', 'cheese', 'almonds', 'olive oil'];

/** First letter up, the rest as written: "1 g fat" must not become "1 G Fat". */
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const weekday = (key: string) => new Date(`${key}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'short' });

/**
 * The Food tab's Info view: what today's numbers mean, how the week went, and
 * the reference facts people otherwise look up. Everything is derived from the
 * food log and the profile; nothing here is stored.
 */
export function CalInfo({ log, today, macros, profile }: { log: readonly FoodEntry[]; today: string; macros: MacroTargets; profile: UserProfile | null }) {
  const todays = useMemo(() => log.filter((e) => e.date.slice(0, 10) === today), [log, today]);
  const totals = useMemo(() => sumEntries(todays), [todays]);
  const left = remaining(totals, macros);
  const split = macroSplit(totals);
  const targetSplit = macroSplit(macros);
  const week = useMemo(() => lastDays(log, macros.calories, today), [log, macros.calories, today]);
  const summary = weekSummary(week);
  const slots = bySlot(todays);
  const top = topSources(todays);
  const sugar = sugarCheck(totals.sugarG, macros.calories);
  const dense = useMemo(() => proteinDense(), []);
  const weight = profile?.weightKg ?? 0;
  const balance = profile?.tdee ? energyBalance(macros.calories, profile.tdee) : null;
  const maxBar = Math.max(macros.calories, ...week.map((d) => d.calories), 1);

  return (
    <div className="space-y-3">
      {/* Today: what is left, and where the calories came from */}
      <Card className="space-y-3">
        <SectionTitle>Left today</SectionTitle>
        <div className="grid grid-cols-4 gap-2 text-center">
          <Left label="kcal" v={left.calories} />
          <Left label="protein" v={left.proteinG} unit="g" />
          <Left label="carbs" v={left.carbsG} unit="g" />
          <Left label="fat" v={left.fatG} unit="g" />
        </div>
        <div>
          <p className="text-[11px] text-muted mb-1">Where today's calories came from (your target split in brackets)</p>
          <div className="flex h-2.5 rounded-full overflow-hidden bg-surface-2" aria-hidden>
            <div className="bg-accent" style={{ width: `${split.protein}%` }} />
            <div className="bg-accent-2" style={{ width: `${split.carbs}%` }} />
            <div className="bg-text/50" style={{ width: `${split.fat}%` }} />
          </div>
          <div className="flex justify-between text-[11px] mt-1">
            <span><span className="text-accent">●</span> Protein {split.protein}% <span className="text-muted">({targetSplit.protein}%)</span></span>
            <span><span className="text-accent-2">●</span> Carbs {split.carbs}% <span className="text-muted">({targetSplit.carbs}%)</span></span>
            <span><span className="text-text/50">●</span> Fat {split.fat}% <span className="text-muted">({targetSplit.fat}%)</span></span>
          </div>
        </div>
        {weight > 0 && (
          <p className="text-xs text-muted">
            Protein so far: <b className="text-text">{(totals.proteinG / weight).toFixed(1)} g per kg</b> of body weight (target {(macros.proteinG / weight).toFixed(1)} g/kg).
          </p>
        )}
      </Card>

      {/* The last 7 days */}
      <Card className="space-y-2">
        <SectionTitle>Last 7 days</SectionTitle>
        <div role="img" aria-label={`Calories for the last 7 days, average ${summary.avgCalories} kcal`}>
          <div className="relative flex items-end gap-1.5 h-20">
            {/* the goal, as one dashed line across every day */}
            <div
              className="pointer-events-none absolute inset-x-0 border-t border-dashed border-text/40"
              style={{ bottom: `${(macros.calories / maxBar) * 100}%` }}
            />
            {week.map((d) => (
              <div
                key={d.date}
                className={`flex-1 rounded-t-md ${d.onTarget ? 'bg-success' : d.logged ? 'bg-muted/50' : 'bg-surface-2'}`}
                style={{ height: `${d.logged ? Math.max(4, (d.calories / maxBar) * 100) : 4}%` }}
                title={`${d.calories} kcal`}
              />
            ))}
          </div>
          <div className="flex gap-1.5 mt-1">
            {week.map((d) => <span key={d.date} className="flex-1 text-center text-[9px] text-muted">{weekday(d.date)}</span>)}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <Stat label="average / day" v={summary.daysLogged ? `${summary.avgCalories}` : '–'} />
          <Stat label="days logged" v={`${summary.daysLogged}/7`} />
          <Stat label="on target" v={`${summary.daysOnTarget}/7`} />
        </div>
        <p className="text-[11px] text-muted">Dashed line = your {macros.calories} kcal goal. Green = within 10% of it. The average only counts days you logged.</p>
      </Card>

      {/* When and what */}
      {todays.length > 0 && (
        <Card className="space-y-2">
          <SectionTitle>Today by meal</SectionTitle>
          {(Object.keys(slots) as MealSlot[]).filter((k) => slots[k] > 0).map((k) => (
            <Row key={k} k={MEAL_SLOT_LABEL[k]} v={`${slots[k]} kcal`} />
          ))}
          <p className="text-[11px] uppercase tracking-wide text-muted pt-2">Biggest sources</p>
          {top.map((s, i) => <Row key={i} k={s.name} v={`${s.calories} kcal · ${s.pct}%`} />)}
        </Card>
      )}

      {/* Sugar */}
      <Card className="space-y-1">
        <SectionTitle>Sugar</SectionTitle>
        <p className="text-sm">
          <b className={sugar.level === 'over' ? 'text-danger' : sugar.level === 'high' ? 'text-warn' : 'text-success'}>{Math.round(totals.sugarG)} g</b> today · WHO limit for your intake ≈ {sugar.limitG} g, ideally under {sugar.idealG} g.
        </p>
        <p className="text-[11px] text-muted">The log counts all sugar, fruit and milk included. The WHO limit is for added sugar, so you are probably under this number.</p>
      </Card>

      {/* How the target is built */}
      {profile && (
        <Card className="space-y-1">
          <SectionTitle>Your numbers explained</SectionTitle>
          <Row k="Burned at rest (BMR)" v={`${Math.round(profile.bmr)} kcal`} />
          <Row k="Burned with activity (TDEE)" v={`${Math.round(profile.tdee)} kcal`} />
          <Row k="Your daily target" v={`${macros.calories} kcal`} />
          {balance && (
            <p className="text-xs text-muted pt-1">
              {balance.dailyDiff === 0
                ? 'Your target equals maintenance: weight should hold steady.'
                : `That is ${Math.abs(balance.dailyDiff)} kcal ${balance.dailyDiff < 0 ? 'under' : 'over'} maintenance a day, about ${Math.abs(balance.kgPerWeek)} kg ${balance.dailyDiff < 0 ? 'lost' : 'gained'} a week.`}
              {' '}Real change is noisier: water and food in the gut move the scale by a kilo day to day.
            </p>
          )}
          {profile.age < 18 && balance && balance.dailyDiff < 0 && (
            <p className="text-xs text-warn pt-1">You are still growing: keep any deficit small and never skip meals to hit a number.</p>
          )}
          <p className="text-[11px] text-muted pt-1">BMR uses the Mifflin-St Jeor formula from your height, weight, age and sex. Update your weight in You and the numbers follow.</p>
        </Card>
      )}

      {/* Reference */}
      <Card className="space-y-1">
        <SectionTitle>Cheat sheet</SectionTitle>
        <Row k="1 g protein" v={`${KCAL_PER_G.protein} kcal`} />
        <Row k="1 g carbs" v={`${KCAL_PER_G.carbs} kcal`} />
        <Row k="1 g fat" v={`${KCAL_PER_G.fat} kcal`} />
        <Row k="1 g alcohol" v={`${KCAL_PER_G.alcohol} kcal`} />
        <Row k="1 kg body fat" v={`≈ ${KCAL_PER_KG_FAT.toLocaleString()} kcal`} />
        <p className="text-[11px] uppercase tracking-wide text-muted pt-3">What 100 kcal looks like</p>
        <div className="grid grid-cols-2 gap-x-4">
          {HUNDRED_KCAL_FOODS.map((f) => {
            const g = gramsFor(f);
            return g ? <Row key={f} k={f} v={`${g} g`} /> : null;
          })}
        </div>
        <p className="text-[11px] uppercase tracking-wide text-muted pt-3">Most protein per 100 kcal</p>
        <div className="grid grid-cols-2 gap-x-4">
          {dense.map((d) => <Row key={d.name} k={d.name} v={`${d.proteinPer100kcal} g`} />)}
        </div>
        <p className="text-[11px] text-muted pt-2">Foods weighed cooked or as eaten, from the same food table the describe box uses.</p>
      </Card>
    </div>
  );
}

function Left({ label, v, unit = '' }: { label: string; v: number; unit?: string }) {
  const over = v < 0;
  return (
    <div>
      <p className={`font-mono font-bold ${over ? 'text-danger' : ''}`}>{over ? `+${Math.abs(v)}` : v}{unit}</p>
      <p className="text-[10px] text-muted">{over ? `${label} over` : label}</p>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <p className="font-mono font-bold">{v}</p>
      <p className="text-[10px] text-muted">{label}</p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5 text-sm">
      <span className="text-muted truncate">{cap(k)}</span>
      <span className="font-mono whitespace-nowrap">{v}</span>
    </div>
  );
}

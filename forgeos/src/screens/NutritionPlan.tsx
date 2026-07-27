import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, RefreshCw, ShoppingCart, Droplets, Clock, ChevronRight, ShieldAlert, Leaf } from 'lucide-react';
import { Card, Button, Pill, Badge, SectionTitle } from '../components/ui';
import { useUser } from '../state/userStore';
import { useSettings } from '../state/settingsStore';
import { useWorkout } from '../state/workoutStore';
import { useHealth } from '../state/healthStore';
import { useNutrition } from '../state/nutritionStore';
import { useCookbook } from '../state/cookbookStore';
import { buildNutritionPlan, suggestDay } from '../lib/nutritionPlan';
import { supplementPlan, supplementSummary, type RankedSupplement } from '../lib/supplementPlan';
import { SUPPLEMENT_DISCLAIMER } from '../data/supplements';
import { shoppingListFor } from '../data/recipes';
import { tdee as tdeeFor, mifflinStJeor } from '../lib/fitness';
import { localiseRecipe } from '../lib/recipeLocale';
import type { Diet, Goal } from '../types';
import { useT } from '../lib/i18n';
import { haptic } from '../lib/haptics';
import { toast } from '../lib/toast';

const GOALS: Goal[] = ['lose', 'maintain', 'recomp', 'gain', 'strength'];
const DIETS: Diet[] = ['omnivore', 'vegetarian', 'vegan'];

/**
 * "What should I eat?" answered for whichever goal you point it at: targets, a
 * meal-by-meal split, a real day of food from the cookbook, and the recovery
 * nutrients worth caring about given how you have actually been sleeping and
 * training.
 */
export default function NutritionPlan() {
  const navigate = useNavigate();
  const t = useT();
  const lang = useSettings((s) => s.language);
  const diet = useSettings((s) => s.diet);
  const setSetting = useSettings((s) => s.set);
  const profile = useUser((s) => s.profile);
  const updateProfile = useUser((s) => s.updateProfile);
  const history = useWorkout((s) => s.history);
  const healthDays = useHealth((s) => s.days);
  const addEntry = useNutrition((s) => s.addEntry);
  const addToShopping = useCookbook((s) => s.addToShopping);

  const [tab, setTab] = useState<'plan' | 'recovery'>('plan');
  // Preview any goal without committing to it — switching for real is one tap.
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? 'recomp');
  const [trainingDay, setTrainingDay] = useState(true);
  const [variant, setVariant] = useState(0);

  const weightKg = profile?.weightKg ?? 75;
  const maintenance = useMemo(() => {
    if (profile?.tdee) return profile.tdee;
    if (!profile) return 2400;
    const bmr = mifflinStJeor(profile.sex ?? 'male', weightKg, profile.heightCm ?? 178, profile.age ?? 16);
    return Math.round(tdeeFor(bmr, profile.activity ?? 'moderate'));
  }, [profile, weightKg]);

  const plan = useMemo(() => buildNutritionPlan({ goal, weightKg, tdee: maintenance, trainingDay }), [goal, weightKg, maintenance, trainingDay]);
  const day = useMemo(() => suggestDay(plan, { diet, variant }), [plan, diet, variant]);

  const supplements = useMemo(() => {
    const days = Object.values(healthDays);
    const sleeps = days.map((d) => d.sleepMinutes ?? 0).filter((m) => m > 0).slice(-14);
    const weekAgo = Date.now() - 7 * 86400000;
    return supplementPlan({
      goal,
      diet,
      avgSleepH: sleeps.length ? sleeps.reduce((a, b) => a + b, 0) / sleeps.length / 60 : 0,
      sessionsPerWeek: history.filter((w) => new Date(w.date).getTime() >= weekAgo).length,
      month: new Date().getMonth(),
    });
  }, [goal, diet, healthDays, history]);

  function logMeal(recipeName: string, macros: { kcal: number; protein: number; carbs: number; fat: number }) {
    addEntry({ name: recipeName, calories: macros.kcal, proteinG: macros.protein, carbsG: macros.carbs, fatG: macros.fat, sugarG: 0, source: 'manual' });
    haptic('success');
    toast(t('plan.mealLogged', { name: recipeName }));
  }

  function shopTheDay() {
    const recipes = day.meals.map((m) => m.recipe).filter((r): r is NonNullable<typeof r> => !!r);
    const added = addToShopping(shoppingListFor(recipes));
    haptic('success');
    toast(t('plan.shopped', { n: added }));
  }

  return (
    <div className="px-4 pt-12 pb-8 space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> {t('common.back')}</button>

      <div>
        <h1 className="text-2xl font-extrabold">{t('plan.title')}</h1>
        <p className="text-xs text-muted">{t('plan.subtitle')}</p>
      </div>

      <div data-noswipe className="flex gap-2">
        <Pill active={tab === 'plan'} onClick={() => setTab('plan')}>{t('plan.tabPlan')}</Pill>
        <Pill active={tab === 'recovery'} onClick={() => setTab('recovery')}>{t('plan.tabRecovery')}</Pill>
      </div>

      {/* Goal picker — every fitness goal, previewable */}
      <div data-noswipe className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {GOALS.map((g) => (
          <Pill key={g} active={goal === g} onClick={() => { setGoal(g); haptic('tap'); }}>{t(`goal.${g}`)}</Pill>
        ))}
      </div>
      {profile && goal !== profile.goal && (
        <Card className="flex items-center justify-between gap-2 border-accent/40">
          <p className="text-xs">{t('plan.previewing', { goal: t(`goal.${goal}`) })}</p>
          <Button className="shrink-0 py-1.5 text-xs" onClick={() => { updateProfile({ goal }); haptic('success'); toast(t('plan.goalSwitched', { goal: t(`goal.${goal}`) })); }}>
            {t('plan.makeItMine')}
          </Button>
        </Card>
      )}

      {tab === 'plan' ? (
        <>
          <Card className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <SectionTitle>{t('plan.targets')}</SectionTitle>
              <button
                onClick={() => { setTrainingDay((v) => !v); haptic('tap'); }}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${trainingDay ? 'bg-accent text-black' : 'bg-surface-2 text-muted'}`}
              >
                {trainingDay ? t('plan.trainingDay') : t('plan.restDay')}
              </button>
            </div>
            <p className="text-sm text-muted">{plan.headline}</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <Target v={plan.kcal} label="kcal" accent sub={plan.deltaPct === 0 ? t('plan.atMaintenance') : `${plan.deltaPct > 0 ? '+' : ''}${plan.deltaPct}%`} />
              <Target v={plan.proteinG} label={t('cook.protein')} sub={`${plan.proteinPerKg} g/kg`} />
              <Target v={plan.carbsG} label={t('cook.carbs')} />
              <Target v={plan.fatG} label={t('cook.fat')} />
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
              <Droplets size={15} className="text-accent-2" />
              <p className="text-xs">{t('plan.hydration', { litres: (plan.hydrationMl / 1000).toFixed(1) })}</p>
            </div>
          </Card>

          {/* Meal-by-meal split */}
          <Card className="space-y-2">
            <SectionTitle>{t('plan.split')}</SectionTitle>
            {plan.meals.map((m) => (
              <div key={m.slot} className="flex items-center justify-between border-b border-line/60 py-1.5 last:border-0">
                <span className="text-sm">{m.slot}</span>
                <span className="font-mono text-xs text-muted">{m.kcal} kcal · P{m.proteinG} · {Math.round(m.share * 100)}%</span>
              </div>
            ))}
          </Card>

          {/* A real day, from the cookbook */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <SectionTitle>{t('plan.todaysMenu')}</SectionTitle>
              <div className="flex items-center gap-3">
                <button onClick={shopTheDay} className="flex items-center gap-1 text-xs text-accent"><ShoppingCart size={13} /> {t('plan.shopIt')}</button>
                <button onClick={() => { setVariant((v) => v + 1); haptic('tap'); }} className="flex items-center gap-1 text-xs text-accent"><RefreshCw size={13} /> {t('plan.another')}</button>
              </div>
            </div>

            {day.meals.map((m) => {
              const r = m.recipe ? localiseRecipe(m.recipe, lang) : null;
              return (
                <Card key={m.slot} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent-2">{m.slot}</span>
                    <span className="font-mono text-[10px] text-muted">{t('plan.slotTarget', { kcal: m.target.kcal, protein: m.target.proteinG })}</span>
                  </div>
                  {r ? (
                    <>
                      <button onClick={() => navigate(`/recipe/${r.id}`)} className="flex w-full items-center justify-between gap-2 text-left">
                        <span className="text-sm font-semibold">{r.name}</span>
                        <ChevronRight size={14} className="shrink-0 text-muted" />
                      </button>
                      <p className="font-mono text-xs text-muted">
                        {m.portions}× {t('cook.serv')} · {m.macros.kcal} kcal · P{m.macros.protein} C{m.macros.carbs} F{m.macros.fat}
                      </p>
                      <Button variant="ghost" className="w-full justify-center py-1.5 text-xs" onClick={() => logMeal(r.name, m.macros)}>{t('plan.logMeal')}</Button>
                    </>
                  ) : (
                    <p className="text-xs text-muted">{t('plan.noDish')}</p>
                  )}
                </Card>
              );
            })}

            <Card className="flex items-center justify-between">
              <span className="text-xs text-muted">{t('plan.dayTotal')}</span>
              <span className="font-mono text-xs">
                {day.totals.kcal} kcal · P{day.totals.protein}
                <span className={Math.abs(day.kcalOffPct) <= 10 ? ' text-success' : ' text-warn'}> ({day.kcalOffPct > 0 ? '+' : ''}{day.kcalOffPct}%)</span>
              </span>
            </Card>
          </div>

          {/* Timing */}
          <Card className="space-y-2">
            <SectionTitle>{t('plan.timing')}</SectionTitle>
            {plan.timing.map((tip, i) => (
              <p key={i} className="flex gap-2 text-xs">
                <Clock size={12} className="mt-0.5 shrink-0 text-accent" />
                <span>{tip}</span>
              </p>
            ))}
          </Card>

          <Button variant="ghost" className="w-full justify-center" onClick={() => navigate('/cookbook')}>
            {t('plan.openCookbook')}
          </Button>
        </>
      ) : (
        <>
          {/* Safety first, and not in small print */}
          <Card className="flex items-start gap-3 border-warn/50">
            <ShieldAlert size={18} className="mt-0.5 shrink-0 text-warn" />
            <p className="text-xs leading-relaxed">{SUPPLEMENT_DISCLAIMER}</p>
          </Card>

          <Card className="space-y-2">
            <SectionTitle>{t('plan.yourDiet')}</SectionTitle>
            <div className="flex gap-1.5">
              {DIETS.map((d) => (
                <Pill key={d} active={diet === d} onClick={() => { setSetting('diet', d); haptic('tap'); }}>{t(`plan.diet.${d}`)}</Pill>
              ))}
            </div>
            <p className="flex items-start gap-2 text-xs text-muted">
              <Leaf size={12} className="mt-0.5 shrink-0 text-success" />
              {supplementSummary(supplements)}
            </p>
          </Card>

          <div className="space-y-2">
            {supplements.map((s) => <SupplementCard key={s.id} s={s} t={t} />)}
          </div>
        </>
      )}
    </div>
  );
}

function Target({ v, label, sub, accent }: { v: number; label: string; sub?: string; accent?: boolean }) {
  return (
    <div>
      <p className={`font-mono text-lg font-bold leading-none ${accent ? 'text-accent' : ''}`}>{v}</p>
      <p className="mt-1 text-[10px] text-muted">{label}</p>
      {sub && <p className="text-[9px] text-muted/70">{sub}</p>}
    </div>
  );
}

const PRIORITY_COLOR: Record<RankedSupplement['priority'], string> = {
  core: 'rgb(var(--accent))',
  consider: 'rgb(var(--accent-2))',
  situational: 'rgb(var(--muted))',
};

function SupplementCard({ s, t }: { s: RankedSupplement; t: (k: string, p?: Record<string, string | number>) => string }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="space-y-2">
      <button className="w-full text-left" onClick={() => setOpen((v) => !v)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-xl">{s.icon}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{s.name}</p>
              <p className="truncate text-[11px] text-muted">{s.what}</p>
            </div>
          </div>
          <Badge color={PRIORITY_COLOR[s.priority]}>{t(`plan.priority.${s.priority}`)}</Badge>
        </div>
      </button>

      {s.reasons.length > 0 && (
        <p className="rounded-lg bg-accent/10 px-2 py-1 text-[11px] text-accent">
          {t('plan.becauseOf', { reasons: s.reasons.join(' · ') })}
        </p>
      )}

      {open && (
        <div className="space-y-1.5 border-t border-line pt-2 text-xs">
          <p><b className="text-accent-2">{t('plan.forRecovery')}:</b> {s.recovery}</p>
          <p><b className="text-success">{t('plan.foodFirst')}:</b> {s.foodFirst}</p>
          <p><b className="text-text">{t('plan.typical')}:</b> {s.typical}</p>
          <p><b className="text-text">{t('plan.when')}:</b> {s.timing}</p>
          <p className="text-warn"><b>{t('plan.caution')}:</b> {s.caution}</p>
        </div>
      )}
    </Card>
  );
}

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Clock, Heart, Users, ShoppingCart, Check, Plus, Minus, Utensils, Lightbulb } from 'lucide-react';
import { Card, Button, Badge, SectionTitle } from '../components/ui';
import { recipeById, scaleRecipe, type Recipe } from '../data/recipes';
import { useSettings } from '../state/settingsStore';
import { useCookbook } from '../state/cookbookStore';
import { useNutrition } from '../state/nutritionStore';
import { localiseRecipe } from '../lib/recipeLocale';
import { useT } from '../lib/i18n';
import { haptic } from '../lib/haptics';
import { toast, celebrate } from '../lib/toast';

/**
 * One dish, cooked. Ingredients scale with the servings you actually want, the
 * method is a checklist you can tick your way down mid-cook, and logging it
 * carries the scaled macros — not the recipe's default portion.
 */
export default function RecipeDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const t = useT();
  const lang = useSettings((s) => s.language);
  const base = recipeById(id);

  if (!base) {
    return (
      <div className="px-4 pt-12 pb-6 space-y-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> {t('common.back')}</button>
        <p className="text-sm text-muted">{t('cook.notFound')}</p>
      </div>
    );
  }
  return <RecipeView base={base} lang={lang} />;
}

function RecipeView({ base, lang }: { base: Recipe; lang: string }) {
  const navigate = useNavigate();
  const t = useT();
  const recipe = useMemo(() => localiseRecipe(base, lang), [base, lang]);

  const favourites = useCookbook((s) => s.favourites);
  const toggleFavourite = useCookbook((s) => s.toggleFavourite);
  const markCooked = useCookbook((s) => s.markCooked);
  const cookedTimes = useCookbook((s) => s.cooked[base.id] ?? 0);
  const addToShopping = useCookbook((s) => s.addToShopping);
  const addEntry = useNutrition((s) => s.addEntry);

  const [servings, setServings] = useState(base.servings);
  const [doneSteps, setDoneSteps] = useState<number[]>([]);
  const [gotIngredients, setGotIngredients] = useState<number[]>([]);

  const fav = favourites.includes(base.id);
  const macros = scaleRecipe(base, servings);
  const factor = servings / base.servings;
  const allStepsDone = doneSteps.length === recipe.steps.length;

  function logIt() {
    addEntry({
      name: recipe.name,
      calories: macros.kcal,
      proteinG: macros.protein,
      carbsG: macros.carbs,
      fatG: macros.fat,
      sugarG: 0,
      source: 'manual',
    });
    markCooked(base.id);
    haptic('success');
    if (allStepsDone) celebrate();
    toast(t('cook.logged', { name: recipe.name, kcal: macros.kcal }));
  }

  return (
    <div className="px-4 pt-12 pb-8 space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> {t('common.back')}</button>

      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-extrabold leading-tight">{recipe.name}</h1>
          <button
            onClick={() => { toggleFavourite(base.id); haptic('tap'); }}
            aria-label={t('cook.favourite')}
            className={`shrink-0 grid h-10 w-10 place-items-center rounded-full bg-surface-2 ${fav ? 'text-danger' : 'text-muted'}`}
          >
            <Heart size={17} fill={fav ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <Badge color="rgb(var(--accent-2))">{recipe.meal}</Badge>
          <span className="flex items-center gap-1"><Clock size={12} /> {recipe.minutes} min</span>
          <span className="flex items-center gap-1"><Users size={12} /> {t('cook.servesBase', { n: base.servings })}</span>
          {cookedTimes > 0 && <span className="flex items-center gap-1 text-accent"><Utensils size={12} /> {t('cook.cookedTimes', { n: cookedTimes })}</span>}
        </div>
        <div className="flex flex-wrap gap-1">
          {recipe.tags.map((tag) => <span key={tag} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">{t(`cook.tag.${tag}`)}</span>)}
        </div>
      </header>

      {/* Macros — for the portion you are actually making */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionTitle>{t('cook.perPortion')}</SectionTitle>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setServings((s) => Math.max(0.5, Math.round((s - 0.5) * 2) / 2)); haptic('tap'); }}
              aria-label={t('cook.fewerServings')}
              className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2 text-muted"
            >
              <Minus size={14} />
            </button>
            <span className="w-14 text-center font-mono text-sm font-bold">{servings}× {t('cook.serv')}</span>
            <button
              onClick={() => { setServings((s) => Math.min(12, s + 0.5)); haptic('tap'); }}
              aria-label={t('cook.moreServings')}
              className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2 text-muted"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <Macro v={macros.kcal} label="kcal" accent />
          <Macro v={macros.protein} label={t('cook.protein')} />
          <Macro v={macros.carbs} label={t('cook.carbs')} />
          <Macro v={macros.fat} label={t('cook.fat')} />
        </div>
      </Card>

      {/* Ingredients — tickable, quantities scaled by a note when not 1× */}
      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <SectionTitle>{t('cook.ingredients')}</SectionTitle>
          <button
            onClick={() => {
              const added = addToShopping(recipe.ingredients.map((text) => ({ text, count: 1 })));
              haptic('success');
              toast(added > 0 ? t('cook.addedToList', { n: added }) : t('cook.alreadyOnList'));
            }}
            className="flex items-center gap-1 text-xs text-accent"
          >
            <ShoppingCart size={13} /> {t('cook.addAll')}
          </button>
        </div>
        {factor !== 1 && (
          <p className="rounded-lg bg-accent/10 px-2 py-1.5 text-[11px] text-accent">
            {t('cook.scaleNote', { factor: factor % 1 === 0 ? String(factor) : factor.toFixed(1) })}
          </p>
        )}
        <ul className="space-y-1">
          {recipe.ingredients.map((line, i) => {
            const got = gotIngredients.includes(i);
            return (
              <li key={i}>
                <button
                  onClick={() => { setGotIngredients((cur) => (got ? cur.filter((x) => x !== i) : [...cur, i])); haptic('tap'); }}
                  className="flex w-full items-center gap-2 py-1 text-left"
                >
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${got ? 'border-success bg-success text-black' : 'border-line'}`}>
                    {got && <Check size={12} strokeWidth={3} />}
                  </span>
                  <span className={`text-sm ${got ? 'text-muted line-through' : ''}`}>{line}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* The method — a checklist you work down while cooking */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionTitle>{t('cook.method')}</SectionTitle>
          <span className="font-mono text-[11px] text-muted">{doneSteps.length}/{recipe.steps.length}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(doneSteps.length / recipe.steps.length) * 100}%` }} />
        </div>
        <ol className="space-y-2">
          {recipe.steps.map((step, i) => {
            const done = doneSteps.includes(i);
            return (
              <li key={i}>
                <button
                  onClick={() => { setDoneSteps((cur) => (done ? cur.filter((x) => x !== i) : [...cur, i])); haptic('tap'); }}
                  className={`flex w-full gap-3 rounded-xl p-2 text-left transition ${done ? 'bg-success/10' : 'bg-surface-2'}`}
                >
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${done ? 'bg-success text-black' : 'bg-accent/20 text-accent'}`}>
                    {done ? <Check size={13} strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={`text-sm leading-snug ${done ? 'text-muted line-through' : ''}`}>{step}</span>
                </button>
              </li>
            );
          })}
        </ol>
        {doneSteps.length > 0 && (
          <button onClick={() => setDoneSteps([])} className="text-[11px] text-muted">{t('cook.resetSteps')}</button>
        )}
      </Card>

      {recipe.tip && (
        <Card className="flex items-start gap-3 bg-surface-2">
          <Lightbulb size={16} className="mt-0.5 shrink-0 text-accent-2" />
          <p className="text-sm">{recipe.tip}</p>
        </Card>
      )}

      <Button className="w-full justify-center py-3" onClick={logIt}>
        {t('cook.logIt', { kcal: macros.kcal, protein: macros.protein })}
      </Button>
      <p className="text-center text-[11px] text-muted/70">{t('cook.logNote')}</p>
    </div>
  );
}

function Macro({ v, label, accent }: { v: number; label: string; accent?: boolean }) {
  return (
    <div>
      <p className={`font-mono text-lg font-bold leading-none ${accent ? 'text-accent' : ''}`}>{v}</p>
      <p className="mt-1 text-[10px] text-muted">{label}</p>
    </div>
  );
}

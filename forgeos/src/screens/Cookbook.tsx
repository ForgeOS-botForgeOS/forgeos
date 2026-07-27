import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, Clock, Heart, ShoppingCart, Utensils, X, Trash2, Check } from 'lucide-react';
import { Card, Button, Pill, Badge, Sheet } from '../components/ui';
import { RECIPES, MEAL_TYPES, RECIPE_TAGS, cookbookStats, filterRecipes, type MealType, type Recipe, type RecipeTag } from '../data/recipes';
import { useUser } from '../state/userStore';
import { useSettings } from '../state/settingsStore';
import { useCookbook } from '../state/cookbookStore';
import { localiseRecipe, localiseMeal } from '../lib/recipeLocale';
import { useT } from '../lib/i18n';
import { haptic } from '../lib/haptics';
import { toast } from '../lib/toast';

export default function Cookbook() {
  const navigate = useNavigate();
  const t = useT();
  const lang = useSettings((s) => s.language);
  const diet = useSettings((s) => s.diet);
  const goal = useUser((s) => s.profile?.goal ?? 'recomp');
  const favourites = useCookbook((s) => s.favourites);
  const shopping = useCookbook((s) => s.shopping);

  const [search, setSearch] = useState('');
  const [meal, setMeal] = useState<MealType | 'All'>('All');
  const [tags, setTags] = useState<RecipeTag[]>(diet === 'vegan' ? ['vegan'] : diet === 'vegetarian' ? ['vegetarian'] : []);
  const [onlyGoal, setOnlyGoal] = useState(true);
  const [quickOnly, setQuickOnly] = useState(false);
  const [favesOnly, setFavesOnly] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);

  const stats = useMemo(() => cookbookStats(), []);
  const list = useMemo(
    () =>
      filterRecipes({
        search,
        meal,
        goal: onlyGoal ? goal : null,
        tags,
        maxMinutes: quickOnly ? 15 : undefined,
        favouritesOnly: favesOnly,
        favourites,
      }).map((r) => localiseRecipe(r, lang)),
    [search, meal, onlyGoal, goal, tags, quickOnly, favesOnly, favourites, lang],
  );

  const mealLabel = (m: string) => localiseMeal(m, lang);
  const openItems = shopping.filter((i) => !i.checked).length;

  return (
    <div className="px-4 pt-12 pb-8 space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> {t('common.back')}</button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{t('cook.title')}</h1>
          <p className="text-xs text-muted">
            {t('cook.subtitle', { total: stats.total, protein: stats.highProtein, quick: stats.quick })}
          </p>
        </div>
        <button
          onClick={() => setShopOpen(true)}
          aria-label={t('cook.shoppingList')}
          className="relative shrink-0 grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-muted"
        >
          <ShoppingCart size={17} />
          {openItems > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-black">{openItems}</span>
          )}
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5">
        <Search size={16} className="text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('cook.searchPlaceholder', { n: RECIPES.length })}
          className="flex-1 bg-transparent text-sm outline-none"
        />
        {search && <button onClick={() => setSearch('')} className="text-muted"><X size={14} /></button>}
      </div>

      {/* Meal slot */}
      <div data-noswipe className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {(['All', ...MEAL_TYPES] as const).map((m) => (
          <Pill key={m} active={meal === m} onClick={() => setMeal(m)}>{m === 'All' ? t('cook.allMeals') : mealLabel(m)}</Pill>
        ))}
      </div>

      {/* The three switches people actually use */}
      <div data-noswipe className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <Pill active={onlyGoal} onClick={() => setOnlyGoal((v) => !v)}>{onlyGoal ? t('cook.forGoal', { goal }) : t('cook.allGoals')}</Pill>
        <Pill active={quickOnly} onClick={() => setQuickOnly((v) => !v)}>≤15 min</Pill>
        <Pill active={favesOnly} onClick={() => setFavesOnly((v) => !v)}>♥ {favourites.length}</Pill>
      </div>

      {/* Tag filters */}
      <div data-noswipe className="flex flex-wrap gap-1.5">
        {RECIPE_TAGS.map((tag) => {
          const on = tags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => { setTags((cur) => (on ? cur.filter((x) => x !== tag) : [...cur, tag])); haptic('tap'); }}
              className={`rounded-full border px-2.5 py-1 text-[11px] transition ${on ? 'border-accent-2 bg-accent-2/15 text-accent-2' : 'border-line bg-surface-2 text-muted'}`}
            >
              {t(`cook.tag.${tag}`)}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted"><b className="text-text">{list.length}</b> {t('cook.recipes')}</p>
        {(search || meal !== 'All' || tags.length || quickOnly || favesOnly || !onlyGoal) && (
          <button
            onClick={() => { setSearch(''); setMeal('All'); setTags([]); setQuickOnly(false); setFavesOnly(false); setOnlyGoal(true); }}
            className="text-xs text-accent"
          >
            {t('cook.clear')}
          </button>
        )}
      </div>

      {list.length === 0 && <p className="text-sm text-muted">{t('cook.noMatch')}</p>}

      <div className="space-y-2">
        {list.map((r) => (
          <RecipeRow key={r.id} recipe={r} onOpen={() => navigate(`/recipe/${r.id}`)} mealLabel={mealLabel} />
        ))}
      </div>

      <ShoppingSheet open={shopOpen} onClose={() => setShopOpen(false)} />
    </div>
  );
}

function RecipeRow({ recipe, onOpen, mealLabel }: { recipe: Recipe; onOpen: () => void; mealLabel: (m: string) => string }) {
  const favourites = useCookbook((s) => s.favourites);
  const toggleFavourite = useCookbook((s) => s.toggleFavourite);
  const cooked = useCookbook((s) => s.cooked[recipe.id] ?? 0);
  const fav = favourites.includes(recipe.id);

  return (
    <Card onClick={onOpen} className="space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{recipe.name}</p>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-muted">
            <span className="font-mono">{recipe.kcal} kcal</span>
            <span className="font-mono">P{recipe.protein}</span>
            <span className="flex items-center gap-0.5"><Clock size={11} /> {recipe.minutes}m</span>
            {cooked > 0 && <span className="flex items-center gap-0.5 text-accent"><Utensils size={10} /> {cooked}×</span>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge color="rgb(var(--accent-2))">{mealLabel(recipe.meal)}</Badge>
          <button
            onClick={(e) => { e.stopPropagation(); toggleFavourite(recipe.id); haptic('tap'); }}
            aria-label="Favourite"
            className={fav ? 'text-danger' : 'text-muted'}
          >
            <Heart size={15} fill={fav ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {recipe.tags.slice(0, 4).map((tag) => (
          <span key={tag} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">{tag}</span>
        ))}
      </div>
    </Card>
  );
}

export function ShoppingSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const shopping = useCookbook((s) => s.shopping);
  const toggle = useCookbook((s) => s.toggleShoppingItem);
  const remove = useCookbook((s) => s.removeShoppingItem);
  const clearChecked = useCookbook((s) => s.clearChecked);
  const clearAll = useCookbook((s) => s.clearShopping);

  return (
    <Sheet open={open} onClose={onClose} title={t('cook.shoppingList')}>
      {shopping.length === 0 ? (
        <p className="text-sm text-muted">{t('cook.shoppingEmpty')}</p>
      ) : (
        <div className="space-y-3">
          <div className="max-h-[55vh] space-y-1 overflow-y-auto no-scrollbar">
            {shopping.map((item) => (
              <div key={item.id} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
                <button
                  onClick={() => { toggle(item.id); haptic('tap'); }}
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${item.checked ? 'border-success bg-success text-black' : 'border-line'}`}
                  aria-label={item.checked ? 'Uncheck' : 'Check'}
                >
                  {item.checked && <Check size={13} strokeWidth={3} />}
                </button>
                <span className={`flex-1 text-sm ${item.checked ? 'text-muted line-through' : ''}`}>{item.text}</span>
                {item.count > 1 && <span className="font-mono text-[11px] text-accent">×{item.count}</span>}
                <button onClick={() => remove(item.id)} className="text-muted" aria-label="Remove"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1 justify-center py-2 text-xs" onClick={() => { clearChecked(); toast(t('cook.clearedChecked')); }}>{t('cook.clearChecked')}</Button>
            <Button variant="outline" className="justify-center py-2 text-xs" onClick={() => { clearAll(); onClose(); }}>{t('cook.clearAll')}</Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

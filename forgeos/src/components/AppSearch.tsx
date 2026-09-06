import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Compass, Dumbbell, UtensilsCrossed, History, Settings2 } from 'lucide-react';
import { Sheet } from './ui';
import { ActionGroup, ActionRow } from './ActionList';
import { haptic } from '../lib/haptics';
import { useT } from '../lib/i18n';
import { useSettings } from '../state/settingsStore';
import { SEARCH_MAX, groupHits, searchApp, type SearchKind } from '../lib/appSearch';
import { buildIndex } from '../lib/appSearchIndex';
import { EXERCISES } from '../data/exercises';
import { RECIPES } from '../data/recipes';
import { localiseRecipe } from '../lib/recipeLocale';
import { useWorkout } from '../state/workoutStore';

// The Apprentice Mode search box.
//
// Apprentice Mode hides two tabs and trims three screens so a beginner is not
// drowning; the cost is that the things it hides are now *further away*. "Find
// it fast" answers that for six fixed rows. This answers it for everything —
// and, like that list, every result names the place it lives in the FULL app,
// so the habit a beginner builds here survives switching to Full Forge.
//
// Deliberately not shown in Full Forge: someone who has chosen six tabs has
// told us they can navigate. Adding a search bar there too would be a second
// way to do what the tab bar already does well.

const KIND_ICON: Record<SearchKind, typeof Compass> = {
  place: Compass,
  setting: Settings2,
  exercise: Dumbbell,
  recipe: UtensilsCrossed,
  session: History,
};

/** The tap target: a real search field, not a magnifying-glass icon to hunt for. */
export function SearchBar() {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => { setOpen(true); haptic('tap'); }}
        className="flex w-full items-center gap-2.5 rounded-2xl border border-line bg-surface px-3.5 py-3 text-left transition-colors active:bg-surface-2"
      >
        <Search size={16} className="shrink-0 text-muted" aria-hidden="true" />
        <span className="truncate text-sm text-muted">{t('search.open')}</span>
      </button>
      <AppSearchSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function AppSearchSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const lang = useSettings((s) => s.language);
  const navigate = useNavigate();
  const history = useWorkout((s) => s.history);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Typing must never wait on scoring ~1,100 rows; the field stays instant and
  // the list catches up a frame later.
  const deferred = useDeferredValue(query);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const id = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(id);
  }, [open]);

  // Built once per language / history change, not per keystroke.
  const index = useMemo(
    () =>
      buildIndex({
        t,
        exercises: EXERCISES,
        recipes: RECIPES.map((r) => localiseRecipe(r, lang)),
        sessions: history.filter((w) => w.exercises.length > 0).slice(0, 30),
      }),
    [t, lang, history],
  );

  // Score a wide net, then let groupHits decide what is worth showing: with a
  // hard limit of 12 the exercise library alone could fill the whole list.
  const groups = useMemo(() => groupHits(searchApp(index, deferred, 60)), [index, deferred]);
  const total = groups.reduce((n, g) => n + g.hits.length, 0);
  const typing = deferred.trim().length > 0;

  function go(route: string) {
    onClose();
    haptic('tap');
    navigate(route);
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('search.title')}>
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2.5 focus-within:border-accent/70">
          <Search size={15} className="shrink-0 text-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value.slice(0, SEARCH_MAX))}
            placeholder={t('search.placeholder')}
            aria-label={t('search.title')}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          {query && (
            <button onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label={t('common.cancel')} className="shrink-0 text-muted">
              <X size={15} />
            </button>
          )}
        </div>

        {!typing && <p className="px-1 text-[11px] leading-relaxed text-muted">{t('search.hint')}</p>}
        {typing && total === 0 && <p className="px-1 py-4 text-center text-sm text-muted">{t('search.empty')}</p>}

        {/* aria-live so a screen reader hears the results change as you type. */}
        <div role="listbox" aria-live="polite">
          {groups.map((group) => {
            const Icon = KIND_ICON[group.kind];
            return (
              <ActionGroup key={group.kind} title={t(`search.group.${group.kind}`)}>
                {group.hits.map((hit) => (
                  <ActionRow
                    key={hit.id}
                    icon={<Icon size={15} />}
                    title={hit.title}
                    detail={hit.where}
                    onClick={() => go(hit.route)}
                  />
                ))}
              </ActionGroup>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}

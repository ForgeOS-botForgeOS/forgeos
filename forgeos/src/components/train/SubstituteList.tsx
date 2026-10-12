import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Exercise } from '../../types';
import { substitutesFor } from '../../data/exercises';
import { EQUIP_FAMILIES, type EquipFamily } from '../../lib/substitutes';
import { haptic } from '../../lib/haptics';

/** Rows rendered per page: the full list is ranked, this only keeps the sheet light. */
const PAGE = 30;

/**
 * The swap sheet's body: every same-muscle alternative from the full library,
 * narrowed by whichever equipment is free, or a search across all 1000.
 */
export function SubstituteList({ base, onPick }: { base: Exercise; onPick: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [family, setFamily] = useState<EquipFamily | 'Any'>('Any');
  const [shown, setShown] = useState(PAGE);
  const list = useMemo(() => substitutesFor(base.id, { query: q, family }), [base.id, q, family]);
  const searching = q.trim().length > 0;

  const reset = (fn: () => void) => { fn(); setShown(PAGE); };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5">
        <Search size={16} className="text-muted shrink-0" />
        <input
          value={q}
          onChange={(e) => reset(() => setQ(e.target.value))}
          placeholder="Search all exercises…"
          aria-label="Search all exercises"
          className="bg-transparent text-sm flex-1 outline-none min-w-0"
        />
        {q && <button onClick={() => reset(() => setQ(''))} aria-label="Clear search" className="text-muted"><X size={15} /></button>}
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1" data-noswipe>
        {(['Any', ...EQUIP_FAMILIES] as const).map((f) => (
          <button
            key={f}
            onClick={() => reset(() => setFamily(f))}
            aria-pressed={family === f}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${family === f ? 'bg-accent text-black' : 'bg-surface-2 text-muted'}`}
          >
            {f}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted">
        {list.length} {searching ? 'matches in the full library' : `${base.primary.toLowerCase()} alternatives`}
        {family !== 'Any' && ` · ${family.toLowerCase()} only`} · best match first
      </p>
      <div className="space-y-1.5 max-h-[50vh] overflow-y-auto no-scrollbar">
        {list.slice(0, shown).map((alt) => (
          <button
            key={alt.id}
            onClick={() => { onPick(alt.id); haptic('tap'); }}
            className="w-full text-left rounded-xl bg-surface-2 px-4 py-3"
          >
            <p className="text-sm font-medium">{alt.name}</p>
            <p className="text-xs text-muted">
              {alt.primary !== base.primary ? `${alt.primary} · ` : ''}{alt.category} · {alt.equipment}
            </p>
          </button>
        ))}
        {list.length === 0 && (
          <p className="text-sm text-muted py-2">Nothing matches. Try another word or set equipment back to Any.</p>
        )}
        {list.length > shown && (
          <button onClick={() => setShown((n) => n + PAGE)} className="w-full rounded-xl border border-line py-2 text-xs text-muted">
            Show more ({list.length - shown} left)
          </button>
        )}
      </div>
    </div>
  );
}

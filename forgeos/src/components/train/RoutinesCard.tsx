import { useMemo, useState } from 'react';
import { BookmarkPlus, MoreHorizontal, Pencil, Play, Repeat, Trash2 } from 'lucide-react';
import { Card, Button, Sheet } from '../ui';
import { ActionRow } from '../ActionList';
import { haptic } from '../../lib/haptics';
import { toast } from '../../lib/toast';
import { askConfirm, askText } from '../../lib/dialog';
import { useWorkout } from '../../state/workoutStore';
import { ROUTINE_NAME_MAX, sortRoutines } from '../../lib/routines';
import type { Workout } from '../../types';

// "The four sessions I actually do." One card at the top of Train that replaces
// two older, weaker things: a star on a history row (which only reordered a
// picker) and a lone "Do it again" card for the single most recent session.
//
// Ordering is by use, so the card teaches itself your habits — the session you
// run every Monday floats to the top without you organising anything.

export function RoutinesCard({ lastStrength }: { lastStrength?: Workout }) {
  const routines = useWorkout((s) => s.routines);
  const startRoutine = useWorkout((s) => s.startRoutine);
  const saveRoutine = useWorkout((s) => s.saveRoutine);
  const renameRoutine = useWorkout((s) => s.renameRoutine);
  const deleteRoutine = useWorkout((s) => s.deleteRoutine);
  const suggestName = useWorkout((s) => s.suggestName);
  const repeatWorkout = useWorkout((s) => s.repeatWorkout);

  const [menu, setMenu] = useState<{ id: string; name: string } | null>(null);

  const ordered = useMemo(() => sortRoutines(routines), [routines]);
  if (ordered.length === 0 && !lastStrength) return null;

  async function saveLast() {
    if (!lastStrength) return;
    const name = await askText({
      title: 'Name this routine',
      body: 'Save the shape of this session — its lifts, sets and weights — to start it again in one tap.',
      defaultValue: suggestName(lastStrength.id),
      confirmLabel: 'Save',
      required: true,
      maxLength: ROUTINE_NAME_MAX,
    });
    if (!name) return;
    const saved = saveRoutine(lastStrength.id, name);
    if (saved) { haptic('success'); toast(`“${saved.name}” saved as a routine 📌`); }
    else toast('That session has nothing to save yet.', 'error');
  }

  async function rename(id: string, name: string) {
    setMenu(null);
    const renamed = await askText({
      title: 'Rename routine',
      defaultValue: name,
      confirmLabel: 'Rename',
      required: true,
      maxLength: ROUTINE_NAME_MAX,
    });
    if (renamed) { renameRoutine(id, renamed); haptic('success'); }
  }

  async function remove(id: string, name: string) {
    setMenu(null);
    const gone = await askConfirm({
      title: `Delete “${name}”?`,
      body: 'The routine goes; the workouts you did with it stay in your history.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (gone) { deleteRoutine(id); haptic('warning'); toast('Routine deleted'); }
  }

  function start(id: string, name: string) {
    if (startRoutine(id)) { haptic('success'); toast(`“${name}” started 💪`); }
  }

  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted">Your routines</p>
        {lastStrength && (
          <button
            onClick={() => void saveLast()}
            className="flex items-center gap-1 text-[11px] text-accent active:opacity-70"
          >
            <BookmarkPlus size={13} aria-hidden="true" /> Save last session
          </button>
        )}
      </div>

      {ordered.length > 0 ? (
        <div className="divide-y divide-line/70">
          {ordered.map((r) => (
            <div key={r.id} className="flex items-center gap-2 py-2">
              <button
                onClick={() => start(r.id, r.name)}
                className="min-w-0 flex-1 text-left active:opacity-70"
              >
                <p className="truncate text-sm font-semibold">{r.name}</p>
                <p className="text-[11px] text-muted">
                  {r.exerciseIds.length} exercises{r.uses > 0 ? ` · run ${r.uses}×` : ' · never run yet'}
                </p>
              </button>
              <Button
                variant="outline"
                className="shrink-0 py-1.5"
                onClick={() => start(r.id, r.name)}
              >
                <span className="flex items-center gap-1.5 text-xs"><Play size={13} /> Start</span>
              </Button>
              <button
                onClick={() => { haptic('tap'); setMenu({ id: r.id, name: r.name }); }}
                aria-label={`Options for ${r.name}`}
                className="shrink-0 rounded-lg p-1.5 text-muted active:bg-surface-2"
              >
                <MoreHorizontal size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] leading-relaxed text-muted">
          Save a session you liked and it becomes a one-tap routine here — same lifts, same weights, ready to go.
        </p>
      )}

      {/* Repeating the most recent session stays one tap even before anything is
          saved: it is the fastest path for someone who never saves anything. */}
      {lastStrength && (
        <button
          onClick={() => { if (repeatWorkout(lastStrength.id)) { haptic('success'); toast('Repeating your last session 💪'); } }}
          className="flex w-full items-center gap-2 border-t border-line/70 pt-2.5 text-left text-[11px] text-muted active:opacity-70"
        >
          <Repeat size={13} className="shrink-0" aria-hidden="true" />
          <span className="truncate">Repeat last session — {lastStrength.name}</span>
        </button>
      )}

      <Sheet open={menu !== null} onClose={() => setMenu(null)} title={menu?.name}>
        {menu && (
          <div className="divide-y divide-line/70">
            <ActionRow icon={<Play size={15} />} title="Start it now" onClick={() => { setMenu(null); start(menu.id, menu.name); }} />
            <ActionRow icon={<Pencil size={15} />} title="Rename" onClick={() => void rename(menu.id, menu.name)} />
            <ActionRow icon={<Trash2 size={15} />} title="Delete routine" tone="danger" onClick={() => void remove(menu.id, menu.name)} />
          </div>
        )}
      </Sheet>
    </Card>
  );
}

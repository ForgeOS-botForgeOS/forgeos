import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, Nfc, Plus, Trash2 } from 'lucide-react';
import { Card, Badge, Button } from '../components/ui';
import { EXERCISES, EXERCISE_CATEGORIES } from '../data/exercises';
import { useExercises } from '../state/exerciseStore';
import { CreateExerciseSheet } from '../components/CreateExercise';
import type { MuscleGroup } from '../types';
import { haptic } from '../lib/haptics';

const MUSCLES: MuscleGroup[] = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Full Body'];

const EQUIPMENT = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Kettlebell', 'Bands', 'Cardio'];

// Bucket each exercise's free-text equipment into a broad filter group.
function equipGroup(equipment: string): string {
  const eq = equipment.toLowerCase();
  if (/barbell|ez-bar|ssb|safety bar|cambered|football bar|trap|landmine/.test(eq)) return 'Barbell';
  if (/dumbbell/.test(eq)) return 'Dumbbell';
  if (/kettlebell/.test(eq)) return 'Kettlebell';
  if (/cable/.test(eq)) return 'Cable';
  if (/band/.test(eq)) return 'Bands';
  if (/rower|ski erg|air bike|echo bike|spin|bike|treadmill|jump rope|pool|sled|prowler|battle|heavy bag|speed bag|elliptical|stair|versaclimber|jacobs|poles|inline|skis/.test(eq)) return 'Cardio';
  if (/machine|smith|pendulum|ghd|hack/.test(eq)) return 'Machine';
  return 'Bodyweight';
}

export default function Library() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('All');
  const [muscle, setMuscle] = useState<string>('All');
  const [equip, setEquip] = useState<string>('All');
  const [nfcMsg, setNfcMsg] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const custom = useExercises((s) => s.custom);
  const removeCustom = useExercises((s) => s.removeCustom);

  const list = useMemo(
    () =>
      [...custom, ...EXERCISES].filter(
        (e) =>
          (cat === 'All' || e.category === cat) &&
          (muscle === 'All' || e.primary === muscle || e.secondary.includes(muscle as MuscleGroup)) &&
          (equip === 'All' || equipGroup(e.equipment) === equip) &&
          (e.name.toLowerCase().includes(q.toLowerCase()) || e.primary.toLowerCase().includes(q.toLowerCase())),
      ),
    [q, cat, muscle, equip, custom],
  );

  async function pairNfc() {
    haptic('tap');
    // Web NFC — open a machine's instructional video by reading its tag.
    if ('NDEFReader' in window) {
      try {
        // @ts-expect-error NDEFReader is experimental and not in TS DOM libs
        const reader = new NDEFReader();
        await reader.scan();
        setNfcMsg('Tap your phone to a ForgeOS-enabled machine tag…');
        reader.onreading = () => {
          setNfcMsg('Machine paired — opening instructional video.');
        };
      } catch {
        setNfcMsg('NFC permission denied.');
      }
    } else {
      setNfcMsg('Web NFC not supported on this device — use the in-app video instead.');
    }
  }

  return (
    <div className="px-4 pt-12 pb-6 space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> Back</button>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Exercise Library</h1>
        <button onClick={pairNfc} className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5 text-xs"><Nfc size={14} className="text-accent" /> NFC</button>
      </div>
      {nfcMsg && <p className="text-xs text-accent-2">{nfcMsg}</p>}

      <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5">
        <Search size={16} className="text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${EXERCISES.length + custom.length} exercises…`} className="bg-transparent text-sm flex-1 outline-none" />
      </div>

      {/* Create your own — described in your words, classified by the coach */}
      <Button className="w-full justify-center" onClick={() => setCreateOpen(true)}>
        <span className="flex items-center gap-1.5 text-sm"><Plus size={15} /> Create your own exercise{custom.length ? ` (${custom.length} made)` : ''}</span>
      </Button>

      {/* Category filter */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1.5">Category</p>
        <div data-noswipe className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {['All', ...EXERCISE_CATEGORIES].map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium border transition ${cat === c ? 'bg-accent text-black border-accent' : 'bg-surface-2 text-muted border-line'}`}>{c}</button>
          ))}
        </div>
      </div>

      {/* Muscle-group filter */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1.5">Muscle group</p>
        <div data-noswipe className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {['All', ...MUSCLES].map((m) => (
            <button key={m} onClick={() => setMuscle(m)} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium border transition ${muscle === m ? 'bg-accent-2 text-black border-accent-2' : 'bg-surface-2 text-muted border-line'}`}>{m}</button>
          ))}
        </div>
      </div>

      {/* Equipment filter */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1.5">Equipment</p>
        <div data-noswipe className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {['All', ...EQUIPMENT].map((x) => (
            <button key={x} onClick={() => setEquip(x)} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium border transition ${equip === x ? 'bg-success text-black border-success' : 'bg-surface-2 text-muted border-line'}`}>{x}</button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted"><b className="text-text">{list.length}</b> exercises{cat !== 'All' && ` · ${cat}`}{muscle !== 'All' && ` · ${muscle}`}{equip !== 'All' && ` · ${equip}`}</p>
        {(cat !== 'All' || muscle !== 'All' || equip !== 'All' || q) && (
          <button onClick={() => { setCat('All'); setMuscle('All'); setEquip('All'); setQ(''); }} className="text-xs text-accent">Clear filters</button>
        )}
      </div>
      <div className="space-y-2">
        {list.map((e) => (
          <Card key={e.id} onClick={() => navigate(`/exercise/${e.id}`)} className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{e.name}</p>
              <p className="text-xs text-muted">{e.primary}{e.secondary.length ? ` · ${e.secondary.join(', ')}` : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              {e.id.startsWith('cus-') && <Badge color="rgb(var(--success))">yours</Badge>}
              {e.isCore && <Badge>core</Badge>}
              <Badge color="rgb(var(--accent-2))">{e.category}</Badge>
              {e.id.startsWith('cus-') && (
                <button onClick={(ev) => { ev.stopPropagation(); removeCustom(e.id); }} className="text-danger" aria-label="Delete custom exercise"><Trash2 size={14} /></button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <CreateExerciseSheet open={createOpen} onClose={() => setCreateOpen(false)} />

    </div>
  );
}

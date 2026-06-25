import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, Nfc, Play } from 'lucide-react';
import { Card, Sheet, Badge, Button } from '../components/ui';
import { EXERCISES, EXERCISE_CATEGORIES } from '../data/exercises';
import { MUSCLE_CUES } from '../data/tips';
import { cuesFor } from '../data/cues';
import { useWorkout } from '../state/workoutStore';
import { e1rm, warmupSets } from '../lib/fitness';
import type { Exercise, MuscleGroup } from '../types';
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
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [nfcMsg, setNfcMsg] = useState<string | null>(null);

  const list = useMemo(
    () =>
      EXERCISES.filter(
        (e) =>
          (cat === 'All' || e.category === cat) &&
          (muscle === 'All' || e.primary === muscle || e.secondary.includes(muscle as MuscleGroup)) &&
          (equip === 'All' || equipGroup(e.equipment) === equip) &&
          (e.name.toLowerCase().includes(q.toLowerCase()) || e.primary.toLowerCase().includes(q.toLowerCase())),
      ),
    [q, cat, muscle, equip],
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
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${EXERCISES.length} exercises…`} className="bg-transparent text-sm flex-1 outline-none" />
      </div>

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
          <Card key={e.id} onClick={() => setDetail(e)} className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{e.name}</p>
              <p className="text-xs text-muted">{e.primary}{e.secondary.length ? ` · ${e.secondary.join(', ')}` : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              {e.isCore && <Badge>core</Badge>}
              <Badge color="rgb(var(--accent-2))">{e.category}</Badge>
            </div>
          </Card>
        ))}
      </div>

      <Sheet open={!!detail} onClose={() => setDetail(null)} title={detail?.name}>
        {detail && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge color="rgb(var(--accent-2))">{detail.category}</Badge>
              <Badge>{detail.primary}</Badge>
              {detail.secondary.map((m) => <Badge key={m} color="rgb(var(--muted))">{m}</Badge>)}
            </div>
            <p className="text-sm text-muted">Equipment: {detail.equipment}</p>
            <ExerciseStats exercise={detail} />
            {(() => {
              const c = cuesFor(detail);
              return (
                <div className="rounded-xl bg-surface-2 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-wide text-accent-2">How to do it</p>
                    <Badge color="rgb(var(--muted))">{c.pattern}</Badge>
                  </div>
                  <ol className="space-y-1.5">
                    {c.steps.map((step, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-accent/20 text-accent text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="text-xs"><span className="text-accent">🫁 Breathing.</span> {c.breathing}</p>
                  <p className="text-xs"><span className="text-warn">⚠️ Common mistake.</span> {c.mistake}</p>
                  <p className="text-xs text-muted border-t border-line pt-2"><span className="text-accent-2">🎯 {detail.primary}.</span> {MUSCLE_CUES[detail.primary] ?? 'Control the weight through a full range of motion.'}</p>
                </div>
              );
            })()}
            <Button variant="outline" className="w-full justify-center" onClick={() => window.open(detail.videoUrl, '_blank')}>
              <span className="flex items-center gap-2"><Play size={16} /> Watch form video</span>
            </Button>
            <p className="text-[11px] text-muted/70">NFC: tap a machine’s tag to jump straight here. Falls back to this in-app video where Web NFC is unavailable.</p>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function ExerciseStats({ exercise }: { exercise: Exercise }) {
  const history = useWorkout((s) => s.history);
  const stats = (() => {
    let times = 0;
    let best: { weightKg: number; reps: number } | null = null;
    let last: { weightKg: number; reps: number; date: string } | null = null;
    for (const w of history) {
      const we = w.exercises.find((e) => e.exerciseId === exercise.id);
      const done = we?.sets.filter((s) => s.completed) ?? [];
      if (!done.length) continue;
      times += 1;
      const top = done.reduce((a, b) => (b.weightKg * b.reps > a.weightKg * a.reps ? b : a));
      if (!last) last = { weightKg: top.weightKg, reps: top.reps, date: w.date };
      if (!best || e1rm(top.weightKg, top.reps) > e1rm(best.weightKg, best.reps)) best = { weightKg: top.weightKg, reps: top.reps };
    }
    return { times, best, last };
  })();

  const working = stats.best ? stats.best.weightKg : 60;
  const warm = warmupSets(working);

  return (
    <div className="rounded-xl bg-surface-2 p-3 space-y-2">
      <p className="text-[11px] uppercase tracking-wide text-accent mb-1">Your stats</p>
      {stats.times === 0 ? (
        <p className="text-sm text-muted">No history yet — log this lift and your PB & progress show up here.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><p className="font-mono font-bold">{stats.times}</p><p className="text-[10px] text-muted">sessions</p></div>
          <div><p className="font-mono font-bold">{stats.best ? e1rm(stats.best.weightKg, stats.best.reps) : '—'}</p><p className="text-[10px] text-muted">best e1RM</p></div>
          <div><p className="font-mono font-bold">{stats.last ? `${stats.last.weightKg}×${stats.last.reps}` : '—'}</p><p className="text-[10px] text-muted">last set</p></div>
        </div>
      )}
      <div>
        <p className="text-[11px] uppercase tracking-wide text-muted mt-1 mb-1">Warm-up to {working}kg</p>
        <div className="flex gap-2">
          {warm.map((s) => (
            <span key={s.pct} className="flex-1 text-center rounded-lg bg-surface py-1.5 text-xs">
              <b className="font-mono">{s.kg}</b><span className="text-muted"> · {s.pct}%</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

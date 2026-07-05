import { useState } from 'react';
import { Sparkles, Dumbbell, Share2 } from 'lucide-react';
import { Sheet, Button, Badge, Pill } from './ui';
import { classifyExercise, type ExerciseClassification } from '../lib/exerciseAI';
import { useExercises } from '../state/exerciseStore';
import { useGami } from '../state/gamificationStore';
import { useSocial } from '../state/socialStore';
import { toast, celebrate } from '../lib/toast';
import { haptic } from '../lib/haptics';
import type { MuscleGroup } from '../types';

// Create-your-own-exercise flow: describe it → the AI coach answers what it
// does (muscles, type, form tip) → earn XP for the creation → optionally
// publish it to the feed. Saved exercises join every picker in the app.

const MUSCLES: MuscleGroup[] = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Full Body'];

export function CreateExerciseSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addCustom = useExercises((s) => s.addCustom);
  const addXp = useGami((s) => s.addXp);
  const publishPost = useSocial((s) => s.publishPost);

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [ai, setAi] = useState<ExerciseClassification | null>(null);
  const [primary, setPrimary] = useState<MuscleGroup | null>(null);
  const [thinking, setThinking] = useState(false);
  const [publish, setPublish] = useState(true);

  function reset() {
    setName(''); setDesc(''); setAi(null); setPrimary(null); setPublish(true);
  }

  async function ask() {
    if (!name.trim() || !desc.trim()) return;
    setThinking(true);
    haptic('tap');
    try {
      const r = await classifyExercise(name.trim(), desc.trim());
      setAi(r);
      setPrimary(r.primary);
    } finally {
      setThinking(false);
    }
  }

  function save() {
    if (!ai || !name.trim()) return;
    const ex = addCustom({
      name: name.trim(),
      category: ai.category,
      primary: primary ?? ai.primary,
      secondary: ai.secondary.filter((m) => m !== (primary ?? ai.primary)),
      equipment: ai.equipment,
      isCore: false,
      videoUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(name.trim() + ' exercise form')}`,
    });
    addXp(ai.xp);
    if (publish) {
      publishPost(`🆕 I created a new exercise: “${ex.name}” — ${primary ?? ai.primary}${ai.secondary.length ? ` + ${ai.secondary.join(', ')}` : ''} (${ai.category}). ${desc.trim().slice(0, 140)}`);
    }
    celebrate();
    toast(`“${ex.name}” created +${ai.xp} XP${publish ? ' · shared to the feed' : ''} 🔥`, 'success');
    reset();
    onClose();
  }

  return (
    <Sheet open={open} onClose={() => { reset(); onClose(); }} title="Create your own exercise">
      <div className="space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Exercise name (e.g. Backpack Split Squat)"
          maxLength={48}
          className="w-full rounded-xl bg-surface-2 border border-line px-4 py-2.5 text-sm"
        />
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="What does it do & how do you perform it? (e.g. “Targets the quads and glutes. Put a heavy backpack on, one foot on a chair behind you, squat down slowly…”)"
          maxLength={400}
          className="w-full rounded-xl bg-surface-2 border border-line px-3 py-2 text-sm h-28"
        />
        <Button className="w-full justify-center" disabled={!name.trim() || desc.trim().length < 12 || thinking} onClick={ask}>
          <span className="flex items-center gap-1.5"><Sparkles size={15} className={thinking ? 'animate-pulse' : ''} />{thinking ? 'Coach is thinking…' : ai ? 'Ask the coach again' : 'Ask the coach what it does'}</span>
        </Button>

        {ai && (
          <div className="rounded-xl bg-surface-2 p-3 space-y-2">
            <p className="text-[12px] leading-snug">🤖 {ai.feedback}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge color="rgb(var(--accent))">{ai.category}</Badge>
              <Badge>{ai.equipment}</Badge>
              <Badge color="rgb(var(--success))">+{ai.xp} XP</Badge>
            </div>
            <p className="text-[11px] text-muted">Main muscle (tap to correct the coach):</p>
            <div className="flex gap-1.5 flex-wrap" data-noswipe>
              {MUSCLES.map((m) => (
                <Pill key={m} active={(primary ?? ai.primary) === m} onClick={() => setPrimary(m)}>{m}</Pill>
              ))}
            </div>
            <label className="flex items-center justify-between text-[12px] pt-1">
              <span className="flex items-center gap-1.5 text-muted"><Share2 size={13} /> Publish to the feed for friends</span>
              <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} className="accent-[rgb(var(--accent))] w-4 h-4" />
            </label>
            <Button className="w-full justify-center" onClick={save}>
              <span className="flex items-center gap-1.5"><Dumbbell size={15} /> Save exercise (+{ai.xp} XP)</span>
            </Button>
          </div>
        )}

        <p className="text-[11px] text-muted/70">Your exercise appears in every picker — plans, workouts and the library. The better you describe it, the more XP it earns.</p>
      </div>
    </Sheet>
  );
}

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Dumbbell, Move } from 'lucide-react';
import { Button, Card } from '../../components/ui';
import type { ExperienceLevel } from '../../types';

// A short, beginner-friendly test across endurance, strength and mobility.
// Each item is self-reported on a 0..3 scale; we normalise to a 0..1 score
// and bucket into an experience level.
const ITEMS = [
  {
    id: 'endurance',
    icon: Activity,
    title: 'Endurance',
    prompt: 'Max push-ups in one set?',
    options: ['0–5', '6–15', '16–30', '30+'],
  },
  {
    id: 'strength',
    icon: Dumbbell,
    title: 'Strength',
    prompt: 'Can you do a full bodyweight squat for reps?',
    options: ['Struggle', '5–10 clean', '10–25', '25+ or weighted'],
  },
  {
    id: 'core',
    icon: Activity,
    title: 'Core',
    prompt: 'Longest solid plank hold?',
    options: ['<20s', '20–45s', '45–90s', '90s+'],
  },
  {
    id: 'mobility',
    icon: Move,
    title: 'Mobility',
    prompt: 'Can you reach your toes with straight legs?',
    options: ['Far off', 'Mid-shin', 'Touch toes', 'Palms flat'],
  },
] as const;

export function FitnessTest({ onComplete }: { onComplete: (score: number, level: ExperienceLevel) => void }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const done = Object.keys(answers).length === ITEMS.length;

  function finish() {
    const total = ITEMS.reduce((a, it) => a + (answers[it.id] ?? 0), 0);
    const max = ITEMS.length * 3;
    const score = total / max;
    const level: ExperienceLevel = score > 0.66 ? 'advanced' : score > 0.33 ? 'intermediate' : 'beginner';
    onComplete(score, level);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mt-6">
      <h2 className="text-2xl font-bold">Quick fitness test</h2>
      <p className="text-sm text-muted">Four honest answers — we estimate your level and body-fat range. No equipment needed.</p>
      {ITEMS.map((it) => {
        const Icon = it.icon;
        return (
          <Card key={it.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon size={16} className="text-accent" />
              <span className="font-semibold text-sm">{it.title}</span>
            </div>
            <p className="text-sm text-muted">{it.prompt}</p>
            <div className="grid grid-cols-4 gap-1.5">
              {it.options.map((o, idx) => (
                <button
                  key={o}
                  onClick={() => setAnswers({ ...answers, [it.id]: idx })}
                  className={`rounded-lg px-1 py-2 text-[11px] transition ${
                    answers[it.id] === idx ? 'bg-accent text-black font-semibold' : 'bg-surface-2 text-muted'
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </Card>
        );
      })}
      <Button className="w-full justify-center" disabled={!done} onClick={finish}>
        Score my test
      </Button>
    </motion.div>
  );
}

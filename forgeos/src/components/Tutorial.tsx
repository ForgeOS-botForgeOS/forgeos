import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Home, Dumbbell, Apple, Users, Trophy, User, Flame, X, Watch, Link2, ShieldCheck, Gauge } from 'lucide-react';
import { Button } from './ui';

const SEEN = 'forge-tutorial-seen';

export type TourId = 'main' | 'garmin';

// Fire from anywhere (e.g. Profile, Health) to replay a tour.
export function openTutorial(tour: TourId = 'main') {
  window.dispatchEvent(new CustomEvent('forge:tutorial', { detail: tour }));
}

const MAIN_SLIDES = [
  { icon: Flame, title: 'Welcome to ForgeOS', text: 'Your gamified training, nutrition & social app. Here’s the 30-second tour — what each tab does.' },
  { icon: Home, title: 'Home', text: 'Your daily dashboard: calorie ring & macros, weekly volume, weigh-in trend, week-in-review, and a daily quote to collect.' },
  { icon: Dumbbell, title: 'Train', text: 'Start your planned day or a freestyle session. Log sets (swipe → to complete), get e1RM, plate/warm-up tools, and auto progress suggestions. Log cardio from a photo too.' },
  { icon: Apple, title: 'Food', text: 'Scan a meal photo for macros (and edit them), track water, quick-add saved meals, and browse 50+ goal-aligned recipes.' },
  { icon: Users, title: 'Social', text: 'Share progress on the feed, add friends, race live, and publish or adopt training plans in the marketplace.' },
  { icon: Trophy, title: 'Quests', text: 'Earn XP & Forge Coins, rank up Bronze→Strongman, complete daily/weekly quests, and build your PR Hall of Fame.' },
  { icon: Watch, title: 'Garmin & recovery', text: 'Got a Garmin? Connect it once on the Health screen (You → Health & recovery) and sleep, steps and readiness sync in automatically — even while the app is closed.' },
  { icon: User, title: 'You', text: '15 themes & languages, edit your week plan, set a gym & reminders, spend coins in the Shop, achievements, calendar and backup.' },
];

const GARMIN_SLIDES = [
  { icon: Watch, title: 'Garmin auto-sync', text: 'Wear your watch as normal. ForgeOS pulls in your sleep, steps, resting heart rate and calories — automatically, no typing ever.' },
  { icon: Link2, title: 'How it works', text: 'Garmin Connect saves your data into Android Health Connect. ForgeOS just reads it from there — everything stays on your phone, nothing is uploaded.' },
  { icon: ShieldCheck, title: 'One-time setup', text: '1) Install the ForgeOS Android app. 2) In Garmin Connect: Settings → Health Connect → allow sleep & activity. 3) Tap “Connect Garmin” and approve once.' },
  { icon: Gauge, title: 'Your readiness score', text: 'Every morning you get a 0–100 readiness score with advice — it even adjusts today’s suggested training load on the Train tab. Turn it all off anytime in You → Preferences.' },
];

const TOURS: Record<TourId, { slides: typeof MAIN_SLIDES; done: string }> = {
  main: { slides: MAIN_SLIDES, done: 'Start training 🔥' },
  garmin: { slides: GARMIN_SLIDES, done: 'Got it 🔥' },
};

export function Tutorial() {
  const [phase, setPhase] = useState<'closed' | 'ask' | 'tour'>('closed');
  const [tour, setTour] = useState<TourId>('main');
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(SEEN)) setPhase('ask');
    const h = (e: Event) => {
      const id = (e as CustomEvent).detail as TourId | undefined;
      setTour(id && id in TOURS ? id : 'main');
      setI(0);
      setPhase('tour');
    };
    window.addEventListener('forge:tutorial', h);
    return () => window.removeEventListener('forge:tutorial', h);
  }, []);

  function finish() {
    // Only the first-run main tour should stop the "New here?" prompt.
    if (tour === 'main') localStorage.setItem(SEEN, '1');
    setPhase('closed');
  }

  if (phase === 'closed') return null;

  if (phase === 'ask') {
    return (
      <Overlay>
        <div className="text-center space-y-3">
          <Flame className="mx-auto text-accent" size={32} />
          <h3 className="text-lg font-bold">New here?</h3>
          <p className="text-sm text-muted">Want a quick 30-second tour of what ForgeOS can do?</p>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 justify-center" onClick={finish}>Skip</Button>
            <Button className="flex-1 justify-center" onClick={() => { setI(0); setPhase('tour'); }}>Show me</Button>
          </div>
        </div>
      </Overlay>
    );
  }

  const { slides, done } = TOURS[tour];
  const s = slides[i];
  const Icon = s.icon;
  const last = i === slides.length - 1;
  return (
    <Overlay>
      <button className="absolute top-3 right-3 text-muted" onClick={finish}><X size={18} /></button>
      <div className="text-center space-y-3">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center"><Icon className="text-accent" size={26} /></div>
        <h3 className="text-lg font-bold">{s.title}</h3>
        <p className="text-sm text-muted min-h-[64px]">{s.text}</p>
        <div className="flex justify-center gap-1.5">
          {slides.map((_, idx) => <span key={idx} className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-5 bg-accent' : 'w-1.5 bg-surface-2'}`} />)}
        </div>
        <div className="flex gap-2 pt-1">
          {i > 0 && <Button variant="outline" className="flex-1 justify-center" onClick={() => setI(i - 1)}>Back</Button>}
          <Button className="flex-1 justify-center" onClick={() => (last ? finish() : setI(i + 1))}>{last ? done : 'Next'}</Button>
        </div>
      </div>
    </Overlay>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-[75] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full rounded-2xl bg-surface border border-line p-6">
        {children}
      </motion.div>
    </div>
  );
}

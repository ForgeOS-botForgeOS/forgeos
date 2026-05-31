import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, Nfc, Play } from 'lucide-react';
import { Card, Sheet, Badge, Button } from '../components/ui';
import { EXERCISES, EXERCISE_CATEGORIES } from '../data/exercises';
import { MUSCLE_CUES } from '../data/tips';
import type { Exercise } from '../types';
import { haptic } from '../lib/haptics';

export default function Library() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('All');
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [nfcMsg, setNfcMsg] = useState<string | null>(null);

  const list = useMemo(
    () =>
      EXERCISES.filter(
        (e) =>
          (cat === 'All' || e.category === cat) &&
          (e.name.toLowerCase().includes(q.toLowerCase()) || e.primary.toLowerCase().includes(q.toLowerCase())),
      ),
    [q, cat],
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

      <div data-noswipe className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {['All', ...EXERCISE_CATEGORIES].map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${cat === c ? 'bg-accent text-black' : 'bg-surface-2 text-muted'}`}>{c}</button>
        ))}
      </div>

      <p className="text-xs text-muted">{list.length} exercises</p>
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
            <div className="rounded-xl bg-surface-2 p-3">
              <p className="text-[11px] uppercase tracking-wide text-accent-2 mb-1">Form cue</p>
              <p className="text-sm">{MUSCLE_CUES[detail.primary] ?? 'Control the weight through a full range of motion.'}</p>
            </div>
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

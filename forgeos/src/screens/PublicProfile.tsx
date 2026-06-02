import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Flame, Trophy } from 'lucide-react';
import { Card, Button } from '../components/ui';
import { decodeProfile } from '../lib/profileShare';

export default function PublicProfile() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const p = useMemo(() => decodeProfile(params.get('d') ?? ''), [params]);

  return (
    <div className="px-4 pt-12 pb-8 space-y-4">
      <button onClick={() => navigate('/home')} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> Home</button>
      {!p ? (
        <Card><p className="text-sm text-muted">This profile link is invalid or private.</p></Card>
      ) : (
        <>
          <div className="text-center space-y-1 pt-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-surface-2 flex items-center justify-center text-2xl font-extrabold text-accent">{p.name.slice(0, 2).toUpperCase()}</div>
            <h1 className="text-2xl font-extrabold mt-2">{p.name}</h1>
            <p className="text-accent font-semibold">{p.rank}{p.title ? ` · ${p.title}` : ''}</p>
          </div>
          <Card className="grid grid-cols-2 gap-3 text-center">
            <Stat v={p.xp.toLocaleString()} l="XP" />
            <Stat v={`${p.streak}`} l="day streak" icon={<Flame size={14} className="text-accent" />} />
            <Stat v={`${p.sessions}`} l="sessions" />
            <Stat v={`${p.achievements}`} l="achievements" icon={<Trophy size={14} className="text-accent-2" />} />
          </Card>
          {p.bestLifts.length > 0 && (
            <Card className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted mb-1">Top lifts</p>
              {p.bestLifts.map((l) => (
                <div key={l.name} className="flex justify-between text-sm"><span>{l.name}</span><span className="font-mono">{l.e1rm} kg</span></div>
              ))}
            </Card>
          )}
          <Button className="w-full justify-center" onClick={() => navigate('/home')}>Open ForgeOS</Button>
          <p className="text-[11px] text-muted/70 text-center">A shared ForgeOS profile · read-only</p>
        </>
      )}
    </div>
  );
}

function Stat({ v, l, icon }: { v: string; l: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono font-bold text-lg flex items-center justify-center gap-1">{icon}{v}</p>
      <p className="text-[11px] text-muted">{l}</p>
    </div>
  );
}

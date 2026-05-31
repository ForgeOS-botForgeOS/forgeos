import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Download, CheckCircle2 } from 'lucide-react';
import { Card, Button, Badge } from '../components/ui';
import { decodePlan } from '../lib/planShare';
import { useUser } from '../state/userStore';
import { exerciseById } from '../data/exercises';
import { haptic } from '../lib/haptics';

export default function ImportPlan() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setWeekPlan = useUser((s) => s.setWeekPlan);
  const savePlanAs = useUser((s) => s.savePlanAs);
  const [done, setDone] = useState(false);

  const code = params.get('p') ?? '';
  const plan = useMemo(() => (code ? decodePlan(code) : null), [code]);

  function useThisPlan() {
    if (!plan) return;
    setWeekPlan(plan);
    savePlanAs("Friend's shared plan");
    setDone(true);
    haptic('success');
    setTimeout(() => navigate('/plan'), 900);
  }

  return (
    <div className="px-4 pt-12 pb-8 space-y-4">
      <button onClick={() => navigate('/home')} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> Home</button>
      <h1 className="text-2xl font-extrabold">Shared plan</h1>

      {!plan ? (
        <Card><p className="text-sm text-muted">This share link is invalid or empty.</p></Card>
      ) : done ? (
        <Card className="flex items-center gap-3"><CheckCircle2 className="text-success" /><p className="text-sm">Plan imported! Opening the editor…</p></Card>
      ) : (
        <>
          <p className="text-sm text-muted">A friend shared this training week. Preview it, then make it yours.</p>
          <div className="grid grid-cols-7 gap-1">
            {plan.days.map((d) => (
              <div key={d.day} className={`rounded-lg p-2 text-center ${d.rest ? 'bg-surface' : 'bg-accent/15'}`}>
                <p className="text-[10px] text-muted">{d.day}</p>
                <p className="text-[10px] font-semibold mt-1 leading-tight">{d.rest ? 'Rest' : d.label}</p>
              </div>
            ))}
          </div>
          {plan.days.filter((d) => !d.rest).map((d) => (
            <Card key={d.day} className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">{d.day} · {d.label}</p>
                <Badge>{d.exerciseIds.length} ex</Badge>
              </div>
              <p className="text-xs text-muted">{d.exerciseIds.map((id) => exerciseById(id)?.name).filter(Boolean).join(' · ')}</p>
            </Card>
          ))}
          <Button className="w-full justify-center" onClick={useThisPlan}>
            <span className="flex items-center gap-2"><Download size={16} /> Use this plan</span>
          </Button>
          <p className="text-[11px] text-muted/70">It’s also saved to your templates so your current plan isn’t lost.</p>
        </>
      )}
    </div>
  );
}

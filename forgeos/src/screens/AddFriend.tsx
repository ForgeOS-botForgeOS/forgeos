import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus, Check, ArrowRight, Frown } from 'lucide-react';
import { Card, Button } from '../components/ui';
import { ForgeLogo } from '../components/ForgeLogo';
import { useUser } from '../state/userStore';
import { useSocial } from '../state/socialStore';
import { parseInvitePayload, stashPendingInvite } from '../lib/invite';
import { haptic } from '../lib/haptics';
import { toast, celebrate } from '../lib/toast';

// Landing page for a shared invite link (#/add-friend?i=…). Public route so a
// brand-new visitor can open it; if they aren't set up yet we stash the invite
// and apply it the moment onboarding finishes (see App.tsx).
export default function AddFriend() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const onboarded = useUser((s) => s.profile?.onboarded);
  const addFriendByInvite = useSocial((s) => s.addFriendByInvite);

  const payload = useMemo(() => {
    const raw = params.get('i');
    return raw ? parseInvitePayload(raw) : null;
  }, [params]);

  const Frame = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-full px-5 py-12 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-5">
      <div className="mx-auto w-fit"><ForgeLogo size={64} tile /></div>
      {children}
    </div>
  );

  if (!payload) {
    return (
      <Frame>
        <Frown className="mx-auto text-muted" size={36} />
        <h1 className="text-xl font-extrabold">Invite link broken</h1>
        <p className="text-sm text-muted">This invite link is invalid or out of date. Ask your friend to share a fresh one from their Friends tab.</p>
        <Button className="w-full justify-center" onClick={() => navigate(onboarded ? '/social' : '/onboarding')}>
          {onboarded ? 'Go to ForgeOS' : 'Set up ForgeOS'}
        </Button>
      </Frame>
    );
  }

  function accept() {
    if (!payload) return;
    const res = addFriendByInvite(payload);
    if (res === 'self') {
      toast("That's your own invite link 🙂", 'info');
      navigate('/social');
      return;
    }
    if (res === 'duplicate') {
      toast(`${payload.name} is already in your circle`);
      navigate('/social');
      return;
    }
    haptic('success');
    celebrate();
    toast(`${payload.name} is now your gym partner 🤝`);
    navigate('/social');
  }

  function setupFirst() {
    if (!payload) return;
    stashPendingInvite(payload); // applied right after onboarding
    haptic('tap');
    navigate('/onboarding');
  }

  const initials = payload.seed || payload.name.slice(0, 2).toUpperCase();

  return (
    <Frame>
      <Card className="w-full space-y-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center text-xl font-bold text-accent">{initials}</div>
          <div>
            <p className="text-lg font-extrabold">{payload.name}</p>
            <p className="text-sm text-accent">{payload.rank} · {payload.xp.toLocaleString()} XP{payload.streak ? ` · 🔥 ${payload.streak}` : ''}</p>
          </div>
          <p className="text-sm text-muted">wants to train with you on ForgeOS.</p>
        </div>

        {onboarded ? (
          <div className="space-y-2">
            <Button className="w-full justify-center" onClick={accept}>
              <span className="flex items-center gap-1.5"><UserPlus size={16} /> Add {payload.name}</span>
            </Button>
            <Button variant="ghost" className="w-full justify-center" onClick={() => navigate('/social')}>Not now</Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Button className="w-full justify-center" onClick={setupFirst}>
              <span className="flex items-center gap-1.5">Set up ForgeOS to add them <ArrowRight size={16} /></span>
            </Button>
            <p className="text-[11px] text-muted flex items-center justify-center gap-1"><Check size={12} /> We'll add {payload.name} automatically once you're in.</p>
          </div>
        )}
      </Card>
    </Frame>
  );
}

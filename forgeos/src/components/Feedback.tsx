import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bug, Lightbulb, Check, Loader2, MessageSquarePlus } from 'lucide-react';
import { Sheet, Button } from './ui';
import { haptic } from '../lib/haptics';
import { useT } from '../lib/i18n';
import { FEEDBACK_MAX, FEEDBACK_MIN, sendFeedback, type FeedbackKind, type SendResult } from '../lib/feedback';

// Telling the person who built this that something is broken, or missing.
//
// Deliberately quiet: a muted line of text at the bottom of a screen, not a
// floating button. Someone who is annoyed enough to report a bug will read the
// bottom of the screen; everyone else should never notice it. It sits in the
// same place in both Apprentice Mode and Full Forge, so "where do I complain"
// has one answer that survives switching modes.

/** The entry point. One line, muted, at the end of a screen. */
export function FeedbackLink({ className = '' }: { className?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => { setOpen(true); haptic('tap'); }}
        className={`w-full flex items-center justify-center gap-1.5 py-2 text-[11px] text-muted/70 hover:text-muted transition ${className}`}
      >
        <MessageSquarePlus size={12} /> {t('fb.link')}
      </button>
      <FeedbackSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function FeedbackSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const location = useLocation();
  const [kind, setKind] = useState<FeedbackKind>('bug');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);

  useEffect(() => {
    if (open) { setBody(''); setResult(null); setBusy(false); setKind('bug'); }
  }, [open]);

  async function submit() {
    setBusy(true);
    const r = await sendFeedback({ kind, body, screen: location.pathname });
    setBusy(false);
    setResult(r);
    if (r === 'sent' || r === 'queued') {
      haptic('success');
      setTimeout(onClose, 1600);
    } else {
      haptic('warning');
    }
  }

  const done = result === 'sent' || result === 'queued';

  return (
    <Sheet open={open} onClose={onClose} title={t('fb.title')}>
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15"><Check className="text-success" size={30} /></div>
          {/* "Queued" is said out loud rather than dressed up as success. */}
          <p className="font-semibold">{result === 'sent' ? t('fb.thanks') : t('fb.queued')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Choice active={kind === 'bug'} icon={<Bug size={15} />} label={t('fb.bug')} onClick={() => setKind('bug')} />
            <Choice active={kind === 'idea'} icon={<Lightbulb size={15} />} label={t('fb.idea')} onClick={() => setKind('idea')} />
          </div>
          <textarea
            autoFocus
            rows={5}
            value={body}
            maxLength={FEEDBACK_MAX}
            onChange={(e) => setBody(e.target.value)}
            placeholder={kind === 'bug' ? t('fb.bugHint') : t('fb.ideaHint')}
            className="w-full resize-none rounded-xl bg-surface-2 border border-line px-3 py-2.5 text-sm outline-none focus:border-accent/60"
          />
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted/70">{t('fb.attached')}</p>
            <span className="text-[10px] font-mono text-muted/60">{body.length}/{FEEDBACK_MAX}</span>
          </div>
          {result === 'too-short' && <p className="text-[11px] text-danger">{t('fb.tooShort')}</p>}
          {result === 'too-fast' && <p className="text-[11px] text-danger">{t('fb.tooFast')}</p>}
          <Button className="w-full justify-center" disabled={busy || body.trim().length < FEEDBACK_MIN} onClick={() => void submit()}>
            <span className="flex items-center gap-2">{busy ? <Loader2 size={15} className="animate-spin" /> : null} {t('fb.send')}</span>
          </Button>
        </div>
      )}
    </Sheet>
  );
}

function Choice({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition active:scale-[0.98] ${active ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-surface-2 text-muted'}`}
    >
      {icon} {label}
    </button>
  );
}

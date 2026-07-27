import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Send, Sparkles, ShieldCheck, Trash2, Brain, WifiOff, X, Plus, Info } from 'lucide-react';
import { Card, Button, Sheet, Badge, Pill, SectionTitle } from '../components/ui';
import { useTrainerSnapshot } from '../state/useTrainerSnapshot';
import { useTrainer } from '../state/trainerStore';
import { SPECIALISTS, STARTERS, askTrainer, contextDisclosure, trainerIsLive } from '../lib/trainer';
import { TRAINER_AGREEMENT, TRAINER_AGREEMENT_SUMMARY } from '../data/trainerAgreement';
import { useT } from '../lib/i18n';
import { haptic } from '../lib/haptics';
import { toast } from '../lib/toast';

/**
 * Talk to your trainer — one chat, four specialists, your own data.
 *
 * The consent gate is not decoration: until the agreement is accepted, every
 * answer is produced on-device by the offline trainer and nothing is sent
 * anywhere. Accepting only ever widens what is possible, never narrows it.
 */
export default function Trainer() {
  const navigate = useNavigate();
  const t = useT();
  const snapshot = useTrainerSnapshot();
  const messages = useTrainer((s) => s.messages);
  const memory = useTrainer((s) => s.memory);
  const addMessage = useTrainer((s) => s.addMessage);
  const clearMessages = useTrainer((s) => s.clearMessages);
  const remember = useTrainer((s) => s.remember);
  const forget = useTrainer((s) => s.forget);
  const acceptAgreement = useTrainer((s) => s.acceptAgreement);
  const withdrawConsent = useTrainer((s) => s.withdrawConsent);
  const consent = useTrainer((s) => s.consent);
  const hasConsent = useTrainer((s) => s.hasConsent)();
  const setLastSource = useTrainer((s) => s.setLastSource);

  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [newFact, setNewFact] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  const disclosure = useMemo(() => contextDisclosure(snapshot), [snapshot]);
  const online = hasConsent && trainerIsLive;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, busy]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setDraft('');
    addMessage({ role: 'user', content: q });
    setBusy(true);
    haptic('tap');
    try {
      const reply = await askTrainer({
        question: q,
        history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        snapshot,
        consented: hasConsent,
      });
      addMessage({ role: 'assistant', content: reply.text, specialist: reply.specialist, source: reply.source, model: reply.model });
      setLastSource(reply.source);
      if (reply.degradedReason) toast(t('trainer.degraded'), 'info');
    } catch {
      addMessage({ role: 'assistant', content: t('trainer.failed'), source: 'offline' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-4 pt-12 pb-2 space-y-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> {t('common.back')}</button>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-extrabold">{t('trainer.title')}</h1>
            <p className="text-xs text-muted">{t('trainer.subtitle')}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={() => setMemoryOpen(true)} aria-label={t('trainer.memory')} className="relative grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-muted">
              <Brain size={16} />
              {memory.length > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent-2 px-1 text-[10px] font-bold text-black">{memory.length}</span>}
            </button>
            {messages.length > 0 && (
              <button
                onClick={() => { clearMessages(); haptic('warning'); toast(t('trainer.cleared')); }}
                aria-label={t('trainer.clear')}
                className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-muted"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Where answers are coming from — never a mystery */}
        <button onClick={() => setAgreementOpen(true)} className="flex w-full items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-left">
          {online ? <ShieldCheck size={14} className="shrink-0 text-success" /> : <WifiOff size={14} className="shrink-0 text-warn" />}
          <span className="flex-1 text-[11px] leading-snug text-muted">
            {online ? t('trainer.modeOnline') : hasConsent ? t('trainer.modeNoWorker') : t('trainer.modeOffline')}
          </span>
          <Info size={13} className="shrink-0 text-muted" />
        </button>
      </div>

      {/* Conversation */}
      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-4 pb-2">
        {messages.length === 0 && (
          <div className="space-y-3 py-2">
            <Card className="space-y-2 bg-surface-2">
              <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={15} className="text-accent" /> {t('trainer.emptyTitle')}</p>
              <p className="text-xs text-muted">{t('trainer.emptyBody')}</p>
            </Card>
            <div className="space-y-1.5">
              {STARTERS.map((s) => (
                <button
                  key={s.question}
                  onClick={() => send(s.question)}
                  className="flex w-full items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-left text-xs"
                >
                  <span>{SPECIALISTS[s.specialist].icon}</span>
                  <span className="flex-1">{s.question}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2 py-2">
          {messages.map((m) => (
            <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${m.role === 'user' ? 'bg-accent text-black' : 'bg-surface-2'}`}>
                {m.role === 'assistant' && m.specialist && (
                  <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-accent-2">
                    {SPECIALISTS[m.specialist].icon} {SPECIALISTS[m.specialist].label}
                    {m.source === 'offline' && <span className="font-normal normal-case text-muted"> · {t('trainer.offlineTag')}</span>}
                  </p>
                )}
                <p className="whitespace-pre-wrap text-sm leading-snug">{m.content}</p>
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-surface-2 px-3 py-2">
                <p className="flex items-center gap-2 text-sm text-muted"><Sparkles size={14} className="animate-pulse text-accent" /> {t('trainer.thinking')}</p>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Composer */}
      <div className="shrink-0 space-y-2 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur">
        {!hasConsent && (
          <button onClick={() => setAgreementOpen(true)} className="w-full rounded-xl border border-dashed border-accent/60 px-3 py-2 text-[11px] text-accent">
            {t('trainer.enableCta')}
          </button>
        )}
        <div className="flex items-end gap-2">
          <textarea
            data-noswipe
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(draft); } }}
            placeholder={t('trainer.placeholder')}
            rows={1}
            className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm outline-none"
          />
          <button
            onClick={() => send(draft)}
            disabled={!draft.trim() || busy}
            aria-label={t('trainer.send')}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-black disabled:opacity-40"
          >
            <Send size={17} />
          </button>
        </div>
        <p className="text-center text-[10px] text-muted/70">{t('trainer.footer')}</p>
      </div>

      {/* ---- The agreement ---- */}
      <Sheet open={agreementOpen} onClose={() => setAgreementOpen(false)} title={t('trainer.agreementTitle')}>
        <div className="space-y-3">
          <Card className="space-y-1 bg-surface-2">
            <p className="text-[11px] uppercase tracking-wide text-accent-2">{t('trainer.whatIsSent')}</p>
            <ul className="space-y-0.5">
              {disclosure.map((d) => (
                <li key={d} className="flex gap-1.5 text-xs"><span className="text-accent">•</span><span>{d}</span></li>
              ))}
            </ul>
          </Card>

          <div className="max-h-[42vh] space-y-3 overflow-y-auto no-scrollbar">
            {TRAINER_AGREEMENT.map((s) => (
              <div key={s.heading}>
                <p className="text-xs font-bold">{s.heading}</p>
                <p className="text-xs leading-relaxed text-muted">{s.body}</p>
              </div>
            ))}
          </div>

          {hasConsent ? (
            <>
              <p className="text-[11px] text-success">
                {t('trainer.acceptedOn', { date: consent ? new Date(consent.atISO).toLocaleDateString() : '' })}
              </p>
              <Button
                variant="outline"
                className="w-full justify-center"
                onClick={() => { withdrawConsent(); haptic('warning'); toast(t('trainer.withdrawn')); setAgreementOpen(false); }}
              >
                {t('trainer.withdraw')}
              </Button>
            </>
          ) : (
            <>
              <Button
                className="w-full justify-center"
                onClick={() => { acceptAgreement(); haptic('success'); toast(t('trainer.accepted')); setAgreementOpen(false); }}
              >
                {t('trainer.agree')}
              </Button>
              <Button variant="ghost" className="w-full justify-center" onClick={() => setAgreementOpen(false)}>
                {t('trainer.stayOffline')}
              </Button>
            </>
          )}
          <p className="text-[10px] text-muted/70">{TRAINER_AGREEMENT_SUMMARY}</p>
        </div>
      </Sheet>

      {/* ---- What the trainer remembers ---- */}
      <Sheet open={memoryOpen} onClose={() => setMemoryOpen(false)} title={t('trainer.memory')}>
        <div className="space-y-3">
          <p className="text-xs text-muted">{t('trainer.memoryHelp')}</p>
          <div className="flex gap-2">
            <input
              value={newFact}
              onChange={(e) => setNewFact(e.target.value)}
              placeholder={t('trainer.memoryPlaceholder')}
              className="flex-1 rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={() => { if (remember(newFact)) { setNewFact(''); haptic('success'); } else haptic('warning'); }}
              aria-label={t('common.add')}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-black"
            >
              <Plus size={16} />
            </button>
          </div>
          {memory.length === 0 ? (
            <p className="text-sm text-muted">{t('trainer.memoryEmpty')}</p>
          ) : (
            <div className="space-y-1.5">
              {memory.map((f) => (
                <div key={f} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
                  <span className="flex-1 text-sm">{f}</span>
                  <button onClick={() => { forget(f); haptic('tap'); }} aria-label={t('trainer.forget')} className="text-muted"><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
          <SectionTitle>{t('trainer.specialistsTitle')}</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {Object.values(SPECIALISTS).map((s) => (
              <Badge key={s.id} color="rgb(var(--muted))">{s.icon} {s.label}</Badge>
            ))}
          </div>
          <p className="text-[11px] text-muted/70">{t('trainer.specialistsHelp')}</p>
          {memory.length > 0 && (
            <Pill onClick={() => { useTrainer.getState().clearMemory(); haptic('warning'); }}>{t('trainer.forgetAll')}</Pill>
          )}
        </div>
      </Sheet>
    </div>
  );
}

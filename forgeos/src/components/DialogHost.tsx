import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, HelpCircle, Pencil } from 'lucide-react';
import { Button } from './ui';
import { haptic } from '../lib/haptics';
import { useT } from '../lib/i18n';
import { MAX_INPUT, useDialog } from '../lib/dialog';

// The one place the app asks a question. Mounted once in App.tsx; every
// askConfirm/askText call anywhere renders here.
//
// Centred rather than a bottom sheet on purpose: a Sheet is for browsing a list
// you can flick away, a dialog is a decision that should stop you. It is a real
// modal — labelled, Escape-dismissible, focus moved in on open and returned to
// wherever you were when it closes.

export function DialogHost() {
  const t = useT();
  const current = useDialog((s) => s.current);
  const close = useDialog((s) => s.close);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<Element | null>(null);

  const req = current?.request;
  const isText = req?.kind === 'text';

  useEffect(() => {
    if (!current) return;
    returnFocus.current = document.activeElement;
    setValue(req?.kind === 'text' ? req.defaultValue ?? '' : '');
    // A frame's delay lets the entry animation start before focus scrolls it.
    const id = window.setTimeout(() => (inputRef.current ?? confirmRef.current)?.focus(), 60);
    return () => {
      window.clearTimeout(id);
      (returnFocus.current as HTMLElement | null)?.focus?.();
    };
  }, [current, req]);

  // Escape always means "back out", whatever kind of dialog is open.
  useEffect(() => {
    if (!current || !req) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      haptic('tap');
      close(current.id, req.kind === 'confirm' ? false : null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [current, req, close]);

  if (!current || !req) return null;

  const cancel = () => { haptic('tap'); close(current.id, req.kind === 'confirm' ? false : null); };
  const trimmed = value.trim();
  const blocked = isText && req.required === true && trimmed === '';
  const submit = () => {
    if (blocked) return;
    haptic('tap');
    close(current.id, req.kind === 'confirm' ? true : trimmed);
  };

  const danger = req.kind === 'confirm' && req.tone === 'danger';
  const Icon = danger ? AlertTriangle : isText ? Pencil : HelpCircle;

  const tree = (
    <AnimatePresence>
      <div className="absolute inset-0 z-[95] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={cancel}
          className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
          aria-describedby={req.body ? 'dialog-body' : undefined}
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          className="fx-card relative w-full max-w-[19rem] rounded-2xl border border-line bg-surface p-5 shadow-2xl"
        >
          <div
            className={`mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full ${danger ? 'bg-danger/15 text-danger' : 'bg-accent/15 text-accent'}`}
            aria-hidden="true"
          >
            <Icon size={21} />
          </div>
          <h2 id="dialog-title" className="text-center text-base font-bold leading-snug">{req.title}</h2>
          {req.body && <p id="dialog-body" className="mt-1.5 text-center text-[13px] leading-relaxed text-muted">{req.body}</p>}

          {isText && (
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value.slice(0, req.maxLength ?? MAX_INPUT))}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              inputMode={req.numeric ? 'decimal' : 'text'}
              placeholder={req.placeholder}
              aria-label={req.title}
              className="fx-field mt-4 w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent/70"
            />
          )}

          {/* items-stretch + nowrap: a two-word confirm label used to wrap and
              leave the two buttons visibly different heights. */}
          <div className="mt-5 flex items-stretch gap-2">
            <Button variant="ghost" className="flex-1 justify-center whitespace-nowrap" onClick={cancel}>
              {req.cancelLabel ?? t('common.cancel')}
            </Button>
            <Button
              ref={confirmRef}
              variant={danger ? 'danger' : 'primary'}
              disabled={blocked}
              className="flex-1 justify-center whitespace-nowrap"
              onClick={submit}
            >
              {req.confirmLabel ?? t('common.save')}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  const root = document.getElementById('phone-root');
  return root ? createPortal(tree, root) : tree;
}

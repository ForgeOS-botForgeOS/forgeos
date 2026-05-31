import { useState } from 'react';
import { Download, Share, Plus, X, CheckCircle2 } from 'lucide-react';
import { useInstall } from '../lib/pwaInstall';
import { haptic } from '../lib/haptics';

// A prominent "Install app" CTA. Uses the native prompt on Android/desktop
// Chrome; shows Add-to-Home-Screen steps on iOS; hides once installed.
export function InstallButton({ variant = 'big' }: { variant?: 'big' | 'banner' }) {
  const { canInstall, promptInstall, standalone, ios } = useInstall();
  const [iosOpen, setIosOpen] = useState(false);
  const [done, setDone] = useState(false);

  if (standalone || done) return null; // already installed / running as app
  // The banner only appears when an install is actually possible (or on iOS,
  // which needs manual Add-to-Home-Screen); the big button always shows.
  if (variant === 'banner' && !canInstall && !ios) return null;

  async function onClick() {
    haptic('tap');
    if (ios) {
      setIosOpen(true);
      return;
    }
    const outcome = await promptInstall();
    if (outcome === 'accepted') {
      setDone(true);
      haptic('success');
    } else if (outcome === 'unavailable') {
      // No prompt yet (e.g. desktop or not eligible) — guide via menu.
      setIosOpen(true);
    }
  }

  const label = 'Install ForgeOS app';

  return (
    <>
      {variant === 'big' ? (
        <button
          onClick={onClick}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-accent text-black font-bold py-4 text-base shadow-glow active:scale-[0.98] transition"
        >
          <Download size={20} /> {label}
        </button>
      ) : (
        <button
          onClick={onClick}
          className="w-full flex items-center justify-between rounded-xl bg-accent/15 border border-accent/40 px-4 py-3 active:scale-[0.99] transition"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-accent">
            <Download size={16} /> Install ForgeOS on your phone
          </span>
          <span className="text-[11px] text-muted">tap</span>
        </button>
      )}

      {iosOpen && (
        <div className="absolute inset-0 z-[70] flex items-end" onClick={() => setIosOpen(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative w-full rounded-t-2xl bg-surface border-t border-line p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-4 right-4 text-muted" onClick={() => setIosOpen(false)}><X size={18} /></button>
            <h3 className="text-lg font-bold mb-3">Add ForgeOS to your home screen</h3>
            {ios ? (
              <ol className="space-y-3 text-sm">
                <li className="flex items-center gap-3"><Share className="text-accent shrink-0" size={20} /> Tap the <b>Share</b> button in Safari’s toolbar.</li>
                <li className="flex items-center gap-3"><Plus className="text-accent shrink-0" size={20} /> Choose <b>Add to Home Screen</b>.</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="text-accent shrink-0" size={20} /> Tap <b>Add</b> — ForgeOS lands on your home screen.</li>
              </ol>
            ) : (
              <p className="text-sm text-muted">
                In your browser menu (⋮), choose <b>Install app</b> or <b>Add to Home screen</b>. If you don’t see it,
                your browser may not support installs — try Chrome or Edge.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

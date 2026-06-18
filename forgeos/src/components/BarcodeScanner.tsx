import { useEffect, useRef, useState } from 'react';
import { Loader2, ScanLine, Check } from 'lucide-react';
import { Sheet, Button } from './ui';
import { haptic } from '../lib/haptics';
import { toast } from '../lib/toast';
import { lookupBarcode, portionToItem, barcodeDetectorSupported, createDetector, type BarcodeProduct } from '../lib/barcode';
import type { FoodItem } from '../types';

// Barcode → exact macros. Live camera scan where the Web BarcodeDetector exists,
// otherwise type the number. Confirms the portion (grams) before logging.
export function BarcodeScanner({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (item: FoodItem) => void }) {
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [grams, setGrams] = useState(100);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const liveSupported = barcodeDetectorSupported();

  async function resolve(code: string) {
    setBusy(true);
    const p = await lookupBarcode(code);
    setBusy(false);
    if (!p) { haptic('warning'); toast('Product not found in the database.', 'error'); return; }
    haptic('success');
    setProduct(p);
    setGrams(p.servingG && p.servingG > 0 ? Math.round(p.servingG) : 100);
    stopCamera();
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  // Run the live camera + detection loop while the sheet is open and no product
  // is being reviewed.
  useEffect(() => {
    if (!open || product || !liveSupported) return;
    let raf = 0;
    let cancelled = false;
    const detector = createDetector();
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        const tick = async () => {
          if (cancelled || !videoRef.current || !detector) return;
          try {
            const hits = await detector.detect(videoRef.current);
            if (hits[0]?.rawValue) { cancelled = true; resolve(hits[0].rawValue); return; }
          } catch { /* frame not ready */ }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch { /* camera denied — manual entry still works */ }
    })();
    return () => { cancelled = true; cancelAnimationFrame(raf); stopCamera(); };
    // `resolve` is intentionally omitted: it's re-created each render, so adding
    // it would needlessly tear down and restart the camera on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product, liveSupported]);

  useEffect(() => { if (!open) { setProduct(null); setManual(''); stopCamera(); } }, [open]);

  return (
    <Sheet open={open} onClose={onClose} title="Scan a barcode">
      {product ? (
        <div className="space-y-3">
          <div>
            <p className="font-semibold">{product.name}</p>
            {product.brand && <p className="text-[11px] text-muted">{product.brand}</p>}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Portion (g)</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setGrams((g) => Math.max(5, g - 10))} className="w-8 h-8 rounded-md bg-surface-2">−</button>
              <input type="number" value={grams} onChange={(e) => setGrams(Math.max(1, Number(e.target.value) || 0))} className="w-16 rounded-lg bg-surface-2 border border-line px-2 py-1.5 text-sm text-center font-mono" />
              <button onClick={() => setGrams((g) => g + 10)} className="w-8 h-8 rounded-md bg-surface-2">+</button>
            </div>
          </div>
          {(() => { const it = portionToItem(product, grams); return (
            <div className="grid grid-cols-5 gap-1.5 text-center">
              {[['kcal', it.calories], ['P', it.proteinG], ['C', it.carbsG], ['F', it.fatG], ['sug', it.sugarG]].map(([l, v]) => (
                <div key={l} className="rounded-lg bg-surface-2 py-1.5"><p className="font-mono text-sm font-bold">{v}</p><p className="text-[10px] text-muted">{l}</p></div>
              ))}
            </div>
          ); })()}
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1 justify-center" onClick={() => setProduct(null)}>Scan another</Button>
            <Button className="flex-1 justify-center gap-1" onClick={() => { onAdd(portionToItem(product, grams)); haptic('success'); toast(`Added ${product.name}`); onClose(); }}><Check size={15} /> Add to log</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {liveSupported ? (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
              <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3/4 h-16 border-2 border-accent/80 rounded-lg" />
              </div>
              <p className="absolute bottom-2 inset-x-0 text-center text-[11px] text-white/80 flex items-center justify-center gap-1"><ScanLine size={12} /> Point at a barcode</p>
            </div>
          ) : (
            <p className="text-[11px] text-muted">Live scanning isn’t available on this browser — type the number under the barcode instead.</p>
          )}
          <div className="flex gap-2">
            <input value={manual} onChange={(e) => setManual(e.target.value)} inputMode="numeric" placeholder="Barcode number" className="flex-1 rounded-xl bg-surface-2 border border-line px-4 py-2.5 text-sm font-mono" />
            <Button disabled={busy || manual.replace(/\D/g, '').length < 6} onClick={() => resolve(manual)}>{busy ? <Loader2 size={16} className="animate-spin" /> : 'Look up'}</Button>
          </div>
          <p className="text-[11px] text-muted/70 text-center">Exact macros from Open Food Facts.</p>
        </div>
      )}
    </Sheet>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Loader2, ScanLine, Check, Flashlight, CameraOff, RefreshCw, Pencil } from 'lucide-react';
import { Sheet, Button } from './ui';
import { haptic } from '../lib/haptics';
import { toast } from '../lib/toast';
import { useT } from '../lib/i18n';
import { lookupBarcode, portionToItem, isPlausibleBarcode, type BarcodeProduct, type LookupFailure } from '../lib/barcode';
import { recentProducts } from '../lib/barcodeCache';
import { useBarcodeCamera, type BarcodeCamera, type CameraState } from '../state/useBarcodeCamera';
import type { FoodItem } from '../types';

// Barcode → exact macros. Live camera scan, with typing the number as the
// fallback that always works. Confirms the portion (grams) before logging.
//
// Every dead end says what happened and what to do about it: a scanner that
// shows a black rectangle, or blames the database when the camera was refused,
// is the thing that made this feature look broken.

const PORTION_STEP = 10;
const MIN_PORTION_G = 5;

export function BarcodeScanner({
  open,
  onClose,
  onAdd,
  onManualEntry,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (item: FoodItem) => void;
  /** Offered when a product cannot be resolved, so the scan is not a dead end. */
  onManualEntry?: () => void;
}) {
  const t = useT();
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState(false);
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [grams, setGrams] = useState(100);
  const [failure, setFailure] = useState<{ reason: LookupFailure; name?: string } | null>(null);

  const resolve = useCallback(async (code: string) => {
    setBusy(true);
    setFailure(null);
    const result = await lookupBarcode(code);
    setBusy(false);
    if (!result.ok) {
      haptic('warning');
      setFailure({ reason: result.reason, name: result.name });
      return;
    }
    haptic('success');
    setProduct(result.product);
    setFromCache(!!result.fromCache);
    setGrams(result.product.servingG && result.product.servingG > 0 ? Math.round(result.product.servingG) : 100);
  }, []);

  // The camera runs only while the sheet is open, nothing is being reviewed and
  // no lookup is in flight — so it is released the moment it is not needed.
  // Dropping it during the lookup means a failed scan restarts the camera (a
  // brief "starting" flicker); that is the trade for never holding the camera
  // while we are not looking at it, and for making it impossible to fire a
  // second lookup off the same barcode still sitting in frame.
  const cam = useBarcodeCamera({ active: open && !product && !busy, onCode: (code) => void resolve(code) });

  // Re-read when the sheet opens, and after a scan has added one.
  const [recents, setRecents] = useState<BarcodeProduct[]>([]);
  useEffect(() => {
    setRecents(open ? recentProducts() : []);
  }, [open, product]);

  useEffect(() => {
    if (open) return;
    setProduct(null);
    setManual('');
    setFailure(null);
    setFromCache(false);
  }, [open]);

  function addProduct(p: BarcodeProduct, portion: number) {
    onAdd(portionToItem(p, portion));
    haptic('success');
    toast(t('scan.added', { name: p.name }));
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('scan.title')}>
      {product ? (
        <ProductReview
          product={product}
          grams={grams}
          setGrams={setGrams}
          fromCache={fromCache}
          onBack={() => setProduct(null)}
          onAdd={() => addProduct(product, grams)}
        />
      ) : (
        <div className="space-y-3">
          <Viewfinder cam={cam} busy={busy} />

          {failure && (
            <FailureNote
              failure={failure}
              onManualEntry={
                onManualEntry && (failure.reason === 'not-found' || failure.reason === 'no-nutrition')
                  ? () => {
                      onClose();
                      onManualEntry();
                    }
                  : undefined
              }
            />
          )}

          <div className="flex gap-2">
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              inputMode="numeric"
              aria-label={t('scan.manualLabel')}
              placeholder={t('scan.manualLabel')}
              className="flex-1 rounded-xl bg-surface-2 border border-line px-4 py-2.5 text-sm font-mono"
            />
            <Button disabled={busy || !isPlausibleBarcode(manual)} onClick={() => void resolve(manual)}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : t('scan.lookup')}
            </Button>
          </div>
          {manual.replace(/\D/g, '').length >= 8 && !isPlausibleBarcode(manual) && (
            <p className="text-[11px] text-danger">{t('scan.invalidDigits')}</p>
          )}

          {recents.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-muted">{t('scan.recent')}</p>
              <div className="flex flex-wrap gap-1.5">
                {recents.map((p) => (
                  <button
                    key={p.code}
                    onClick={() => {
                      setProduct(p);
                      setFromCache(false);
                      setGrams(p.servingG && p.servingG > 0 ? Math.round(p.servingG) : 100);
                    }}
                    className="rounded-lg bg-surface-2 border border-line px-2.5 py-1.5 text-[11px] max-w-[48%] truncate"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-muted/70 text-center">{t('scan.source')}</p>
        </div>
      )}
    </Sheet>
  );
}

/**
 * The camera picture, or a plain explanation of why there isn't one.
 *
 * The <video> is never unmounted while the camera is active — only hidden —
 * because the hook attaches the stream to that exact element, and "try again"
 * after a refused permission needs it to still be there.
 */
function Viewfinder({ cam, busy }: { cam: BarcodeCamera; busy: boolean }) {
  const t = useT();
  const live = cam.state === 'live' || cam.state === 'starting';

  return (
    <>
      <div className={live ? 'relative rounded-xl overflow-hidden bg-black aspect-[4/3]' : 'hidden'}>
        <video ref={cam.videoRef} muted playsInline className="w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-3/4 h-16 border-2 border-accent/80 rounded-lg" />
        </div>
        {cam.canTorch && (
          <button
            onClick={cam.toggleTorch}
            aria-label={t('scan.torch')}
            aria-pressed={cam.torchOn}
            className={`absolute top-2 right-2 w-9 h-9 rounded-full grid place-items-center ${cam.torchOn ? 'bg-accent text-black' : 'bg-black/50 text-white'}`}
          >
            <Flashlight size={15} />
          </button>
        )}
        <p className="absolute bottom-2 inset-x-0 text-center text-[11px] text-white/80 flex items-center justify-center gap-1">
          {busy ? (
            <>
              <Loader2 size={12} className="animate-spin" /> {t('scan.looking')}
            </>
          ) : cam.state === 'starting' ? (
            <>
              <Loader2 size={12} className="animate-spin" /> {t('scan.starting')}
            </>
          ) : (
            <>
              <ScanLine size={12} /> {t('scan.aim')}
            </>
          )}
        </p>
      </div>

      {!live && (
        <div className="rounded-xl bg-surface-2 border border-line p-3 flex gap-2.5">
          <CameraOff size={16} className="text-muted shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-[11px] text-muted">{t(cameraMessageKey(cam.state))}</p>
            {(cam.state === 'denied' || cam.state === 'unavailable') && (
              <button onClick={cam.retry} className="text-[11px] text-accent flex items-center gap-1">
                <RefreshCw size={11} /> {t('scan.retryCamera')}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function cameraMessageKey(state: CameraState): string {
  if (state === 'denied') return 'scan.denied';
  if (state === 'insecure') return 'scan.insecure';
  if (state === 'nodetector') return 'scan.noDecoder';
  return 'scan.noCamera';
}

function FailureNote({
  failure,
  onManualEntry,
}: {
  failure: { reason: LookupFailure; name?: string };
  onManualEntry?: () => void;
}) {
  const t = useT();
  const key = `scan.fail.${failure.reason}`;
  return (
    <div className="rounded-xl bg-surface-2 border border-line p-3 space-y-2">
      <p className="text-[11px] text-muted">{t(key, { name: failure.name ?? '' })}</p>
      {onManualEntry && (
        <button onClick={onManualEntry} className="text-[11px] text-accent flex items-center gap-1">
          <Pencil size={11} /> {t('scan.addByHand')}
        </button>
      )}
    </div>
  );
}

function ProductReview({
  product,
  grams,
  setGrams,
  fromCache,
  onBack,
  onAdd,
}: {
  product: BarcodeProduct;
  grams: number;
  setGrams: (n: number) => void;
  fromCache: boolean;
  onBack: () => void;
  onAdd: () => void;
}) {
  const t = useT();
  const item = portionToItem(product, grams);
  return (
    <div className="space-y-3">
      <div>
        <p className="font-semibold">{product.name}</p>
        {product.brand && <p className="text-[11px] text-muted">{product.brand}</p>}
        {fromCache && <p className="text-[11px] text-muted/70">{t('scan.fromCache')}</p>}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{t('scan.portion')}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setGrams(Math.max(MIN_PORTION_G, grams - PORTION_STEP))}
            aria-label={t('scan.less')}
            className="w-8 h-8 rounded-md bg-surface-2"
          >
            −
          </button>
          <input
            type="number"
            value={grams}
            aria-label={t('scan.portion')}
            onChange={(e) => setGrams(Math.max(1, Number(e.target.value) || 0))}
            className="w-16 rounded-lg bg-surface-2 border border-line px-2 py-1.5 text-sm text-center font-mono"
          />
          <button onClick={() => setGrams(grams + PORTION_STEP)} aria-label={t('scan.more')} className="w-8 h-8 rounded-md bg-surface-2">
            +
          </button>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-1.5 text-center">
        {([['kcal', item.calories], ['P', item.proteinG], ['C', item.carbsG], ['F', item.fatG], ['sug', item.sugarG]] as const).map(
          ([label, value]) => (
            <div key={label} className="rounded-lg bg-surface-2 py-1.5">
              <p className="font-mono text-sm font-bold">{value}</p>
              <p className="text-[10px] text-muted">{label}</p>
            </div>
          ),
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1 justify-center" onClick={onBack}>
          {t('scan.another')}
        </Button>
        <Button className="flex-1 justify-center gap-1" onClick={onAdd}>
          <Check size={15} /> {t('scan.add')}
        </Button>
      </div>
    </div>
  );
}

import { canonicalCode, gtinCheckDigitOk } from './barcode';

// Getting a number out of the camera.
//
// Two engines, same shape. The browser's own BarcodeDetector when it really
// works, and a WebAssembly build of ZXing when it does not — which is most
// places: BarcodeDetector only exists on Android, ChromeOS and Chrome on macOS,
// so on an iPhone or a desktop the native path is simply absent.
//
// `typeof BarcodeDetector === 'function'` is NOT enough to use it. On Android
// the implementation is backed by a Play Services module that can be missing or
// still downloading, and then the constructor exists while
// getSupportedFormats() returns nothing — a camera that scans forever and never
// reads. So we ask what it supports and believe the answer, not the interface.

/** The 1D symbologies food packaging actually uses. */
const WANTED = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'];
/** Without this one there is no point starting a camera for groceries. */
const ESSENTIAL = 'ean_13';

export type ScanEngine = 'native' | 'wasm';

export interface Scanner {
  engine: ScanEngine;
  /** Raw values found in the frame; never throws. */
  detect(source: CanvasImageSource): Promise<string[]>;
}

interface DetectedBarcode {
  rawValue: string;
}
interface DetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
interface DetectorCtor {
  new (opts?: { formats?: string[] }): DetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
}

function wrap(detector: DetectorLike, engine: ScanEngine): Scanner {
  return {
    engine,
    async detect(source) {
      try {
        return (await detector.detect(source)).map((b) => b.rawValue).filter(Boolean);
      } catch {
        // A frame that is not ready yet, or a decode that blew up: not fatal,
        // the next frame is milliseconds away.
        return [];
      }
    },
  };
}

async function tryNative(): Promise<Scanner | null> {
  const Ctor = (globalThis as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
  if (typeof Ctor !== 'function') return null;
  try {
    const supported = (await Ctor.getSupportedFormats?.()) ?? [];
    if (!supported.includes(ESSENTIAL)) return null;
    // Passing a format the platform does not know throws, so intersect first.
    return wrap(new Ctor({ formats: WANTED.filter((f) => supported.includes(f)) }), 'native');
  } catch {
    return null;
  }
}

async function tryWasm(): Promise<Scanner | null> {
  try {
    // Both loaded on demand: ~1 MB of WebAssembly that an Android phone with a
    // working native detector never downloads.
    const [{ BarcodeDetector, setZXingModuleOverrides }, { default: wasmUrl }] = await Promise.all([
      import('barcode-detector/ponyfill'),
      import('zxing-wasm/reader/zxing_reader.wasm?url'),
    ]);
    // Serve the binary from our own origin. The default points at a public CDN,
    // which would break offline and add a third party to the trust list.
    //
    // zxing-wasm is pinned to the exact version barcode-detector's bundled glue
    // expects (3.1.1) and declared as a direct dependency for that reason: a
    // mismatched binary here fails at load, not at build.
    setZXingModuleOverrides({ locateFile: () => wasmUrl });
    return wrap(new BarcodeDetector({ formats: WANTED as never }), 'wasm');
  } catch {
    return null;
  }
}

/** The best engine this device can offer, or null if it cannot read barcodes at all. */
export async function createScanner(): Promise<Scanner | null> {
  return (await tryNative()) ?? (await tryWasm());
}

/** How often to hand a frame to each engine. ZXing needs more time per frame. */
export function scanIntervalMs(engine: ScanEngine): number {
  return engine === 'native' ? 150 : 350;
}

// A misread digit produces a valid-looking number for a completely different
// product, so one clean-looking frame is not enough. Two frames must agree, and
// the check digit has to add up — together that makes a wrong log very unlikely
// without making the scan feel slow.
export const CONFIRM_HITS = 2;

export interface ConfirmState {
  code: string | null;
  hits: number;
}

export const emptyConfirm: ConfirmState = { code: null, hits: 0 };

/**
 * Feed raw detections in, get a code out only once it has been seen enough.
 * Pure, so the acceptance rule is testable without a camera.
 */
export function confirmRead(prev: ConfirmState, rawValues: string[]): { state: ConfirmState; accepted: string | null } {
  const code = rawValues.map(canonicalCode).find(gtinCheckDigitOk);
  if (!code) return { state: prev, accepted: null };
  const hits = prev.code === code ? prev.hits + 1 : 1;
  if (hits >= CONFIRM_HITS) return { state: emptyConfirm, accepted: code };
  return { state: { code, hits }, accepted: null };
}

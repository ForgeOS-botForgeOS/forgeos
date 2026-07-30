import { useCallback, useEffect, useRef, useState } from 'react';
import { createScanner, confirmRead, emptyConfirm, scanIntervalMs, type ScanEngine } from '../lib/barcodeScan';

// The camera half of barcode scanning: get a stream, hand frames to a decoder,
// hand back a confirmed number. Kept out of the component so the lifecycle
// (permissions, teardown, torch, backgrounding) can be read in one place.

/** Why the viewfinder is or is not showing a picture. Never silently blank. */
export type CameraState =
  | 'starting'
  | 'live'
  | 'denied' // the user (or the OS) said no
  | 'unavailable' // no camera, or the OS would not give us one
  | 'insecure' // getUserMedia is not offered outside a secure context
  | 'nodetector'; // camera possible, but nothing here can decode a barcode

/** Long side of the frame handed to the WASM decoder. Full 1280px frames are wasted work. */
const WASM_FRAME_WIDTH = 640;

const CONSTRAINTS: MediaStreamConstraints = {
  // `ideal`, not `exact`: a laptop with only a front camera should still open.
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
};

interface TorchCapable {
  torch?: boolean;
}

function supportsTorch(track: MediaStreamTrack | null): boolean {
  return !!(track?.getCapabilities?.() as TorchCapable | undefined)?.torch;
}

function stateForError(err: unknown): CameraState {
  const name = err instanceof Error ? err.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  return 'unavailable';
}

function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop());
}

/** Draw the current frame into a smaller canvas so the WASM decoder keeps up. */
function downscale(video: HTMLVideoElement, canvas: HTMLCanvasElement): CanvasImageSource {
  const scale = Math.min(1, WASM_FRAME_WIDTH / (video.videoWidth || WASM_FRAME_WIDTH));
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return video;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export interface BarcodeCamera {
  /**
   * Attach to a <video> that stays mounted for as long as `active` is true —
   * hide it with CSS if the UI shows an error instead. Unmounting it on error
   * would leave `retry()` with nothing to play into.
   */
  videoRef: React.RefObject<HTMLVideoElement>;
  state: CameraState;
  engine: ScanEngine | null;
  canTorch: boolean;
  torchOn: boolean;
  toggleTorch: () => void;
  /** Ask for the camera again — after the user changes a permission, say. */
  retry: () => void;
}

export function useBarcodeCamera({ active, onCode }: { active: boolean; onCode: (code: string) => void }): BarcodeCamera {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  // Held in a ref so a new callback identity never tears the camera down.
  const onCodeRef = useRef(onCode);
  const [state, setState] = useState<CameraState>('starting');
  const [engine, setEngine] = useState<ScanEngine | null>(null);
  const [canTorch, setCanTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    onCodeRef.current = onCode;
  }, [onCode]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let timer = 0;
    let confirm = emptyConfirm;
    let stream: MediaStream | null = null;
    const canvas = document.createElement('canvas');
    // Captured once: the element the caller keeps mounted for as long as the
    // camera is active, so cleanup detaches the same node it attached to.
    const video = videoRef.current;
    setState('starting');
    setCanTorch(false);
    setTorchOn(false);

    const scan = async (): Promise<void> => {
      if (!video) {
        // No element to play into — better to say so than to show a blank box.
        setState('unavailable');
        return;
      }
      const scanner = await createScanner();
      if (cancelled) return;
      if (!scanner) {
        setState('nodetector');
        return;
      }
      setEngine(scanner.engine);

      if (!navigator.mediaDevices?.getUserMedia) {
        setState(window.isSecureContext === false ? 'insecure' : 'unavailable');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia(CONSTRAINTS);
      } catch (err) {
        if (!cancelled) setState(stateForError(err));
        return;
      }
      // Closed while the permission prompt was still open: the stream arrives
      // after cleanup has already run, so stop it here or the camera stays lit.
      if (cancelled) {
        stopStream(stream);
        return;
      }

      trackRef.current = stream.getVideoTracks()[0] ?? null;
      setCanTorch(supportsTorch(trackRef.current));
      video.srcObject = stream;
      // Rejects only if the element is torn down mid-start; `muted` + `playsInline`
      // keep autoplay policies out of the way.
      await video.play().catch(() => undefined);
      if (cancelled) return;
      setState('live');

      const interval = scanIntervalMs(scanner.engine);
      const tick = async (): Promise<void> => {
        if (cancelled) return;
        // HAVE_CURRENT_DATA: anything less has no pixels to read yet.
        if (!document.hidden && video.readyState >= 2 && video.videoWidth > 0) {
          const source = scanner.engine === 'wasm' ? downscale(video, canvas) : video;
          const found = await scanner.detect(source);
          if (cancelled) return;
          const { state: next, accepted } = confirmRead(confirm, found);
          confirm = next;
          if (accepted) {
            onCodeRef.current(accepted);
            return; // The caller decides what happens next; stop burning frames.
          }
        }
        timer = window.setTimeout(tick, interval);
      };
      timer = window.setTimeout(tick, interval);
    };

    void scan();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (video) video.srcObject = null;
      trackRef.current = null;
      stopStream(stream);
    };
  }, [active, attempt]);

  const toggleTorch = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const next = !torchOn;
    // Non-standard but widely supported on Android; if it is refused, stop offering it.
    track
      .applyConstraints({ advanced: [{ torch: next } as TorchCapable] } as MediaTrackConstraints)
      .then(() => setTorchOn(next))
      .catch(() => setCanTorch(false));
  }, [torchOn]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return { videoRef, state, engine, canTorch, torchOn, toggleTorch, retry };
}

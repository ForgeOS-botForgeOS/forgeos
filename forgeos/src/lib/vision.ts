import type { ScanResult, CardioScan } from '../types';
import { prepareImage } from './upload';
import { displayTitle } from './sanitize';

// Meal-photo macro counting via the Cloudflare Worker proxy (VITE_VISION_API_URL).
// AI keys live server-side in the Worker — never in this bundle, where anyone
// could extract them. Without a Worker, returns a realistic mocked estimate.
const WORKER_URL = import.meta.env.VITE_VISION_API_URL as string | undefined;
export const visionIsLive = Boolean(WORKER_URL);
export const cardioScanIsLive = Boolean(WORKER_URL);

export type CardioSource = 'machine' | 'watch';

// Read a cardio session from a photo — either a gym-machine console or a
// fitness watch / phone activity screen. Needs the Worker for real reads;
// returns a believable sample otherwise.
export async function scanCardio(file: File, source: CardioSource = 'machine'): Promise<CardioScan> {
  // Validated, downscaled and re-encoded before it leaves the phone — see
  // lib/upload.ts. Throws UploadError for a file that is not a readable image.
  const { base64: data, mime } = await prepareImage(file);
  if (!WORKER_URL) {
    await new Promise((r) => setTimeout(r, 700));
    return source === 'watch'
      ? { machine: 'Run', durationMin: 28, distanceKm: 5.2, calories: 340, avgPace: '5:23 /km', avgHr: 148, confidence: 0.3, tip: 'Sample — add a vision Worker to read your watch for real.' }
      : { machine: 'Treadmill', durationMin: 30, distanceKm: 5, calories: 320, avgPace: '6:00 /km', confidence: 0.3, tip: 'Sample — add a vision Worker to read real consoles.' };
  }
  const res = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: data, mime, mode: 'cardio', source }),
  });
  if (!res.ok) throw new VisionError(`Vision worker error ${res.status}.`, res.status);
  const out = await res.json();
  if (out.error) throw new VisionError(String(out.error));
  out.confidence = Math.max(0, Math.min(1, out.confidence ?? 0.5));
  // Model output is text from somewhere else, and it is rendered on a screen.
  out.machine = displayTitle(out.machine, 'Cardio');
  out.tip = displayTitle(out.tip);
  out.avgPace = displayTitle(out.avgPace).slice(0, 20);
  return out as CardioScan;
}

const MOCK_MEALS: ScanResult[] = [
  { name: 'Grilled chicken, rice & broccoli', calories: 540, proteinG: 48, carbsG: 55, fatG: 12, sugarG: 4, confidence: 0.88, tip: 'Solid recomp plate — lean protein with slow carbs.' },
  { name: 'Salmon poke bowl', calories: 620, proteinG: 38, carbsG: 60, fatG: 24, sugarG: 9, confidence: 0.81, tip: 'Omega-3s aid recovery; watch the sauce sugar.' },
  { name: 'Beef burger & fries', calories: 980, proteinG: 42, carbsG: 78, fatG: 52, sugarG: 11, confidence: 0.74, tip: 'High calorie — great on a hard training day.' },
  { name: 'Greek yoghurt, berries & granola', calories: 320, proteinG: 24, carbsG: 38, fatG: 8, sugarG: 18, confidence: 0.85, tip: 'Strong protein breakfast; granola drives the sugar up.' },
  { name: 'Oats, banana & peanut butter', calories: 430, proteinG: 16, carbsG: 58, fatG: 16, sugarG: 14, confidence: 0.83, tip: 'Great pre-session fuel.' },
];

// The note is pasted into a model prompt, so it is trimmed to one plain line
// of bounded length: braces and newlines would fight the JSON-only instruction
// the prompt ends with.
const MAX_NOTE_CHARS = 200;
export function cleanNote(note?: string): string | undefined {
  const clean = String(note ?? '').replace(/[{}\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_NOTE_CHARS);
  return clean || undefined;
}

export function estimateMock(file: File): ScanResult {
  return withItems(MOCK_MEALS[file.size % MOCK_MEALS.length]);
}

/**
 * Names and tips come back from a model that was itself fed a photo and a user
 * note, so they are third-party text on a direct path to the screen — capped
 * and stripped of anything invisible before anyone sees them.
 */
function sanitiseScan(r: ScanResult): ScanResult {
  return {
    ...r,
    name: displayTitle(r.name, 'Meal'),
    tip: displayTitle(r.tip),
    items: r.items?.map((it) => ({ ...it, name: displayTitle(it.name, 'Item') })),
  };
}

// Guarantee a per-item breakdown (fallback: the whole result as one item).
function withItems(r: ScanResult): ScanResult {
  if (Array.isArray(r.items) && r.items.length) return r;
  return { ...r, items: [{ name: r.name, calories: r.calories, proteinG: r.proteinG, carbsG: r.carbsG, fatG: r.fatG, sugarG: r.sugarG }] };
}

export class VisionError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

/**
 * Read a meal photo.
 *
 * `note` is what the user says the food is ("chicken curry, homemade, rice on
 * the side"). It goes to the model as a hint, because identifying the food is
 * the half of the job a photo is worst at — the model can still see the
 * portions. Typing a description with no photo at all is handled entirely
 * on-device by `lib/foodDescribe.ts`.
 */
export async function scanMeal(file: File, note?: string): Promise<ScanResult> {
  const { base64: data, mime } = await prepareImage(file);
  const hint = cleanNote(note);

  // 1) Free Cloudflare Worker (Workers AI) if configured.
  if (WORKER_URL) {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: data, mime, mode: 'food', note: hint }),
    });
    if (!res.ok) throw new VisionError(`Vision worker error ${res.status}.`, res.status);
    const out = await res.json();
    if (out.error) throw new VisionError(String(out.error));
    out.confidence = Math.max(0, Math.min(1, out.confidence ?? 0.6));
    return withItems(sanitiseScan(out as ScanResult));
  }

  // 2) No Worker configured → honest mock so the screen still works offline.
  await new Promise((r) => setTimeout(r, 900));
  return estimateMock(file);
}

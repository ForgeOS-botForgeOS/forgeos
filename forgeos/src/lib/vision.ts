import type { ScanResult, CardioScan } from '../types';

// Real meal-photo macro counting via Google Gemini vision. Set VITE_GEMINI_API_KEY
// (Google AI Studio). Restrict the key by HTTP referrer to your site origin.
// Without a key, returns a realistic mocked estimate so the screen still works.
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
// Preferred free path: a Cloudflare Worker running Workers AI vision.
const WORKER_URL = import.meta.env.VITE_VISION_API_URL as string | undefined;
const MODEL = 'gemini-2.0-flash';
export const visionIsLive = Boolean(WORKER_URL || GEMINI_KEY);
export const cardioScanIsLive = Boolean(WORKER_URL);

export type CardioSource = 'machine' | 'watch';

// Read a cardio session from a photo — either a gym-machine console or a
// fitness watch / phone activity screen. Needs the Worker for real reads;
// returns a believable sample otherwise.
export async function scanCardio(file: File, source: CardioSource = 'machine'): Promise<CardioScan> {
  const { data, mime } = await fileToBase64(file);
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
  return out as CardioScan;
}

const MOCK_MEALS: ScanResult[] = [
  { name: 'Grilled chicken, rice & broccoli', calories: 540, proteinG: 48, carbsG: 55, fatG: 12, sugarG: 4, confidence: 0.88, tip: 'Solid recomp plate — lean protein with slow carbs.' },
  { name: 'Salmon poke bowl', calories: 620, proteinG: 38, carbsG: 60, fatG: 24, sugarG: 9, confidence: 0.81, tip: 'Omega-3s aid recovery; watch the sauce sugar.' },
  { name: 'Beef burger & fries', calories: 980, proteinG: 42, carbsG: 78, fatG: 52, sugarG: 11, confidence: 0.74, tip: 'High calorie — great on a hard training day.' },
  { name: 'Greek yoghurt, berries & granola', calories: 320, proteinG: 24, carbsG: 38, fatG: 8, sugarG: 18, confidence: 0.85, tip: 'Strong protein breakfast; granola drives the sugar up.' },
  { name: 'Oats, banana & peanut butter', calories: 430, proteinG: 16, carbsG: 58, fatG: 16, sugarG: 14, confidence: 0.83, tip: 'Great pre-session fuel.' },
];

function fileToBase64(file: File): Promise<{ data: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      resolve({ data: res.split(',')[1], mime: file.type || 'image/jpeg' });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const PROMPT =
  'You are a precise nutrition estimator. Analyse the meal in this photo and return ' +
  'your best estimate of its macros for the whole portion shown. Be realistic and ' +
  'specific about the dish name. Respond ONLY as JSON.';

// JSON schema Gemini must follow — guarantees parseable, exact fields.
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    calories: { type: 'number' },
    proteinG: { type: 'number' },
    carbsG: { type: 'number' },
    fatG: { type: 'number' },
    sugarG: { type: 'number' },
    confidence: { type: 'number' },
    tip: { type: 'string' },
  },
  required: ['name', 'calories', 'proteinG', 'carbsG', 'fatG', 'sugarG', 'confidence', 'tip'],
};

export function estimateMock(file: File): ScanResult {
  return withItems(MOCK_MEALS[file.size % MOCK_MEALS.length]);
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

export async function scanMeal(file: File): Promise<ScanResult> {
  const { data, mime } = await fileToBase64(file);

  // 1) Free Cloudflare Worker (Workers AI) if configured.
  if (WORKER_URL) {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: data, mime, mode: 'food' }),
    });
    if (!res.ok) throw new VisionError(`Vision worker error ${res.status}.`, res.status);
    const out = await res.json();
    if (out.error) throw new VisionError(String(out.error));
    out.confidence = Math.max(0, Math.min(1, out.confidence ?? 0.6));
    return withItems(out as ScanResult);
  }

  // 2) Gemini direct (needs billing-enabled key).
  if (!GEMINI_KEY) {
    await new Promise((r) => setTimeout(r, 900));
    return estimateMock(file);
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mime, data } }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA, temperature: 0.2 },
    }),
  });
  if (!res.ok) {
    const msg =
      res.status === 429
        ? 'Gemini quota/billing not active for this project yet.'
        : res.status === 403
          ? 'Gemini key rejected (check key restrictions).'
          : `Gemini error ${res.status}.`;
    throw new VisionError(msg, res.status);
  }
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  const parsed = JSON.parse(text) as ScanResult;
  // clamp confidence to 0..1
  parsed.confidence = Math.max(0, Math.min(1, parsed.confidence ?? 0.7));
  return withItems(parsed);
}

import type { ScanResult } from '../types';

// Real meal-photo macro counting via Google Gemini vision. Set VITE_GEMINI_API_KEY
// (Google AI Studio). Restrict the key by HTTP referrer to your site origin.
// Without a key, returns a realistic mocked estimate so the screen still works.
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const MODEL = 'gemini-2.0-flash';
export const visionIsLive = Boolean(GEMINI_KEY);

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
  return MOCK_MEALS[file.size % MOCK_MEALS.length];
}

export class VisionError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

export async function scanMeal(file: File): Promise<ScanResult> {
  if (!GEMINI_KEY) {
    await new Promise((r) => setTimeout(r, 900));
    return estimateMock(file);
  }

  const { data, mime } = await fileToBase64(file);
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
  return parsed;
}

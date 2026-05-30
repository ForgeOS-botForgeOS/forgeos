import type { ScanResult } from '../types';

// AI photo macro scanner. Wire to a vision endpoint via VITE_VISION_API_URL +
// VITE_VISION_API_KEY. With no key, returns a realistic mocked estimate so the
// nutrition screen is fully usable offline.
const apiUrl = import.meta.env.VITE_VISION_API_URL as string | undefined;
const apiKey = import.meta.env.VITE_VISION_API_KEY as string | undefined; // TODO: API key

const MOCK_MEALS: ScanResult[] = [
  { name: 'Grilled chicken, rice & broccoli', calories: 540, proteinG: 48, carbsG: 55, fatG: 12, sugarG: 4, confidence: 0.88, tip: 'Solid recomp plate — lean protein with slow carbs.' },
  { name: 'Salmon poke bowl', calories: 620, proteinG: 38, carbsG: 60, fatG: 24, sugarG: 9, confidence: 0.81, tip: 'Omega-3s aid recovery; watch the sauce sugar.' },
  { name: 'Beef burger & fries', calories: 980, proteinG: 42, carbsG: 78, fatG: 52, sugarG: 11, confidence: 0.74, tip: 'High calorie — great on a hard training day, heavy on rest days.' },
  { name: 'Greek yoghurt, berries & granola', calories: 320, proteinG: 24, carbsG: 38, fatG: 8, sugarG: 18, confidence: 0.85, tip: 'Strong protein breakfast; granola drives the sugar up.' },
  { name: 'Oats, banana & peanut butter', calories: 430, proteinG: 16, carbsG: 58, fatG: 16, sugarG: 14, confidence: 0.83, tip: 'Great pre-session fuel — carbs plus slow-digesting fats.' },
];

export async function scanMeal(file: File): Promise<ScanResult> {
  if (apiUrl && apiKey) {
    const form = new FormData();
    form.append('image', file);
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!res.ok) throw new Error(`Vision API error ${res.status}`);
    return (await res.json()) as ScanResult;
  }

  // Mock: deterministic-ish pick based on file size so repeated scans vary.
  await new Promise((r) => setTimeout(r, 900));
  const idx = file.size % MOCK_MEALS.length;
  return MOCK_MEALS[idx];
}

export const visionIsLive = Boolean(apiUrl && apiKey);

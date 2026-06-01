// ForgeOS vision Worker — free Cloudflare Workers AI (LLaVA, EU-permitted).
// Food: the model identifies items + portion grams; macros are computed from a
// built-in per-100g nutrition table for accuracy. Cardio: reads the console.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const FOOD_PROMPT =
  'Identify EACH distinct food/drink in the photo and estimate its weight in grams ' +
  '(or ml). Respond with ONLY JSON, no prose: {"items":[{"name": string, "grams": ' +
  'number}], "confidence": number (0-1), "tip": string}. Be specific (e.g. "grilled ' +
  'chicken breast", "white rice, cooked", "olive oil").';

const CARDIO_PROMPT =
  'You are reading a cardio machine console. Read the numbers and identify the machine. ' +
  'Respond with ONLY JSON: {"machine": string, "durationMin": number, "distanceKm": ' +
  'number, "calories": number, "avgPace": string, "confidence": number (0-1), "tip": ' +
  'string}. Use 0 (or "" for avgPace) for anything not visible.';

// Per-100g (or 100ml) macros: [kcal, protein, carbs, fat, sugar].
const TABLE = {
  'chicken breast': [165, 31, 0, 3.6, 0], 'chicken thigh': [209, 26, 0, 11, 0], 'chicken': [190, 27, 0, 8, 0],
  'turkey': [135, 29, 0, 1, 0], 'turkey mince': [150, 27, 0, 4, 0], 'beef': [250, 26, 0, 15, 0], 'beef mince': [254, 26, 0, 17, 0],
  'steak': [271, 25, 0, 19, 0], 'sirloin': [206, 27, 0, 10, 0], 'pork': [242, 27, 0, 14, 0], 'bacon': [541, 37, 1.4, 42, 0],
  'salmon': [208, 20, 0, 13, 0], 'tuna': [132, 28, 0, 1, 0], 'cod': [82, 18, 0, 0.7, 0], 'mackerel': [262, 19, 0, 21, 0],
  'shrimp': [99, 24, 0.2, 0.3, 0], 'prawns': [99, 24, 0.2, 0.3, 0], 'egg': [143, 13, 1.1, 9.5, 1.1], 'eggs': [143, 13, 1.1, 9.5, 1.1],
  'egg white': [52, 11, 0.7, 0.2, 0.7], 'tofu': [144, 17, 3, 9, 0.6], 'tempeh': [193, 19, 9, 11, 0],
  'rice': [130, 2.7, 28, 0.3, 0.1], 'white rice': [130, 2.7, 28, 0.3, 0.1], 'brown rice': [123, 2.7, 26, 1, 0.4],
  'pasta': [158, 6, 31, 0.9, 0.6], 'spaghetti': [158, 6, 31, 0.9, 0.6], 'noodles': [138, 5, 25, 2, 0.5],
  'bread': [265, 9, 49, 3.2, 5], 'rye bread': [259, 9, 48, 3.3, 4], 'tortilla': [310, 8, 52, 8, 2], 'wrap': [310, 8, 52, 8, 2],
  'oats': [389, 17, 66, 7, 1], 'granola': [471, 10, 64, 20, 24], 'potato': [87, 2, 20, 0.1, 0.9], 'potatoes': [87, 2, 20, 0.1, 0.9],
  'fries': [312, 3.4, 41, 15, 0.3], 'sweet potato': [86, 1.6, 20, 0.1, 4.2], 'quinoa': [120, 4.4, 21, 1.9, 0.9],
  'lentils': [116, 9, 20, 0.4, 1.8], 'chickpeas': [164, 9, 27, 2.6, 5], 'black beans': [132, 9, 24, 0.5, 0.3], 'beans': [127, 8, 23, 0.5, 0.5],
  'broccoli': [34, 2.8, 7, 0.4, 1.7], 'spinach': [23, 2.9, 3.6, 0.4, 0.4], 'salad': [20, 1.2, 3.5, 0.2, 1.5], 'lettuce': [15, 1.4, 2.9, 0.2, 0.8],
  'tomato': [18, 0.9, 3.9, 0.2, 2.6], 'avocado': [160, 2, 9, 15, 0.7], 'carrot': [41, 0.9, 10, 0.2, 4.7], 'pepper': [31, 1, 6, 0.3, 4.2],
  'banana': [89, 1.1, 23, 0.3, 12], 'apple': [52, 0.3, 14, 0.2, 10], 'berries': [57, 0.7, 14, 0.3, 10], 'pineapple': [50, 0.5, 13, 0.1, 10],
  'milk': [61, 3.2, 4.8, 3.3, 5], 'greek yogurt': [59, 10, 3.6, 0.4, 3.2], 'yogurt': [61, 3.5, 4.7, 3.3, 4.7], 'skyr': [63, 11, 4, 0.2, 4],
  'cottage cheese': [98, 11, 3.4, 4.3, 2.7], 'cheese': [402, 25, 1.3, 33, 0.5], 'feta': [264, 14, 4, 21, 4], 'mozzarella': [280, 28, 3, 17, 1],
  'peanut butter': [588, 25, 20, 50, 9], 'almonds': [579, 21, 22, 50, 4], 'nuts': [607, 20, 21, 54, 4], 'olive oil': [884, 0, 0, 100, 0],
  'butter': [717, 0.9, 0.1, 81, 0.1], 'honey': [304, 0.3, 82, 0, 82], 'whey': [400, 80, 8, 6, 5], 'protein shake': [120, 24, 4, 1.5, 2],
  'pizza': [266, 11, 33, 10, 3.6], 'burger': [254, 17, 19, 13, 4], 'cheeseburger': [303, 16, 26, 15, 6], 'hot dog': [290, 10, 4, 26, 1],
  'sandwich': [250, 12, 30, 9, 4], 'sushi': [150, 6, 28, 2, 6], 'curry': [160, 8, 12, 9, 4], 'soup': [60, 3, 8, 2, 2],
  'chocolate': [546, 5, 61, 31, 48], 'dark chocolate': [598, 8, 46, 43, 24], 'ice cream': [207, 3.5, 24, 11, 21], 'cookie': [488, 5, 64, 24, 35],
  'orange': [47, 0.9, 12, 0.1, 9], 'grapes': [69, 0.7, 18, 0.2, 16], 'corn': [86, 3.2, 19, 1.2, 6.3], 'edamame': [121, 12, 9, 5, 2.2],
  'hummus': [166, 8, 14, 10, 0], 'falafel': [333, 13, 32, 18, 0], 'rice cake': [387, 8, 82, 3, 0.5], 'jerky': [410, 33, 11, 26, 9],
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

function bestMatch(name) {
  const n = String(name || '').toLowerCase();
  let best = null;
  for (const key of Object.keys(TABLE)) {
    if (n.includes(key) && (!best || key.length > best.length)) best = key;
  }
  return best;
}

function macrosFromTable(name, grams) {
  const key = bestMatch(name);
  if (!key) return null;
  const [kcal, p, c, f, s] = TABLE[key];
  const factor = (Number(grams) || 0) / 100;
  return {
    calories: Math.round(kcal * factor),
    proteinG: Math.round(p * factor),
    carbsG: Math.round(c * factor),
    fatG: Math.round(f * factor),
    sugarG: Math.round((s || 0) * factor),
  };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

    try {
      const { image, mode } = await request.json();
      if (!image) return json({ error: 'no image' }, 400);
      const bytes = Uint8Array.from(atob(image), (c) => c.charCodeAt(0));
      const isCardio = mode === 'cardio';

      const ai = await env.AI.run('@cf/llava-hf/llava-1.5-7b-hf', {
        prompt: isCardio ? CARDIO_PROMPT : FOOD_PROMPT,
        image: [...bytes],
        max_tokens: 512,
        temperature: 0.1,
      });
      const text = (ai && (ai.description || ai.response)) || '';
      const match = text.match(/\{[\s\S]*\}/);
      let data = null;
      if (match) { try { data = JSON.parse(match[0]); } catch { /* fall through */ } }

      if (isCardio) {
        if (!data) return json({ machine: 'Cardio', durationMin: 0, distanceKm: 0, calories: 0, avgPace: '', confidence: 0.2, tip: (text || 'Could not read the console.').slice(0, 160) });
        data.confidence = Math.max(0, Math.min(1, Number(data.confidence) || 0.5));
        return json(data);
      }

      // FOOD: compute macros from the table using AI-estimated grams.
      const rawItems = Array.isArray(data?.items) && data.items.length ? data.items : null;
      if (!rawItems) {
        return json({ name: 'Meal (estimate)', calories: 500, proteinG: 30, carbsG: 50, fatG: 18, sugarG: 8, confidence: 0.25, tip: (text || 'Could not identify items — edit manually.').slice(0, 160), items: [{ name: 'Meal', calories: 500, proteinG: 30, carbsG: 50, fatG: 18, sugarG: 8 }] });
      }

      const items = rawItems.map((it) => {
        const grams = Number(it.grams) || 150;
        const m = macrosFromTable(it.name, grams) || { calories: Math.round(grams * 1.5), proteinG: Math.round(grams * 0.08), carbsG: Math.round(grams * 0.15), fatG: Math.round(grams * 0.05), sugarG: 0 };
        const matched = !!bestMatch(it.name);
        return { name: `${it.name} (${grams}g)`, ...m, _matched: matched };
      });
      const totals = items.reduce((a, b) => ({ calories: a.calories + b.calories, proteinG: a.proteinG + b.proteinG, carbsG: a.carbsG + b.carbsG, fatG: a.fatG + b.fatG, sugarG: a.sugarG + b.sugarG }), { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, sugarG: 0 });
      const matchedCount = items.filter((i) => i._matched).length;
      const cleanItems = items.map(({ _matched, ...rest }) => rest); // eslint-disable-line @typescript-eslint/no-unused-vars

      return json({
        name: rawItems.map((i) => i.name).join(', '),
        ...totals,
        items: cleanItems,
        confidence: Math.max(0.3, Math.min(0.95, matchedCount / items.length)),
        tip: `${matchedCount}/${items.length} items matched the nutrition database. Edit grams/macros if needed.`,
      });
    } catch (e) {
      return json({ error: String(e && e.message ? e.message : e) }, 500);
    }
  },
};

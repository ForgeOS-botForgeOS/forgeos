// ForgeOS meal-scan Worker — runs a free Cloudflare Workers AI vision model and
// returns macros as JSON. The browser app POSTs { image: base64, mime }.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const FOOD_PROMPT =
  'You are a precise sports-nutrition estimator. List EACH distinct food item in the ' +
  'photo with its own estimated macros, then give the plate totals. Respond with ONLY ' +
  'a JSON object, no prose: {"items": [{"name": string, "calories": number, ' +
  '"proteinG": number, "carbsG": number, "fatG": number, "sugarG": number}], ' +
  '"name": string, "calories": number, "proteinG": number, "carbsG": number, ' +
  '"fatG": number, "sugarG": number, "confidence": number (0-1), "tip": string}.';

const CARDIO_PROMPT =
  'You are reading a cardio machine console (treadmill, rower, bike, ski-erg, ' +
  'elliptical, stair climber). Read the numbers on the display and identify the ' +
  'machine. Respond with ONLY a JSON object, no prose: ' +
  '{"machine": string, "durationMin": number, "distanceKm": number, "calories": ' +
  'number, "avgPace": string, "confidence": number (0-1), "tip": string}. ' +
  'If a value is not visible, use 0 (or "" for avgPace).';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
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

      // LLaVA 1.5 is the EU-permitted vision model on Workers AI.
      const ai = await env.AI.run('@cf/llava-hf/llava-1.5-7b-hf', {
        prompt: isCardio ? CARDIO_PROMPT : FOOD_PROMPT,
        image: [...bytes],
        max_tokens: 512,
        temperature: 0.1,
      });

      const text = (ai && (ai.description || ai.response)) || '';
      const match = text.match(/\{[\s\S]*\}/);
      let data = null;
      if (match) {
        try {
          data = JSON.parse(match[0]);
        } catch {
          /* fall through */
        }
      }
      if (!data) {
        if (isCardio) {
          return json({ machine: 'Cardio', durationMin: 0, distanceKm: 0, calories: 0, avgPace: '', confidence: 0.2, tip: (text || 'Could not read the console — enter it manually.').slice(0, 160) });
        }
        return json({ name: 'Meal (estimate)', calories: 500, proteinG: 30, carbsG: 50, fatG: 18, sugarG: 8, confidence: 0.3, tip: (text || 'Could not parse a precise estimate.').slice(0, 160) });
      }
      data.confidence = Math.max(0, Math.min(1, Number(data.confidence) || 0.6));
      return json(data);
    } catch (e) {
      return json({ error: String(e && e.message ? e.message : e) }, 500);
    }
  },
};

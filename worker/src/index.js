// ForgeOS meal-scan Worker — runs a free Cloudflare Workers AI vision model and
// returns macros as JSON. The browser app POSTs { image: base64, mime }.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const PROMPT =
  'You are a precise nutrition estimator. Look at the meal in this image and ' +
  'estimate the macros for the whole portion shown. Respond with ONLY a JSON ' +
  'object, no prose, in exactly this shape: ' +
  '{"name": string, "calories": number, "proteinG": number, "carbsG": number, ' +
  '"fatG": number, "sugarG": number, "confidence": number (0-1), "tip": string}.';

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
      const { image } = await request.json();
      if (!image) return json({ error: 'no image' }, 400);
      const bytes = Uint8Array.from(atob(image), (c) => c.charCodeAt(0));

      const ai = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
        prompt: PROMPT,
        image: [...bytes],
        max_tokens: 512,
        temperature: 0.2,
      });

      const text = (ai && ai.response) || '';
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
        return json({
          name: 'Meal (estimate)',
          calories: 500,
          proteinG: 30,
          carbsG: 50,
          fatG: 18,
          sugarG: 8,
          confidence: 0.3,
          tip: (text || 'Could not parse a precise estimate.').slice(0, 160),
        });
      }
      data.confidence = Math.max(0, Math.min(1, Number(data.confidence) || 0.6));
      return json(data);
    } catch (e) {
      return json({ error: String(e && e.message ? e.message : e) }, 500);
    }
  },
};

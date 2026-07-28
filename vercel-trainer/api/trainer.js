// ForgeOS "Talk to your trainer" — chat completion proxy, Vercel edition.
//
// This is a port of worker/src/trainer.js (Cloudflare) with an identical
// request/response contract, so the app cannot tell the two apart:
//   POST /trainer  { system, messages:[{role,content}], specialist? }
//   200            { reply, provider, model }
//
// Why it exists: the Cloudflare Worker could not be deployed from here (no
// stored wrangler session, and `wrangler login` needs a browser callback on
// localhost). The Vercel CLI *was* already logged in on this machine, so this
// host is reachable without asking anyone for a credential.
//
// Differences from the Worker, both forced by the platform:
//   - No Cloudflare Workers AI: `env.AI` is a Worker binding and has no Vercel
//     equivalent, so the chain is Groq -> Gemini. At least one key is required.
//   - Provider timeout is 8.5s, under Vercel's 10s Hobby function ceiling, so a
//     slow provider returns a clean 502 instead of a platform timeout.
//
// Privacy, unchanged from the Worker: message content is never logged. Only
// provider names and message counts are.

const DEFAULT_ORDER = ['groq', 'gemini'];

const LIMITS = {
  maxMessages: 24,
  maxCharsPerMessage: 4000,
  maxSystemChars: 12000,
  maxTotalChars: 40000,
  timeoutMs: 8500,
  maxTokens: 700,
};

// Only ForgeOS origins may call this from a browser — stops other sites
// embedding it to burn the free AI quota. Same list as the Worker.
const ALLOWED_ORIGINS = [
  'https://forgeos-botforgeos.github.io',
  'http://localhost:5173',
  'https://localhost',
  'capacitor://localhost',
];

function applyCors(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function fail(res, message, status) {
  res.status(status).json({ error: message });
}

/** Abort any provider that goes quiet, so one slow API cannot hang the chat. */
async function withTimeout(promiseFactory, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await promiseFactory(ctrl.signal);
  } finally {
    clearTimeout(timer);
  }
}

// ---- Providers -------------------------------------------------------------

async function callGroq(env, system, messages, signal) {
  const model = env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, ...messages],
      max_tokens: LIMITS.maxTokens,
      temperature: 0.4,
    }),
  });
  if (!res.ok) throw new Error(`groq ${res.status}`);
  const j = await res.json();
  const reply = j?.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error('groq: empty reply');
  return { reply, model };
}

async function callGemini(env, system, messages, signal) {
  const model = env.GEMINI_MODEL || 'gemini-2.0-flash';
  // Gemini has no "system" role: it takes systemInstruction, and uses
  // "user"/"model" instead of "user"/"assistant".
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { maxOutputTokens: LIMITS.maxTokens, temperature: 0.4 },
      }),
    },
  );
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  const j = await res.json();
  const reply = j?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim();
  if (!reply) throw new Error('gemini: empty reply');
  return { reply, model };
}

function providerAvailable(name, env) {
  if (name === 'groq') return !!env.GROQ_API_KEY;
  if (name === 'gemini') return !!env.GEMINI_API_KEY;
  return false;
}

// ---- Validation ------------------------------------------------------------

function sanitiseMessages(raw) {
  if (!Array.isArray(raw)) return null;
  const cleaned = [];
  for (const m of raw.slice(-LIMITS.maxMessages)) {
    if (!m || typeof m.content !== 'string') continue;
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const content = m.content.slice(0, LIMITS.maxCharsPerMessage).trim();
    if (content) cleaned.push({ role, content });
  }
  if (!cleaned.length) return null;
  // A conversation must end with the user's turn, or models ramble at themselves.
  while (cleaned.length && cleaned[cleaned.length - 1].role !== 'user') cleaned.pop();
  return cleaned.length ? cleaned : null;
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return fail(res, 'POST only', 405);

  const env = process.env;

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return fail(res, 'invalid JSON', 400);
    }
  }
  if (!body || typeof body !== 'object') return fail(res, 'invalid JSON', 400);

  const system = typeof body.system === 'string' ? body.system.slice(0, LIMITS.maxSystemChars) : '';
  const messages = sanitiseMessages(body.messages);
  if (!system) return fail(res, 'missing system prompt', 400);
  if (!messages) return fail(res, 'missing messages', 400);

  const total = system.length + messages.reduce((a, m) => a + m.content.length, 0);
  if (total > LIMITS.maxTotalChars) return fail(res, 'conversation too large', 413);

  const order = (env.TRAINER_PROVIDER || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const chain = [...new Set([...order, ...DEFAULT_ORDER])].filter((p) => providerAvailable(p, env));

  if (!chain.length) return fail(res, 'no AI provider configured on the server', 503);

  const errors = [];
  for (const provider of chain) {
    try {
      const result = await withTimeout(
        (signal) => (provider === 'groq' ? callGroq(env, system, messages, signal) : callGemini(env, system, messages, signal)),
        LIMITS.timeoutMs,
      );

      // Counts only — never the content of anyone's conversation.
      console.log(`trainer ok provider=${provider} msgs=${messages.length}`);
      return res.status(200).json({ reply: result.reply, provider, model: result.model });
    } catch (e) {
      const message = e && e.message ? String(e.message) : String(e);
      errors.push(`${provider}: ${message}`);
      console.log(`trainer provider failed provider=${provider} reason=${message}`);
    }
  }

  // Every provider refused — the app falls back to its offline trainer.
  return fail(res, `all providers failed (${errors.join('; ')})`, 502);
}

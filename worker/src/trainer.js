// ForgeOS "Talk to your trainer" — chat completion proxy.
//
// Why this lives in the Worker and not the app: ForgeOS is a PUBLIC repo and a
// client-side PWA, so an API key in the bundle is a published API key. The app
// sends the conversation here; the keys stay in Worker secrets.
//
// Provider chain, first one that answers wins:
//   1. GROQ_API_KEY      — free tier, EU-accessible, very fast (Llama 3.3 70B)
//   2. GEMINI_API_KEY    — Google AI Studio. Peter asked for Gemini specifically.
//      NOTE: Gemini's free tier was unavailable from Slovakia when we tried it in
//      the browser (see FIX-PLAYBOOK). Called from HERE the egress is Cloudflare's
//      edge, not a home connection, so it may well work — but it only ever runs
//      when a key is actually configured, and it falls through if Google says no.
//   3. env.AI            — Cloudflare Workers AI (already bound for the vision
//      endpoint), EU-permitted model. Needs no key at all, so the feature works
//      the moment the Worker is deployed.
//
// Override the order with TRAINER_PROVIDER, e.g. "gemini,groq,cf".
//
// Privacy: message content is never logged. Only counts and provider names are.

const DEFAULT_ORDER = ['groq', 'gemini', 'cf'];

const LIMITS = {
  maxMessages: 24,
  maxCharsPerMessage: 4000,
  maxSystemChars: 12000,
  maxTotalChars: 40000,
  timeoutMs: 20000,
  maxTokens: 700,
};

function ok(body, cors) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
function fail(message, status, cors) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
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
// Each returns { reply, model } or throws. No provider sees anything the others
// don't; the app decides what context to include.

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

async function callWorkersAi(env, system, messages) {
  const model = env.CF_MODEL || '@cf/meta/llama-3.1-8b-instruct';
  const ai = await env.AI.run(model, {
    messages: [{ role: 'system', content: system }, ...messages],
    max_tokens: LIMITS.maxTokens,
    temperature: 0.4,
  });
  const reply = (ai?.response || '').trim();
  if (!reply) throw new Error('cf: empty reply');
  return { reply, model };
}

function providerAvailable(name, env) {
  if (name === 'groq') return !!env.GROQ_API_KEY;
  if (name === 'gemini') return !!env.GEMINI_API_KEY;
  if (name === 'cf') return !!env.AI;
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

/**
 * POST /trainer
 * body: { system: string, messages: [{role, content}], specialist?: string }
 * 200:  { reply, provider, model }
 */
export async function handleTrainer(request, env, cors) {
  let body;
  try {
    body = await request.json();
  } catch {
    return fail('invalid JSON', 400, cors);
  }

  const system = typeof body.system === 'string' ? body.system.slice(0, LIMITS.maxSystemChars) : '';
  const messages = sanitiseMessages(body.messages);
  if (!system) return fail('missing system prompt', 400, cors);
  if (!messages) return fail('missing messages', 400, cors);

  const total = system.length + messages.reduce((a, m) => a + m.content.length, 0);
  if (total > LIMITS.maxTotalChars) return fail('conversation too large', 413, cors);

  const order = (env.TRAINER_PROVIDER || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const chain = [...new Set([...order, ...DEFAULT_ORDER])].filter((p) => providerAvailable(p, env));

  if (!chain.length) {
    return fail('no AI provider configured on the worker', 503, cors);
  }

  const errors = [];
  for (const provider of chain) {
    try {
      const result = await withTimeout(async (signal) => {
        if (provider === 'groq') return callGroq(env, system, messages, signal);
        if (provider === 'gemini') return callGemini(env, system, messages, signal);
        return callWorkersAi(env, system, messages);
      }, LIMITS.timeoutMs);

      // Counts only — never the content of anyone's conversation.
      console.log(`trainer ok provider=${provider} msgs=${messages.length}`);
      return ok({ reply: result.reply, provider, model: result.model }, cors);
    } catch (e) {
      const message = e && e.message ? String(e.message) : String(e);
      errors.push(`${provider}: ${message}`);
      console.log(`trainer provider failed provider=${provider} reason=${message}`);
    }
  }

  // Every provider refused — the app falls back to its offline trainer.
  return fail(`all providers failed (${errors.join('; ')})`, 502, cors);
}

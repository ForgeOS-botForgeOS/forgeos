# ForgeOS Worker

One Cloudflare Worker, two endpoints. Both run on Cloudflare's **free** tier and
neither needs a credit card.

| Endpoint | What it does | Keys needed |
| --- | --- | --- |
| `POST /` | Vision: meal photos → macros, cardio consoles → stats (LLaVA on Workers AI) | none |
| `POST /trainer` | "Talk to your trainer" chat | none, but better with one |

The app finds both from a single env var, `VITE_VISION_API_URL` (the Worker's
base URL) — the trainer path is appended automatically.

## Deploy

```bash
cd worker
npx wrangler deploy
```

## Why the chat lives here and not in the app

ForgeOS is a **public repo** and a client-side PWA. Any key in the app bundle is
a published key. The Worker holds the keys; the app only ever posts a prompt.

## Trainer providers

Tried in order, first one that answers wins:

1. **Groq** — `GROQ_API_KEY`. Free tier, EU-accessible, fastest of the three.
   Default model `llama-3.3-70b-versatile`.
2. **Google Gemini** — `GEMINI_API_KEY`. Default model `gemini-2.0-flash`.
   Note: Gemini's free tier was unavailable from Slovakia when tried from a
   browser. Called from the Worker the egress is Cloudflare's edge rather than a
   home connection, so it may work — and if Google refuses, the chain just falls
   through to the next provider.
3. **Cloudflare Workers AI** — the `[ai]` binding, no key at all. This is why the
   feature works the moment the Worker is deployed.

Set keys as secrets (never in `wrangler.toml`):

```bash
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put GEMINI_API_KEY
```

Change the order with a plain var, e.g. `TRAINER_PROVIDER = "gemini,groq,cf"`.

## What the Worker logs

Provider name, message count, and failure reasons. **Never** message content or
any user data.

## Guardrails happen in the app, not here

Questions about injuries, disordered eating, banned substances or self-harm are
answered by the app itself and never reach this Worker — so those topics never
leave the device. See `forgeos/src/lib/trainer/guardrails.ts`.

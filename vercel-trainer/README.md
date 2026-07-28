# ForgeOS trainer endpoint (Vercel)

The server behind **Talk to your trainer**. Live at
`https://forgeos-trainer.vercel.app/api/trainer`, which is what the app calls by
default (`DEFAULT_TRAINER_URL` in `forgeos/src/lib/trainer/index.ts`).

## Why this exists alongside `worker/`

`worker/src/trainer.js` is the same endpoint for Cloudflare, and it is the nicer
home: it sits next to the meal scanner and can answer via Cloudflare Workers AI
with **no API key at all**. It has never been deployed, because deploying it
needs an interactive `wrangler login` — a browser callback to the deploying
machine's localhost, which an agent sandbox cannot receive.

The Vercel CLI was already authenticated on Peter's machine, so this port could
actually be shipped. Both files implement an identical contract; the app can
point at either and does not care which answered.

If the Cloudflare Worker is ever deployed, point the app back by setting
`VITE_TRAINER_API_URL` to the Worker's base URL — but note that build-time vars
are enumerated in `.github/workflows/deploy.yml`, so that needs a workflow edit.

## Contract

```
POST /api/trainer
  { "system": "...", "messages": [{ "role": "user", "content": "..." }], "specialist": "training" }

200   { "reply": "...", "provider": "groq", "model": "llama-3.3-70b-versatile" }
400   { "error": "missing system prompt" }   <- also the app's liveness fingerprint
502   { "error": "all providers failed (...)" }
503   { "error": "no AI provider configured on the server" }
```

The app treats a 400 naming `system prompt`/`messages` as proof the route is
deployed (`classifyProbe`). Any other reply means on-device answers instead.

## Providers

Chain, first to answer wins, overridable with `TRAINER_PROVIDER`:

1. `GROQ_API_KEY` — free tier, EU-accessible, fast. **Currently the only one set.**
2. `GEMINI_API_KEY` — optional.

There is no Cloudflare Workers AI here; `env.AI` is a Worker binding with no
Vercel equivalent. That is why at least one key is required, whereas the
Cloudflare version would need none.

⚠️ The Groq key is currently **shared with the honecrest project** — same free
tier, so a rate limit in one affects the other, and rotating it affects both.
Swapping in a dedicated key is one command (below) with a different value.

## Deploy / operate

```bash
cd vercel-trainer
npx vercel deploy --prod --yes --scope home-nest

# secrets: piped on stdin so they never reach argv or shell history
printf '%s' "$KEY" | npx vercel env add GROQ_API_KEY production --scope home-nest
```

Environment variables only apply to **new** deployments — after adding one,
redeploy or the running function will not see it.

## Verify, always by response and never by exit code

```bash
curl -s -X POST https://forgeos-trainer.vercel.app/api/trainer \
  -H 'Content-Type: application/json' -d '{}'
# expect: {"error":"missing system prompt"}

curl -s -X POST https://forgeos-trainer.vercel.app/api/trainer \
  -H 'Content-Type: application/json' \
  -d '{"system":"You are a coach. One sentence.","messages":[{"role":"user","content":"Is 3x5 fine?"}]}'
# expect: {"reply":"...","provider":"groq","model":"..."}
```

## Privacy

Message content is never logged — only provider name and message count. What the
app sends is decided in `forgeos/src/state/useTrainerSnapshot.ts` and disclosed
to the user in the consent agreement before anything leaves the phone.

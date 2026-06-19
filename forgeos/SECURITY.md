# ForgeOS — Security & free setup

ForgeOS runs on a **100% free** stack and is safe by default. This is everything
you need; it's deliberately short.

## It's free

| Piece | Service | Free tier |
| --- | --- | --- |
| Website (PWA) | GitHub Pages | free |
| Android APK | GitHub Actions release | free |
| Backend (auth, data, social) | Supabase | free tier is plenty for personal/friends use |
| Food/cardio photo reading | Cloudflare Workers AI | free tier |

You never need a paid plan. The app also works fully **offline with no backend at
all** — the backend only adds cross-device sync and real friend activity.

## How your data is kept safe

- **Row-level security (RLS)** on every table. A row is readable only by its owner;
  friends can read a friend's workouts/PRs **only** after an accepted friendship
  **and** only while that friend has *Share activity* on. Profiles (which hold
  email, weight, age) are **not** world-readable — owner + accepted friends only.
- **The feed is friends-only** and stores the author name denormalised, so reading
  a post never exposes anyone's profile.
- **Auth** is handled by Supabase (passwords are hashed/salted server-side; the app
  only ever holds a session token, never a password).
- **Content-Security-Policy**: scripts can only come from our own bundle (no inline
  scripts, no `eval`), which neutralises most XSS. See `index.html`.
- **Vision Worker** only accepts calls from ForgeOS origins and caps upload size.
- **App lock**: an optional local passcode (Settings) gates the app on-device.

## Keys: what's safe vs secret

- ✅ **Safe to expose** (they're designed to be public, RLS protects everything):
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_CLIENT_ID`.
- ⛔ **Never put in the app / repo**: the Supabase **`service_role`** key, and the
  Android signing **keystore**. These bypass security / sign releases.

## Turn the backend on (≈5 minutes, one-time)

1. Create a free project at supabase.com.
2. SQL Editor → paste all of `supabase/schema.sql` → Run. (Safe to re-run.)
3. Auth → Providers/Policies: turn on **Confirm email** and **Leaked password
   protection** (Supabase dashboard toggles — recommended).
4. GitHub repo → Settings → Secrets and variables → **Actions → Variables** → add
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the deploy workflow already
   reads these). Push to `main` to rebuild.
5. Friends sign in, then add each other via the in-app **invite link**. Done —
   friend activity is now real and private by default to non-friends.

## Optional: photo reading (also free)

Deploy the Cloudflare Worker and point the app at it:

```bash
cd worker && npx wrangler deploy
# then set the Actions Variable VITE_VISION_API_URL to the deployed URL
```

For extra abuse protection on the Worker, add a free Cloudflare **Rate Limiting**
rule (e.g. 30 requests/min per IP) in the dashboard.

## Reporting

Found a security issue? Open a private security advisory on the GitHub repo rather
than a public issue.

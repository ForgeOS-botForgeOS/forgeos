# Publishing ForgeOS — what a store asks for, and the true answers

Everything here matches what the code actually does as of 2026-09-04. If a
feature changes, change this file and `public/privacy.html` in the same commit —
a privacy policy that has drifted from the app is worse than none.

## The two public URLs

Both are plain static pages, so they work with JavaScript disabled and without
installing anything — which is what a store reviewer checks.

- Privacy policy: `https://forgeos-botforgeos.github.io/forgeos/privacy.html`
- Terms of use: `https://forgeos-botforgeos.github.io/forgeos/terms.html`

They are also linked from inside the app (You → bottom of the screen).

## Google Play Data safety form — the answers

**Does your app collect or share any of the required user data types?** Yes —
but only for features the user switches on.

| Play category | Collected? | Shared with a third party? | Why | Optional? |
|---|---|---|---|---|
| Name | Yes (display name) | Yes — Supabase (EU) when sync/social is on; first name only to the AI provider when the trainer is on | App functionality (friends, feed) | Yes |
| Email address | Yes, if the user signs in with email or Google | No | Account management | Yes — guest mode needs none |
| User IDs | Yes | Yes — Supabase | Account management | Yes |
| Health and fitness | Yes (workouts, sleep, steps, resting HR, calories, weight) | Only to Supabase if cloud sync is on; a summary to the AI provider if the trainer is on | App functionality, personalisation | Yes |
| Photos | Yes — a meal/cardio photo the user chooses to scan | Yes — Cloudflare Workers AI, for the scan only | App functionality | Yes |
| App activity / other actions | Yes (in-app feedback the user writes) | No | Developer communications | Yes |
| Location | **No** | No | The gym check-in compares coordinates on the device; nothing is sent | Off by default |
| Financial info, contacts, messages, browsing, ads | **No** | No | — | — |

Also declare:
- **Data is encrypted in transit:** yes (HTTPS only).
- **Users can request data deletion:** yes — in-app reset, plus a contact route
  for account deletion. Deletion URL for the console: the privacy policy above.
- **Committed to the Play Families Policy:** no — the app is not directed at
  children (target audience 13+; the policy says so).
- **Independent security review:** no.

## Health Connect declaration form

The app reads (never writes) Sleep, Steps, Resting heart rate, Active calories,
plus background reads. Play requires a video or description of the in-app use:
the data appears on **You → Health & recovery** and drives the morning readiness
score on **Home** and the suggested load on **Train**. The privacy policy section
"Device permissions" covers the required disclosure, and Health data is never
sold, never used for ads, and never shared beyond the user's own cloud backup.

## Permissions a reviewer will ask about

| Permission | Justification for the console |
|---|---|
| `CAMERA` | Barcode scanning and meal photos, only while a scanner screen is open |
| `REQUEST_INSTALL_PACKAGES` | The app updates itself from its own GitHub release; the user confirms every install. (If this is rejected, the alternative is to remove the in-app updater and ship updates through Play only.) |
| `POST_NOTIFICATIONS` | Morning readiness note and user-set training reminders |
| `health.READ_*` | Above |

## Before the first submission

1. Add a contact email in the Play Console listing (required there even though
   the policy points at the issue tracker).
2. Confirm the target audience is 13+ and complete the content rating
   questionnaire (fitness app, no ads, no purchases, user-generated content is
   present because of the feed — declare it, and note the reporting route).
3. `android/app/build.gradle` must carry a release `versionCode`/`versionName`;
   CI already sets these from the run number.
4. The APK is signed with the permanent keystore (see `SECURITY.md`) — Play
   requires the same key for every update, so never regenerate it.

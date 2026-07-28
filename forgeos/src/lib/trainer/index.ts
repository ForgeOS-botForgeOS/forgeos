import { buildUserContext, type TrainerSnapshot } from './context';
import { helpContext } from './knowledge';
import { buildSystemPrompt, pickSpecialist, type SpecialistId } from './specialists';
import { screenQuestion } from './guardrails';
import { offlineAnswer } from './offline';

export * from './context';
export * from './guardrails';
export * from './knowledge';
export * from './offline';
export * from './specialists';

// The chat goes through a server, never straight to a provider: this repo is
// public, so a key in the bundle is a published key. Nothing reachable → the
// offline trainer answers instead, which is a real answer, not an error message.
//
// Deliberately NOT the meal scanner's Cloudflare Worker. That Worker could not
// be deployed from here (no wrangler session, and `wrangler login` needs a
// browser callback it cannot receive), so the endpoint was ported to Vercel,
// where a deploy was possible. `worker/src/trainer.js` and
// `vercel-trainer/api/trainer.js` implement an identical contract, so this can
// point at either — set VITE_TRAINER_API_URL to override the default.
//
// A URL is still not a promise: `probeTrainer()` below decides at runtime
// whether whatever is configured actually answers.
const DEFAULT_TRAINER_URL = 'https://forgeos-trainer.vercel.app/api';
const WORKER_URL = (import.meta.env.VITE_TRAINER_API_URL as string | undefined) || DEFAULT_TRAINER_URL;
const TIMEOUT_MS = 25000;
const PROBE_TIMEOUT_MS = 6000;

/** An endpoint is configured. Says nothing about whether it answers — see below. */
export const trainerConfigured = !!WORKER_URL;

/**
 * Whether the full trainer actually works, as opposed to merely being configured.
 *
 * A URL in the build is not proof of anything: the same worker also serves the
 * meal scanner, so an older deploy answers on that host without having a
 * /trainer route at all. Claiming "full trainer on" because a string exists
 * meant the UI could promise AI answers while every reply came from the
 * on-device trainer. This is measured instead — and it re-measures, so the day
 * the worker is deployed the app upgrades itself with no new build.
 */
export type TrainerLink = 'unknown' | 'live' | 'offline';

let link: TrainerLink = WORKER_URL ? 'unknown' : 'offline';
const linkListeners = new Set<() => void>();

export function trainerLink(): TrainerLink {
  return link;
}

export function subscribeTrainerLink(fn: () => void): () => void {
  linkListeners.add(fn);
  return () => {
    linkListeners.delete(fn);
  };
}

function setLink(next: TrainerLink): void {
  if (next === link) return;
  link = next;
  for (const fn of linkListeners) fn();
}

/**
 * Read a probe response. Pure so it can be tested without a network.
 *
 * The probe deliberately posts an empty body: a worker with the trainer route
 * rejects it with a validation error, which is a cheap, side-effect-free and
 * key-free proof that the route is there. Anything else — the vision handler's
 * "no image", a 404, an HTML error page — means no trainer on that host.
 */
export function classifyProbe(body: unknown): TrainerLink {
  const error = (body as { error?: unknown } | null)?.error;
  if (typeof error !== 'string') return 'offline';
  return /system prompt|messages/i.test(error) ? 'live' : 'offline';
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface TrainerReply {
  text: string;
  specialist: SpecialistId;
  /** 'offline' when answered on-device; otherwise the provider that replied. */
  source: 'offline' | 'guardrail' | string;
  model?: string;
  /** Set when a provider was tried and failed — shown quietly, not as a crash. */
  degradedReason?: string;
}

function trainerEndpoint(base: string): string {
  return `${base.replace(/\/+$/, '')}/trainer`;
}

/** Ask the worker whether it can be a trainer. Never throws; updates the link. */
export async function probeTrainer(): Promise<TrainerLink> {
  if (!WORKER_URL) {
    setLink('offline');
    return 'offline';
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(trainerEndpoint(WORKER_URL), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal: ctrl.signal,
    });
    setLink(classifyProbe(await res.json().catch(() => null)));
  } catch {
    // Offline phone, blocked host, worker down — all the same to the user.
    setLink('offline');
  } finally {
    clearTimeout(timer);
  }
  return link;
}

/**
 * Ask the trainer.
 *
 * Order of operations matters for both safety and privacy:
 *   1. Guardrails run FIRST, on-device. A refused topic never leaves the phone.
 *   2. No consent or no worker → the offline trainer answers locally.
 *   3. Otherwise the conversation goes to the worker, which picks a provider.
 *   4. Any failure falls back to the offline trainer rather than an error.
 */
export async function askTrainer(opts: {
  question: string;
  history: ChatTurn[];
  snapshot: TrainerSnapshot;
  /** Explicit consent to send context off-device. Without it we stay local. */
  consented: boolean;
}): Promise<TrainerReply> {
  const { question, history, snapshot, consented } = opts;

  const verdict = screenQuestion(question);
  if (!verdict.allow) {
    return { text: verdict.reply ?? '', specialist: pickSpecialist(question), source: 'guardrail' };
  }

  if (!consented || !WORKER_URL) {
    const local = offlineAnswer(question, snapshot);
    return { text: local.text, specialist: local.specialist, source: 'offline' };
  }

  const specialist = pickSpecialist(question);
  let system = buildSystemPrompt({
    specialist,
    userContext: buildUserContext(snapshot),
    helpContext: specialist === 'app' ? helpContext(question) : undefined,
    language: snapshot.language,
  });
  if (verdict.note) system += `\n\nCare needed on this message: ${verdict.note}`;

  const messages: ChatTurn[] = [...history.slice(-10), { role: 'user', content: question }];

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(trainerEndpoint(WORKER_URL), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, messages, specialist }),
      signal: ctrl.signal,
    });
    const data = (await res.json().catch(() => null)) as { reply?: string; provider?: string; model?: string; error?: string } | null;
    if (!res.ok || !data?.reply) {
      throw new Error(data?.error || `worker ${res.status}`);
    }
    setLink('live');
    return { text: data.reply.trim(), specialist, source: data.provider ?? 'ai', model: data.model };
  } catch (e) {
    // A real answer is the strongest evidence either way, so it wins over the probe.
    setLink('offline');
    const local = offlineAnswer(question, snapshot);
    return {
      text: local.text,
      specialist: local.specialist,
      source: 'offline',
      degradedReason: e instanceof Error ? e.message : 'network error',
    };
  } finally {
    clearTimeout(timer);
  }
}

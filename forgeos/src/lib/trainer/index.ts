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

// The chat goes through the same Cloudflare Worker as the meal scanner, because
// this repo is public and a key in the bundle is a published key. No worker
// configured → the offline trainer answers instead, which is a real answer, not
// an error message.
const WORKER_URL = import.meta.env.VITE_VISION_API_URL as string | undefined;
const TIMEOUT_MS = 25000;

export const trainerIsLive = !!WORKER_URL;

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
    return { text: data.reply.trim(), specialist, source: data.provider ?? 'ai', model: data.model };
  } catch (e) {
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

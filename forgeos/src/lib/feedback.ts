import { supabase, ensureSession, isBackendLive } from './supabase';
import { cleanText } from './sanitize';
import { useSettings } from '../state/settingsStore';

declare const __APP_VERSION__: string;

// "Something's wrong" / "you should add…", from the person using the app to the
// person building it.
//
// Deliberately small: one table, insert-only, no reading it back from a phone.
// What goes with a message is only what makes it actionable — which screen, which
// build, which mode — and the text is cleaned like anything else that will be
// displayed later (in this case, in a digest).
//
// Nothing is ever lost to a bad connection: a message that cannot be sent is
// kept on the device and retried the next time the app opens.

export type FeedbackKind = 'bug' | 'idea';

export const FEEDBACK_MIN = 3;
export const FEEDBACK_MAX = 1200;

const QUEUE_KEY = 'forge-feedback-queue';
/** One message every few seconds is a person; faster than that is a stuck finger. */
const COOLDOWN_MS = 4000;
let lastSentAt = 0;

export interface FeedbackDraft {
  kind: FeedbackKind;
  body: string;
  /** Route the user was on, e.g. "/train". Helps far more than it costs. */
  screen?: string;
}

interface QueuedFeedback extends FeedbackDraft {
  createdAt: string;
  appVersion: string;
  platform: string;
  mode: string;
}

function platform(): string {
  // Ask Capacitor, rather than guessing from the origin: the Capacitor WebView
  // and a dev server both serve from localhost, so the origin check labelled
  // every message typed on a laptop as "android".
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (cap?.isNativePlatform?.()) return 'android';
  return typeof navigator === 'undefined' ? 'unknown' : 'web';
}

function readQueue(): QueuedFeedback[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed.slice(-50) as QueuedFeedback[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedFeedback[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-50)));
  } catch {
    /* storage full — the message is lost, and there is nothing better to do */
  }
}

export function pendingFeedbackCount(): number {
  return readQueue().length;
}

/** The one row shape the table takes. Kept here so the queue and the live send agree. */
function toRow(item: QueuedFeedback, userId: string) {
  return {
    user_id: userId,
    kind: item.kind,
    body: item.body,
    screen: item.screen ?? null,
    app_version: item.appVersion,
    platform: item.platform,
    mode: item.mode,
    created_at: item.createdAt,
  };
}

async function insert(items: QueuedFeedback[]): Promise<boolean> {
  if (!isBackendLive || !supabase || !items.length) return false;
  const session = await ensureSession();
  const userId = session?.id;
  if (!userId) return false;
  const { error } = await supabase.from('feedback').insert(items.map((i) => toRow(i, userId)));
  return !error;
}

export type SendResult = 'sent' | 'queued' | 'too-short' | 'too-fast';

/**
 * Send one piece of feedback.
 *
 * Returns what actually happened rather than throwing, because every outcome
 * here is something the sheet says out loud — including "saved, it will go when
 * you're back online", which is the honest version of a fake success tick.
 */
export async function sendFeedback(draft: FeedbackDraft): Promise<SendResult> {
  const body = cleanText(draft.body, { max: FEEDBACK_MAX, multiline: true });
  if (body.length < FEEDBACK_MIN) return 'too-short';
  const now = Date.now();
  if (now - lastSentAt < COOLDOWN_MS) return 'too-fast';
  lastSentAt = now;

  const item: QueuedFeedback = {
    kind: draft.kind === 'idea' ? 'idea' : 'bug',
    body,
    screen: cleanText(draft.screen ?? '', { max: 60 }) || undefined,
    createdAt: new Date().toISOString(),
    appVersion: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev',
    platform: platform(),
    mode: useSettings.getState().apprentice ? 'apprentice' : 'full',
  };

  if (await insert([item])) return 'sent';
  writeQueue([...readQueue(), item]);
  return 'queued';
}

/** Guards the flush against itself: React StrictMode calls launch effects
 *  twice in development, and two flushes racing sent every queued message
 *  twice — caught by watching real rows arrive, not by reading the code. */
let flushing = false;

/**
 * Retry anything the network swallowed. Called once on launch; silent by design
 * — nobody wants a toast about a bug report from three days ago.
 *
 * The queue is claimed *before* the network call and put back if it fails, so a
 * second caller finds nothing to send rather than sending it again.
 */
export async function flushFeedbackQueue(): Promise<number> {
  if (flushing) return 0;
  const queued = readQueue();
  if (!queued.length) return 0;
  flushing = true;
  writeQueue([]);
  try {
    if (await insert(queued)) return queued.length;
    // Failed: hand the messages back, in front of anything written meanwhile.
    writeQueue([...queued, ...readQueue()]);
    return 0;
  } catch {
    writeQueue([...queued, ...readQueue()]);
    return 0;
  } finally {
    flushing = false;
  }
}

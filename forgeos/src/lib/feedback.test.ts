import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The queue is the part worth testing without a network: it is what stands
// between "no signal" and a lost bug report — and what let StrictMode send
// every queued message twice until the flush claimed the queue first.
const inserted: unknown[][] = [];
let insertOk = true;

vi.mock('./supabase', () => ({
  isBackendLive: true,
  supabase: {
    from: () => ({
      insert: (rows: unknown[]) => {
        inserted.push(rows);
        return Promise.resolve({ error: insertOk ? null : new Error('offline') });
      },
    }),
  },
  ensureSession: () => Promise.resolve({ id: 'user-1' }),
}));
vi.mock('../state/settingsStore', () => ({ useSettings: { getState: () => ({ apprentice: false }) } }));

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  get length() { return this.map.size; }
}

const { sendFeedback, flushFeedbackQueue, pendingFeedbackCount } = await import('./feedback');

// The 4-second anti-double-tap cooldown is module state and real behaviour, so
// each test moves the clock instead of waiting for it.
let clock = Date.UTC(2026, 8, 4, 12, 0, 0);
beforeEach(() => {
  (globalThis as { localStorage: Storage }).localStorage = new MemoryStorage() as unknown as Storage;
  inserted.length = 0;
  insertOk = true;
  clock += 60_000;
  vi.useFakeTimers();
  vi.setSystemTime(clock);
});
afterEach(() => vi.useRealTimers());

describe('sendFeedback', () => {
  it('refuses a message too short to act on', async () => {
    expect(await sendFeedback({ kind: 'bug', body: 'x' })).toBe('too-short');
    expect(inserted).toHaveLength(0);
  });

  it('strips invisible characters before the message is stored', async () => {
    // A report is read later in a digest; a bidi override there lies just as
    // well as it does on a phone screen.
    await sendFeedback({ kind: 'idea', body: 'add a rest timer‮​' });
    const row = (inserted[0] as { body: string }[])[0];
    expect(row.body).toBe('add a rest timer');
  });

  it('keeps a message that cannot be sent, and says so', async () => {
    insertOk = false;
    vi.setSystemTime(clock + 30_000);
    const r = await sendFeedback({ kind: 'bug', body: 'the timer covers the tab bar' });
    expect(r).toBe('queued');
    expect(pendingFeedbackCount()).toBe(1);
  });
});

describe('flushFeedbackQueue', () => {
  it('sends what was queued, once', async () => {
    insertOk = false;
    vi.setSystemTime(clock + 10_000);
    await sendFeedback({ kind: 'bug', body: 'queued while offline' });
    inserted.length = 0;
    insertOk = true;

    // Two launches racing (StrictMode does exactly this in development).
    const [a, b] = await Promise.all([flushFeedbackQueue(), flushFeedbackQueue()]);
    expect(a + b).toBe(1);
    expect(inserted).toHaveLength(1);
    expect(pendingFeedbackCount()).toBe(0);
  });

  it('gives the messages back when the send fails', async () => {
    insertOk = false;
    vi.setSystemTime(clock + 20_000);
    await sendFeedback({ kind: 'bug', body: 'still offline' });
    expect(await flushFeedbackQueue()).toBe(0);
    expect(pendingFeedbackCount()).toBe(1);
  });
});

import { create } from 'zustand';

// In-app dialogs — the same move `toast` made for window.alert, now for
// window.confirm and window.prompt.
//
// A native prompt renders as "The page at https://forgeos-botforgeos.github.io
// says:", in the system font, over the app: it looks like a scam warning rather
// than part of ForgeOS, it cannot be styled or localised, and inside a WebView
// some Android builds suppress it outright — which would silently kill the
// feature behind it. Everything asks through here instead.
//
// The API is a promise so it drops straight into the old call sites:
//   if (!(await askConfirm({...}))) return;      // was: if (!confirm(...))
//   const name = await askText({...});           // was: prompt(...)
// `null` is always "the user backed out", exactly like the native pair.

export type DialogTone = 'default' | 'danger';

export interface ConfirmRequest {
  kind: 'confirm';
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: DialogTone;
}

export interface TextRequest {
  kind: 'text';
  title: string;
  body?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Numeric keypad + numeric result. Text is still what comes back. */
  numeric?: boolean;
  maxLength?: number;
  /** Empty input is refused when true (the Confirm button stays disabled). */
  required?: boolean;
}

type Request = ConfirmRequest | TextRequest;

interface OpenDialog {
  id: number;
  request: Request;
  resolve: (value: boolean | string | null) => void;
}

interface DialogState {
  current: OpenDialog | null;
  /** FIFO: a second ask while one is open waits rather than clobbering it. */
  queue: OpenDialog[];
  open: (d: OpenDialog) => void;
  close: (id: number, value: boolean | string | null) => void;
}

export const MAX_INPUT = 120;

let counter = 0;

export const useDialog = create<DialogState>((set, get) => ({
  current: null,
  queue: [],
  open: (d) => {
    if (get().current) set({ queue: [...get().queue, d] });
    else set({ current: d });
  },
  close: (id, value) => {
    const { current, queue } = get();
    if (current?.id !== id) {
      // Resolve a queued entry that was cancelled before it was ever shown.
      const waiting = queue.find((q) => q.id === id);
      if (waiting) { waiting.resolve(value); set({ queue: queue.filter((q) => q.id !== id) }); }
      return;
    }
    current.resolve(value);
    set({ current: queue[0] ?? null, queue: queue.slice(1) });
  },
}));

function ask(request: Request): Promise<boolean | string | null> {
  // The promise only settles when something answers it, so <DialogHost /> must
  // be mounted for the whole life of the app. App.tsx mounts it beside
  // <Toaster />, and dialog.guard.test.ts fails the build if that ever stops
  // being true — a silently unanswered dialog would freeze the flow behind it.
  return new Promise((resolve) => {
    useDialog.getState().open({ id: ++counter, request, resolve });
  });
}

/** Yes/no. Resolves false when dismissed — same contract as window.confirm. */
export async function askConfirm(req: Omit<ConfirmRequest, 'kind'>): Promise<boolean> {
  return (await ask({ ...req, kind: 'confirm' })) === true;
}

/** One line of text. Resolves null when dismissed — same as window.prompt. */
export async function askText(req: Omit<TextRequest, 'kind'>): Promise<string | null> {
  const value = await ask({ ...req, kind: 'text' });
  return typeof value === 'string' ? value : null;
}

/** A number, or null. Anything unparseable counts as cancelled. */
export async function askNumber(req: Omit<TextRequest, 'kind' | 'numeric'>): Promise<number | null> {
  const raw = await askText({ ...req, numeric: true });
  if (raw === null) return null;
  const n = Number(raw.replace(',', '.').trim());
  return Number.isFinite(n) ? n : null;
}

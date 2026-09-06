import { beforeEach, describe, expect, it } from 'vitest';
import { askConfirm, askNumber, askText, useDialog } from './dialog';

beforeEach(() => useDialog.setState({ current: null, queue: [] }));

/** Answer whatever dialog is open right now. */
function answer(value: boolean | string | null) {
  const open = useDialog.getState().current;
  if (!open) throw new Error('no dialog is open');
  useDialog.getState().close(open.id, value);
}

describe('askConfirm', () => {
  it('resolves true only when confirmed', async () => {
    const yes = askConfirm({ title: 'Delete?' });
    answer(true);
    expect(await yes).toBe(true);

    const no = askConfirm({ title: 'Delete?' });
    answer(false);
    expect(await no).toBe(false);
  });

  it('treats a dismissal as "no", like window.confirm', async () => {
    const p = askConfirm({ title: 'Delete?' });
    answer(null);
    expect(await p).toBe(false);
  });
});

describe('askText', () => {
  it('returns the typed text, and null when cancelled', async () => {
    const named = askText({ title: 'Name it' });
    answer('Push day');
    expect(await named).toBe('Push day');

    const cancelled = askText({ title: 'Name it' });
    answer(null);
    expect(await cancelled).toBeNull();
  });
});

describe('askNumber', () => {
  it('parses a number and accepts a decimal comma', async () => {
    const p = askNumber({ title: 'Price' });
    answer('2,5');
    expect(await p).toBe(2.5);
  });

  it('returns null for nonsense rather than NaN', async () => {
    const p = askNumber({ title: 'Price' });
    answer('abc');
    expect(await p).toBeNull();
  });
});

describe('queueing', () => {
  it('shows one dialog at a time and never loses the second', async () => {
    const first = askConfirm({ title: 'One' });
    const second = askText({ title: 'Two' });
    const state = useDialog.getState();
    expect(state.current?.request.title).toBe('One');
    expect(state.queue).toHaveLength(1);

    answer(true);
    expect(useDialog.getState().current?.request.title).toBe('Two');
    answer('typed');

    expect(await first).toBe(true);
    expect(await second).toBe('typed');
    expect(useDialog.getState().current).toBeNull();
  });

  it('can resolve a queued dialog that never became visible', async () => {
    const first = askConfirm({ title: 'One' });
    const second = askConfirm({ title: 'Two' });
    const queued = useDialog.getState().queue[0];
    useDialog.getState().close(queued.id, false);
    expect(await second).toBe(false);
    expect(useDialog.getState().current?.request.title).toBe('One');
    answer(true);
    expect(await first).toBe(true);
  });
});

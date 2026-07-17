import { describe, expect, test } from 'vitest';
import { shouldAnnounceUpdate } from './updateNotice';

describe('shouldAnnounceUpdate', () => {
  test('announces when the build changed from a previously seen one', () => {
    expect(shouldAnnounceUpdate('abc123', 'def456')).toBe(true);
  });

  test('stays silent on a first-ever run (nothing seen before)', () => {
    expect(shouldAnnounceUpdate(null, 'def456')).toBe(false);
  });

  test('stays silent on a same-build reopen', () => {
    expect(shouldAnnounceUpdate('abc123', 'abc123')).toBe(false);
  });

  test('never fires for a local dev build', () => {
    expect(shouldAnnounceUpdate('abc123', 'dev')).toBe(false);
    expect(shouldAnnounceUpdate(null, 'dev')).toBe(false);
  });

  test('treats an empty current sha as nothing to announce', () => {
    expect(shouldAnnounceUpdate('abc123', '')).toBe(false);
  });
});

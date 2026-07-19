import { describe, expect, test } from 'vitest';
import { parseAuthRedirect } from './authDeepLink';

describe('parseAuthRedirect', () => {
  test('extracts the PKCE code from a forgeos://auth redirect', () => {
    expect(parseAuthRedirect('forgeos://auth?code=abc-123')).toEqual({ kind: 'code', code: 'abc-123' });
  });

  test('tolerates a trailing slash and extra params', () => {
    expect(parseAuthRedirect('forgeos://auth/?state=xyz&code=abc')).toEqual({ kind: 'code', code: 'abc' });
  });

  test('surfaces an OAuth error instead of a code', () => {
    expect(parseAuthRedirect('forgeos://auth?error=access_denied&error_description=User+cancelled')).toEqual({
      kind: 'error',
      message: 'User cancelled',
    });
  });

  test('falls back to the error param when no description is given', () => {
    expect(parseAuthRedirect('forgeos://auth?error=access_denied')).toEqual({
      kind: 'error',
      message: 'access_denied',
    });
  });

  test('ignores URLs with the wrong scheme', () => {
    expect(parseAuthRedirect('https://auth?code=abc')).toBeNull();
    expect(parseAuthRedirect('https://forgeos-botforgeos.github.io/forgeos/?code=abc')).toBeNull();
  });

  test('ignores forgeos links that are not the auth callback', () => {
    expect(parseAuthRedirect('forgeos://share?code=abc')).toBeNull();
  });

  test('ignores garbage and empty strings', () => {
    expect(parseAuthRedirect('not a url')).toBeNull();
    expect(parseAuthRedirect('')).toBeNull();
  });

  test('returns null when the callback has neither code nor error', () => {
    expect(parseAuthRedirect('forgeos://auth?state=xyz')).toBeNull();
  });
});

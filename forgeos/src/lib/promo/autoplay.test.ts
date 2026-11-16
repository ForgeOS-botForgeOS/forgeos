import { describe, expect, it } from 'vitest';
import { isFrontDoor, parseTrailerFlags, shouldAutoplayTrailer, type TrailerEnv } from './autoplay';

const visitor: TrailerEnv = {
  native: false,
  standalone: false,
  hash: '',
  onboarded: false,
  seenEver: false,
  seenThisSession: false,
  reducedMotion: false,
};

describe('when the trailer plays by itself', () => {
  it('plays for a new visitor at the front door', () => {
    expect(shouldAutoplayTrailer(visitor)).toBe(true);
    for (const hash of ['#', '#/', '#/home', '#/onboarding', '#/onboarding?x=1']) {
      expect(shouldAutoplayTrailer({ ...visitor, hash }), hash).toBe(true);
    }
  });

  it('plays again on a later visit while they still have not set up', () => {
    expect(shouldAutoplayTrailer({ ...visitor, seenEver: true })).toBe(true);
  });

  it('never plays inside the Android app or an installed web app', () => {
    expect(shouldAutoplayTrailer({ ...visitor, native: true })).toBe(false);
    expect(shouldAutoplayTrailer({ ...visitor, standalone: true })).toBe(false);
  });

  it('stays out of the way of shared links', () => {
    for (const hash of ['#/add-friend?code=AB12CD34', '#/race-join?r=x', '#/u?d=abc', '#/download', '#/trailer', '#/wrap/7']) {
      expect(shouldAutoplayTrailer({ ...visitor, hash }), hash).toBe(false);
    }
  });

  it('respects reduced motion and never replays within a visit', () => {
    expect(shouldAutoplayTrailer({ ...visitor, reducedMotion: true })).toBe(false);
    expect(shouldAutoplayTrailer({ ...visitor, seenThisSession: true })).toBe(false);
  });

  it('shows people who already use ForgeOS here once, then never again', () => {
    expect(shouldAutoplayTrailer({ ...visitor, onboarded: true })).toBe(true);
    expect(shouldAutoplayTrailer({ ...visitor, onboarded: true, seenEver: true })).toBe(false);
  });

  it('recognises the front door only', () => {
    expect(isFrontDoor('#/home')).toBe(true);
    expect(isFrontDoor('#/homework')).toBe(false);
  });
});

describe('trailer link flags', () => {
  it('reads capture, calm and a start time', () => {
    expect(parseTrailerFlags('?capture=1&calm=1&t=12.5', 30)).toEqual({ capture: true, calm: true, startAt: 12.5 });
    expect(parseTrailerFlags('', 30)).toEqual({ capture: false, calm: false, startAt: 0 });
  });

  it('clamps or ignores a start time from a hand-edited link', () => {
    expect(parseTrailerFlags('t=999', 30).startAt).toBe(30);
    expect(parseTrailerFlags('t=-4', 30).startAt).toBe(0);
    expect(parseTrailerFlags('t=abc', 30).startAt).toBe(0);
    expect(parseTrailerFlags('t=1e1000', 30).startAt).toBe(0);
  });
});

import { describe, it, expect } from 'vitest';
import { buildInviteLink, parseInvitePayload, tryExtractInvite, friendFromInvite, type InvitePayload } from './invite';

const sample: InvitePayload = { v: 1, code: 'FORGE-AB23CD', name: 'Mara', rank: 'Gold I', xp: 4200, seed: 'MA', streak: 9 };

describe('invite links', () => {
  it('round-trips a payload through a share link', () => {
    const link = buildInviteLink(sample);
    expect(link).toContain('#/add-friend?i=');
    const token = link.split('?i=')[1];
    expect(parseInvitePayload(token)).toEqual(sample);
  });

  it('extracts a payload from a full pasted link', () => {
    const link = buildInviteLink(sample);
    expect(tryExtractInvite(link)?.name).toBe('Mara');
  });

  it('extracts a payload from a bare token', () => {
    const token = buildInviteLink(sample).split('?i=')[1];
    expect(tryExtractInvite(token)?.code).toBe('FORGE-AB23CD');
  });

  it('rejects plain names and garbage', () => {
    expect(tryExtractInvite('Jakub')).toBeNull();
    expect(tryExtractInvite('FORGE-AB23CD')).toBeNull(); // a bare code is not a self-describing invite
    expect(parseInvitePayload('not-base64!!')).toBeNull();
  });

  it('builds a real friend (not random) from the invite', () => {
    const f = friendFromInvite(sample);
    expect(f.name).toBe('Mara');
    expect(f.xp).toBe(4200);
    expect(f.friendCode).toBe('FORGE-AB23CD');
    expect(f.streak).toBe(9);
  });
});

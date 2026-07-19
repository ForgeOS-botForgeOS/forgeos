import { describe, expect, test } from 'vitest';
import { feedRowToPost } from './liveFeed';

const ROW = {
  id: 'p1',
  author_id: 'u1',
  author_name: 'Lena',
  body: 'Crushed leg day 🦵',
  workout_summary: { volumeKg: 5400, sets: 18, durationMin: 52 },
  created_at: '2026-07-19T12:00:00Z',
};

describe('feedRowToPost', () => {
  test('maps a full row to a feed post', () => {
    const post = feedRowToPost(ROW);
    expect(post).toMatchObject({
      id: 'p1',
      authorId: 'u1',
      authorName: 'Lena',
      avatarSeed: 'LE',
      body: 'Crushed leg day 🦵',
      workoutSummary: { volumeKg: 5400, sets: 18, durationMin: 52 },
    });
  });

  test('tolerates missing optional fields', () => {
    const post = feedRowToPost({ id: 'p2', author_id: 'u2', created_at: '2026-07-19T12:00:00Z' });
    expect(post).toMatchObject({ id: 'p2', authorName: 'Athlete', body: '', workoutSummary: undefined });
  });

  test('rejects rows missing required fields or of the wrong shape', () => {
    expect(feedRowToPost(null)).toBeNull();
    expect(feedRowToPost('junk')).toBeNull();
    expect(feedRowToPost({ author_id: 'u1', created_at: 'x' })).toBeNull();
    expect(feedRowToPost({ id: 42, author_id: 'u1', created_at: 'x' })).toBeNull();
  });
});

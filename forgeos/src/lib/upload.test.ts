import { describe, expect, it } from 'vitest';
import { checkImageFile, checkTextFile, MAX_IMAGE_BYTES, MAX_TEXT_BYTES, UploadError } from './upload';

/** A File stand-in: only the fields the checks read, sized without allocating. */
function fakeFile(name: string, type: string, size: number): File {
  return { name, type, size } as File;
}

describe('checkImageFile', () => {
  it('accepts the formats a phone camera actually produces', () => {
    for (const [name, type] of [
      ['meal.jpg', 'image/jpeg'],
      ['meal.png', 'image/png'],
      ['meal.webp', 'image/webp'],
      ['meal.heic', 'image/heic'],
    ]) {
      expect(checkImageFile(fakeFile(name, type, 2_000_000))).toBeNull();
    }
  });

  it('falls back to the extension when Android reports no type', () => {
    expect(checkImageFile(fakeFile('IMG_0001.HEIC', '', 1_000_000))).toBeNull();
    expect(checkImageFile(fakeFile('notes.txt', '', 1000))?.reason).toBe('type');
  });

  it('refuses what the accept attribute cannot: a picker can hand back anything', () => {
    expect(checkImageFile(fakeFile('clip.mp4', 'video/mp4', 5_000_000))?.reason).toBe('type');
    expect(checkImageFile(fakeFile('doc.pdf', 'application/pdf', 5000))?.reason).toBe('type');
    expect(checkImageFile(fakeFile('run.sh', 'application/x-sh', 100))?.reason).toBe('type');
  });

  it('refuses a file too big to send, before anything reads it', () => {
    const e = checkImageFile(fakeFile('huge.jpg', 'image/jpeg', MAX_IMAGE_BYTES + 1));
    expect(e?.reason).toBe('too-large');
    expect(e?.message).toContain('limit');
  });

  it('refuses an empty file', () => {
    expect(checkImageFile(fakeFile('empty.jpg', 'image/jpeg', 0))?.reason).toBe('empty');
  });

  it('returns an error object with a message worth showing', () => {
    const e = checkImageFile(fakeFile('clip.mp4', 'video/mp4', 10));
    expect(e).toBeInstanceOf(UploadError);
    expect(e?.message).toMatch(/not an image/i);
  });
});

describe('checkTextFile', () => {
  it('accepts the export formats the importer understands', () => {
    expect(checkTextFile(fakeFile('data.json', 'application/json', 10_000))).toBeNull();
    expect(checkTextFile(fakeFile('data.csv', 'text/csv', 10_000))).toBeNull();
    expect(checkTextFile(fakeFile('export.xml', '', 10_000))).toBeNull();
  });

  it('refuses an image or a binary pretending to be an export', () => {
    expect(checkTextFile(fakeFile('photo.jpg', 'image/jpeg', 10_000))?.reason).toBe('type');
  });

  it('refuses a file large enough to hang the phone', () => {
    expect(checkTextFile(fakeFile('dump.json', 'application/json', MAX_TEXT_BYTES + 1))?.reason).toBe('too-large');
  });
});

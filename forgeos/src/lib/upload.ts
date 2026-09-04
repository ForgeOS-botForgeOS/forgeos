// Everything that checks a file *before* the app reads or uploads it.
//
// `accept="image/*"` on an input is a filter for the file picker, not a
// promise: the picker can hand back anything, and on Android it regularly does.
// So every entry point goes through here, and here refuses in four ways:
//
//   - **type**: an allowlist, checked against the declared MIME *and* the
//     extension, because Android often reports an empty type;
//   - **size**: before `FileReader` touches it, so a 200 MB "photo" is a
//     sentence on screen instead of a dead tab;
//   - **decodability**: the only honest test of "is this an image" is asking
//     the browser to decode it;
//   - **content**: images are re-encoded through a canvas, which shrinks them
//     for the AI *and* drops every EXIF tag on the way — including the GPS
//     coordinates a phone writes into every photo. Meal photos go to a
//     third-party model; sending someone's exact location with lunch is not
//     something to leave to chance.
//
// The refusal is always a reason the caller can show, never a silent empty
// string — the old progress-photo path resolved to '' on a decode failure and
// happily saved a blank photo.

export type UploadRefusal = 'type' | 'too-large' | 'unreadable' | 'empty';

export class UploadError extends Error {
  constructor(readonly reason: UploadRefusal, message: string) {
    super(message);
  }
}

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif'];
const IMAGE_EXT = /\.(jpe?g|png|webp|heic|heif|avif)$/i;

/** Bigger than any phone photo, small enough that a mis-picked video is caught. */
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
/** Text imports are lists of numbers; a megabyte is already an enormous export. */
export const MAX_TEXT_BYTES = 8 * 1024 * 1024;

export const TEXT_TYPES = ['application/json', 'text/csv', 'text/plain', 'text/xml', 'application/xml'];
const TEXT_EXT = /\.(json|csv|txt|xml)$/i;

function typeAllowed(file: File, types: string[], ext: RegExp): boolean {
  // An empty type is common on Android; fall back to the name rather than
  // rejecting a legitimate photo, and rather than trusting the name alone.
  if (file.type) return types.includes(file.type.toLowerCase());
  return ext.test(file.name || '');
}

export function checkImageFile(file: File): UploadError | null {
  if (!file || file.size === 0) return new UploadError('empty', 'That file is empty.');
  if (!typeAllowed(file, IMAGE_TYPES, IMAGE_EXT)) {
    return new UploadError('type', 'That is not an image — pick a photo (JPG, PNG, WEBP or HEIC).');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return new UploadError('too-large', `That photo is ${Math.round(file.size / 1e6)} MB — the limit is ${MAX_IMAGE_BYTES / 1e6} MB.`);
  }
  return null;
}

export function checkTextFile(file: File): UploadError | null {
  if (!file || file.size === 0) return new UploadError('empty', 'That file is empty.');
  if (!typeAllowed(file, TEXT_TYPES, TEXT_EXT)) {
    return new UploadError('type', 'That file type is not supported — use JSON, CSV, XML or TXT.');
  }
  if (file.size > MAX_TEXT_BYTES) {
    return new UploadError('too-large', `That file is ${Math.round(file.size / 1e6)} MB — the limit is ${MAX_TEXT_BYTES / 1e6} MB.`);
  }
  return null;
}

/** Read a text/JSON/CSV file after checking it. Throws UploadError. */
export async function readTextFile(file: File): Promise<string> {
  const bad = checkTextFile(file);
  if (bad) throw bad;
  return file.text();
}

export interface PreparedImage {
  /** Re-encoded JPEG, EXIF-free. */
  blob: Blob;
  /** Base64 body (no data: prefix) — what the vision endpoints take. */
  base64: string;
  dataUrl: string;
  mime: 'image/jpeg';
  width: number;
  height: number;
  bytes: number;
}

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  // createImageBitmap handles HEIC/AVIF where the browser supports them and is
  // faster; the <img> path is the fallback for older WebViews.
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height };
    } catch {
      /* fall through to the <img> decoder */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new UploadError('unreadable', 'That image could not be opened.'));
      el.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Validate, decode, downscale and re-encode an image for upload or storage.
 *
 * `maxEdge` is the long side. 1280 is plenty for a model reading a plate of
 * food or a treadmill console, and turns a 12 MB phone photo into ~200 KB —
 * which is also why the request now fits comfortably inside the endpoint's
 * limits instead of being rejected after a long upload.
 */
export async function prepareImage(file: File, maxEdge = 1280, quality = 0.82): Promise<PreparedImage> {
  const bad = checkImageFile(file);
  if (bad) throw bad;

  const { source, width, height } = await decode(file);
  if (!width || !height) throw new UploadError('unreadable', 'That image could not be opened.');

  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new UploadError('unreadable', 'This device could not process that image.');
  ctx.drawImage(source, 0, 0, w, h);
  if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) source.close();

  // Canvas output carries pixels and nothing else: no EXIF, no GPS, no maker
  // notes. That is the privacy half of this function, and it is free.
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const base64 = dataUrl.split(',')[1] ?? '';
  if (!base64) throw new UploadError('unreadable', 'That image could not be processed.');
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new UploadError('unreadable', 'That image could not be processed.'))), 'image/jpeg', quality);
  });

  return { blob, base64, dataUrl, mime: 'image/jpeg', width: w, height: h, bytes: blob.size };
}

/** The message to show a user when an upload is refused. */
export function uploadErrorMessage(e: unknown): string {
  return e instanceof UploadError ? e.message : 'That file could not be read.';
}

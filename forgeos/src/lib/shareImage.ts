// Share a rendered picture through the system share sheet, with text (and the
// link inside it) alongside. Only browsers that can share files take this path;
// the Android app's WebView has no navigator.share at all, so callers fall back
// to sharing the link. 'cancelled' means the user closed the sheet: do nothing.
export type ImageShareResult = 'shared' | 'cancelled' | 'unsupported';

export function dataUrlToFile(dataUrl: string, filename: string): File | null {
  const m = /^data:([^;,]+);base64,(.*)$/.exec(dataUrl);
  if (!m) return null;
  try {
    const bin = atob(m[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], filename, { type: m[1] });
  } catch {
    return null;
  }
}

type FileShareNavigator = Navigator & {
  canShare?: (d: { files?: File[] }) => boolean;
  share?: (d: { files?: File[]; title?: string; text?: string }) => Promise<void>;
};

export async function shareImage(dataUrl: string, filename: string, title: string, text: string): Promise<ImageShareResult> {
  if (typeof navigator === 'undefined') return 'unsupported';
  const nav = navigator as FileShareNavigator;
  if (typeof nav.share !== 'function' || typeof nav.canShare !== 'function') return 'unsupported';
  const file = dataUrlToFile(dataUrl, filename);
  if (!file) return 'unsupported';
  let ok = false;
  try {
    ok = nav.canShare({ files: [file] });
  } catch {
    ok = false;
  }
  if (!ok) return 'unsupported';
  try {
    await nav.share({ files: [file], title, text });
    return 'shared';
  } catch (e) {
    return e instanceof Error && e.name === 'AbortError' ? 'cancelled' : 'unsupported';
  }
}

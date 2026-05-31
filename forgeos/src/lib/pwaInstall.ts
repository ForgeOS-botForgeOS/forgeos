import { useEffect, useState } from 'react';

// Captures the browser's install prompt so we can trigger it from our own
// big "Install app" button instead of relying on the browser's mini-infobar.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(navigator as unknown as { MSStream?: unknown }).MSStream;
}

export function useInstall() {
  const [canInstall, setCanInstall] = useState(Boolean(deferred));
  useEffect(() => {
    const l = () => setCanInstall(Boolean(deferred));
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);

  const promptInstall = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferred) return 'unavailable';
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    notify();
    return outcome;
  };

  return { canInstall, promptInstall, standalone: isStandalone(), ios: isIOS() };
}

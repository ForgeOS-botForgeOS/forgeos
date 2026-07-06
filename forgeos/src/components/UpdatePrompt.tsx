import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useRegisterSW } from 'virtual:pwa-register/react';

// Silent auto-update: checks for a freshly-deployed build every 30 min and
// whenever the app regains focus; the service worker installs it in the
// background and the page reloads once the new version takes control.
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

export function UpdatePrompt() {
  // Inside the APK updates arrive over the air (src/lib/webUpdate.ts); a
  // service worker would only serve stale cached assets after a bundle swap.
  return Capacitor.isNativePlatform() ? <NativeSWCleanup /> : <WebAutoUpdate />;
}

/** Unregister any service worker left behind by pre-OTA APK builds. */
function NativeSWCleanup() {
  useEffect(() => {
    void navigator.serviceWorker?.getRegistrations?.().then((regs) => {
      for (const r of regs) void r.unregister();
    });
    if ('caches' in window) {
      void caches.keys().then((keys) => {
        for (const k of keys) void caches.delete(k);
      });
    }
  }, []);
  return null;
}

function WebAutoUpdate() {
  useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      // Periodic check…
      setInterval(() => void reg.update(), CHECK_INTERVAL_MS);
      // …plus an immediate check each time the app is reopened/focused.
      const check = () => {
        if (document.visibilityState === 'visible') void reg.update();
      };
      document.addEventListener('visibilitychange', check);
      window.addEventListener('focus', check);
      // Reload to the new assets when the fresh service worker takes over —
      // but not on the very first install (no controller yet).
      let hadController = !!navigator.serviceWorker?.controller;
      navigator.serviceWorker?.addEventListener('controllerchange', () => {
        if (hadController) window.location.reload();
        hadController = true;
      });
    },
  });
  return null;
}

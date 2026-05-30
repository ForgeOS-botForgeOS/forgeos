// Preloaded via NODE_OPTIONS before `vite build`. Node 18 doesn't expose a
// global `crypto` with createHash, which workbox-build references by bare name.
const crypto = require('crypto');
if (!globalThis.crypto || typeof globalThis.crypto.createHash !== 'function') {
  Object.defineProperty(globalThis, 'crypto', { value: crypto, configurable: true, writable: true });
}

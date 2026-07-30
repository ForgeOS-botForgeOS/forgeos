import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Base path: '/' locally, '/<repo>/' for GitHub Pages (set via DEPLOY_BASE).
  base: process.env.DEPLOY_BASE || '/',
  // Build identity baked into the bundle. __WEB_SHA__ is the commit this
  // bundle was built from — the APK compares it with version.json on the
  // app-latest release to pull OTA web updates (src/lib/webUpdate.ts).
  // __BUILD_TIME__ stays as the fallback check for APKs older than the updater.
  define: {
    __BUILD_TIME__: JSON.stringify(Date.now()),
    __WEB_SHA__: JSON.stringify(process.env.GITHUB_SHA || 'dev'),
    // Human-readable version like "1.0.52" (CI sets APP_VERSION from the run
    // number); shown in the Profile footer so users can tell builds apart.
    __APP_VERSION__: JSON.stringify(process.env.APP_VERSION || 'dev'),
  },
  // Allow tunnel hostnames (e.g. *.trycloudflare.com) to reach dev/preview.
  server: { allowedHosts: true },
  preview: { allowedHosts: true },
  plugins: [
    react(),
    VitePWA({
      // 'autoUpdate': new deploys install silently and the page reloads once
      // the fresh service worker takes over — no banner to tap (store state
      // survives the reload via zustand persist).
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'vite.svg'],
      manifest: {
        name: 'ForgeOS — Fitness, Nutrition & Social',
        short_name: 'ForgeOS',
        description: 'Gamified fitness, nutrition and social training on an 80/20 philosophy.',
        theme_color: '#0b0e14',
        background_color: '#0b0e14',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        // recharts + vendor chunks can exceed the default 2 MiB precache limit
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            // The ZXing barcode decoder (~1 MB of WebAssembly). Deliberately NOT
            // precached: only browsers without a native BarcodeDetector ever
            // fetch it, so it is cached on first use instead of costing every
            // visitor a megabyte up front.
            urlPattern: ({ url }) => url.pathname.endsWith('.wasm'),
            handler: 'CacheFirst',
            options: { cacheName: 'forgeos-wasm', expiration: { maxEntries: 4 } },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Split heavy libs into their own cacheable chunks.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          motion: ['framer-motion'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})

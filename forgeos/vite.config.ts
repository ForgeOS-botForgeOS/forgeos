import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Base path: '/' locally, '/<repo>/' for GitHub Pages (set via DEPLOY_BASE).
  base: process.env.DEPLOY_BASE || '/',
  // Build timestamp baked into the bundle — the APK compares it against the
  // app-latest release to detect that a newer build exists (src/lib/appUpdate.ts).
  define: { __BUILD_TIME__: JSON.stringify(Date.now()) },
  // Allow tunnel hostnames (e.g. *.trycloudflare.com) to reach dev/preview.
  server: { allowedHosts: true },
  preview: { allowedHosts: true },
  plugins: [
    react(),
    VitePWA({
      // 'prompt' so a new deploy surfaces an in-app "Update" banner the user
      // taps to reload, instead of silently swapping under them.
      registerType: 'prompt',
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

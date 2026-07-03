import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { skipWaiting: true, clientsClaim: true, cleanupOutdatedCaches: true },
      manifest: {
        name: 'ConCheck', short_name: 'ConCheck',
        theme_color: '#0F1B26', background_color: '#0F1B26', display: 'standalone',
        icons: [],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    env: { VITE_SUPABASE_URL: 'http://localhost:54321', VITE_SUPABASE_ANON_KEY: 'test-anon-key' },
  },
});

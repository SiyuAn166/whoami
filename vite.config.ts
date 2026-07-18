import { defineConfig } from 'vite';

import react from '@vitejs/plugin-react';
import eslint from 'vite-plugin-eslint2';

// https://vite.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/whoami/' : '/',
  plugins: [react(), eslint()],

  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },

  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          pixi: ["pixi.js"],
        },
      },
    },
  },
})

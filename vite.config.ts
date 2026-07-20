import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/whoami/' : '/',
  plugins: [react()],

  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },

  build: {
    chunkSizeWarningLimit: 1024,
    rollupOptions: {
      output: {
        manualChunks: {
          pixi: ["pixi.js"],
        },
      },
    },
  },
})

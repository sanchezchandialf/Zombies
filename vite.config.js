import { defineConfig } from 'vite';

// base relativa: el juego compilado funciona desde cualquier subcarpeta (GitHub Pages, artefacto, etc.)
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 4000,
  },
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
});

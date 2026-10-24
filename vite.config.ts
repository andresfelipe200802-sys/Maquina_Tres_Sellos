import { resolve } from 'node:path';
import { defineConfig } from 'vite';

/**
 * GitHub Pages publica archivos estáticos. `base: './'` mantiene los recursos
 * relativos tanto en la raíz como en una subruta /nombre-del-repositorio/.
 */
export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        instructor: resolve(process.cwd(), 'instructor/index.html'),
      },
    },
  },
});

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['server/**', '**/node_modules/**', 'dist/**'],
  },
});

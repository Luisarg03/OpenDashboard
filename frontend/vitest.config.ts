import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Playwright e2e specs live under tests/; vitest must not pick them up.
    // node_modules is a default exclude that must be restated when overriding.
    exclude: ['tests/**', '**/node_modules/**'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});

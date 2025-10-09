import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom', // default for React component tests
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}', '../tests/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    // Use Node.js environment for contract tests (they use fs APIs)
    environmentMatchGlobs: [
      ['../tests/contract/**', 'node'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.{ts,tsx}',
        '**/types/',
        'vite.config.ts',
        'vitest.config.ts',
      ],
    },
  },
});

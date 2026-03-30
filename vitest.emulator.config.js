import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup/emulators.js'],
    fileParallelism: false,
    maxConcurrency: 1,
    testTimeout: 30000,
    hookTimeout: 30000,
    reporters: process.env.CI ? ['default', 'github-actions'] : ['default'],
  },
});

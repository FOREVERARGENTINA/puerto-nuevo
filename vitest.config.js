import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.js'],
    exclude: ['tests/**', 'functions/**', 'e2e/**'],
    reporters: process.env.CI ? ['default', 'github-actions'] : ['default'],
  },
});

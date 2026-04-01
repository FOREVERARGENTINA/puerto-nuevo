const path = require('path');
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: path.join(__dirname, 'tests', 'e2e'),
  globalSetup: path.join(__dirname, 'tests', 'e2e', 'global-setup.cjs'),
  fullyParallel: false,
  workers: 1,
  timeout: process.env.CI ? 120000 : 90000,
  retries: process.env.CI ? 1 : 0,
  expect: {
    timeout: 10000,
  },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev:test-emulated',
    url: 'http://127.0.0.1:4173/portal/login',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});

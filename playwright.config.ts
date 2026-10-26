import { defineConfig, devices } from '@playwright/test';

const externalBaseURL = process.env.E2E_BASE_URL;
const baseURL = externalBaseURL || 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 60_000,
  globalTimeout: 10 * 60_000,
  expect: { timeout: 15_000 },
  outputDir: 'test-results',
  reporter: [['list', { printSteps: true }], ['html', { open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    locale: 'en-US',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', testMatch: '**/*.spec.ts', testIgnore: '**/*.live.spec.ts' },
    {
      name: 'account-lifecycle',
      testMatch: '**/*.live.spec.ts',
      timeout: 240_000,
      // Auth responses contain bearer tokens. Keep them out of trace/video files.
      use: { trace: 'off', video: 'off' },
    },
  ],
  webServer: externalBaseURL ? undefined : {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { VITE_PADDLE_ENV: process.env.VITE_PADDLE_ENV || 'production' },
  },
});

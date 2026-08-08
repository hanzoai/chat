import { PlaywrightTestConfig } from '@playwright/test';

/**
 * The live-run spec, against servers already running.
 *
 * It starts nothing: the backend holds a SQLite store the seed script wrote to,
 * and starting a second one would look at a different database. Point it at the
 * pair you booted.
 */
const config: PlaywrightTestConfig = {
  testDir: './specs',
  testMatch: 'live-run.spec.ts',
  timeout: 120_000,
  workers: 1,
  reporter: [['line']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3091',
    trace: 'retain-on-failure',
  },
};

export default config;

import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { getBaseE2EEnv, getE2EBaseURL } from './setup/env';

const rootPath = path.resolve(__dirname, '..');
const serverPath = path.resolve(rootPath, 'e2e/setup/start-server.js');
const reportPath = path.resolve(rootPath, 'e2e/playwright-report');
const baseURL = getE2EBaseURL();

/**
 * The window chrome, measured against the BUILT client in a real Chromium.
 *
 * It signs nobody in, deliberately. There is no local login route in this fork
 * (IAM OIDC or guest, nothing else), so the UI registration `global-setup` the
 * other configs share cannot complete here — and it does not need to: the
 * chrome is byte-identical for a guest, so this suite runs the guest path and
 * stays a pure geometry gate with no identity to mint or clean up.
 *
 * Run it against a built client:
 *   npm run build:packages && (cd client && npm run build)
 *   npx playwright test --config=e2e/playwright.config.chrome.ts
 */
export default defineConfig({
  testDir: 'specs/chrome/',
  outputDir: 'specs/.test-results',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI
    ? [['html', { outputFolder: reportPath, open: 'never' }], ['line']]
    : [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    headless: true,
    screenshot: 'only-on-failure',
  },
  expect: { timeout: 10000 },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node ${serverPath}`,
    cwd: rootPath,
    url: baseURL,
    stdout: 'pipe',
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      ...getBaseE2EEnv(),
      /* The guest is the whole point: it renders the real chat shell — header,
         composer, panels — with no credential to mint. */
      ALLOW_GUEST_CHAT: 'true',
      GUEST_TOKEN_MAX: '999',
      TITLE_CONVO: 'false',
      OPENID_CLIENT_ID: '',
      OPENID_ISSUER: '',
      ALLOW_SOCIAL_LOGIN: 'false',
    },
  },
});

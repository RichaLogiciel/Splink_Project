// @ts-check
const { defineConfig, devices } = require('@playwright/test');

require('dotenv').config();
const maxFailures = process.env?.LOCAL == 'true' ? 10 : 5;

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',
  maxFailures: maxFailures,
  timeout: 2 * (60 * 60 * 1000), // 2 hours
  expect: {
    timeout: 4000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: Number(process.env.MAX_RETRIES)
    ? Number(process.env.MAX_RETRIES)
    : 0,
  workers: Number(process.env.MAX_WORKERS)
    ? Number(process.env.MAX_WORKERS)
    : 4,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  testIgnore: ['utils/*'],
  testMatch: [
    // 'tests/super-admin-dashboard.spec.js',
    // 'tests/distributor-admin/dashboard.spec.js',
    // 'tests/manufacturer-admin/programs-overview.spec.js',
    // 'tests/distributor-admin/product-insight.spec.js',
    // ================================================
    'tests/distributor-admin/distributor-program-detail.spec.js',
    'tests/distributor-admin/distributor-program.spec.js',
    'tests/distributor-admin/store-program-detail-common.spec.js',
    'tests/distributor-admin/store-breakdown-common.spec.ts',
    'tests/distributor-admin/earnings-cap-validation.spec.js',
    'tests/distributor-admin/weekly-snapshot-trend.spec.js',
    // ===============================================
    'tests/sales-rep-manager/dashboard.spec.js',
    'tests/sales-rep-manager/store-program-detail-common.spec.js',
    'tests/sales-rep-manager/store-breakdown-common.spec.ts',
    'tests/sales-rep-manager/sales-rep-manager-earnings-match.spec.js',
    // ===============================================
    'tests/sales-rep/store-program-detail-common.spec.js',
    'tests/sales-rep/store-breakdown-common.spec.ts',
    // 'tests/sales-rep/earnings-cap-validation.spec.js',
    // ================================================
    // 'tests/sales-rep/store-spiff-breakdown.spec.ts',
    'tests/sales-rep/sales-rep-earnings-match.spec.js',
    'tests/sales-rep/sales-rep-spiff-overview-comparison.spec.js',
    'tests/sales-rep/sales-rep-historical-payout.spec.js',
    // ===============================================
    // 'tests/manufacturer-admin/store-breakdown-common.spec.ts',
    // ===============================================
    'tests/mobile-white-screen.spec.js',
    // ===============================================
  ],
  projects: [
    // {
    //   name: 'Historical',
    //   use: {
    //     ...devices['Desktop Chrome'],
    //     // Set the environment variable for the program timeline to test
    //     env: {
    //       ...process.env,
    //       PROGRAM_TIMELINE_TO_TEST: 'Historical',
    //     },
    //   },
    // },
    {
      name: 'Current',
      use: {
        ...devices['Desktop Chrome'],
        // Set the environment variable for the program timeline to test
        env: {
          ...process.env,
          PROGRAM_TIMELINE_TO_TEST: 'Current',
        },
      },
    },
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
});

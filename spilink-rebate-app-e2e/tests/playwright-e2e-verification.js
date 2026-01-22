import { test } from '@playwright/test';
import LoginPage from '../pages/LoginPage';
import SuperAdminUsersTable from '../pages/SuperAdminUsersTable';
import { distributorMap } from '../utils/userMap';

// File-level timeout: 60 seconds
test.setTimeout(60000);

// Run only on Chromium (Chrome). Skip on Firefox/WebKit.
test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'Runs only on Chrome'
);

test.describe('Playwright E2E Verification', () => {
  // Describe-level timeout: 60 seconds
  test.setTimeout(60000);

  const superAdminEmail =
    process.env.SUPER_ADMIN_EMAIL || 'superadmin@example.com';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'password';

  async function impersonateSandstrom(page) {
    console.log('[E2E] Navigating to login');
    const loginPage = new LoginPage(page);
    await loginPage.navigateToLogin();

    console.log('[E2E] Logging in as Super Admin');
    await loginPage.login(superAdminEmail, superAdminPassword);

    console.log('[E2E] Preparing impersonation to Sandstrom Distributor Admin');
    const usersTable = new SuperAdminUsersTable(page);
    const sandstrom = distributorMap.get('Sandstrom');

    console.log('[E2E] Searching user');
    await usersTable.searchUser(sandstrom.name);
    await usersTable.waitForTableUpdate(sandstrom.email);

    console.log('[E2E] Opening actions and impersonating');
    await usersTable.openFirstRowActions();
    await usersTable.clickImpersonate();
    await usersTable.confirmImpersonation();

    console.log('[E2E] Waiting for target app to load');
    await page.waitForLoadState('networkidle');
  }

  test('verification pass - super admin impersonates Sandstrom', async ({
    page,
  }) => {
    await impersonateSandstrom(page);
    console.log('[E2E] Test completed (pass)');
  });

  test('verification fail - super admin impersonates Sandstrom and fails intentionally', async ({
    page,
  }) => {
    await impersonateSandstrom(page);
    console.log('[E2E] Capturing screenshot before failing');
    // await page.screenshot({
    //   path: 'playwright-e2e-verification-fail.png',
    //   fullPage: true,
    // });
    console.log('[E2E] Test completed (fail)');
    // test.fail('Test completed but failed manually for testing');
  });
});

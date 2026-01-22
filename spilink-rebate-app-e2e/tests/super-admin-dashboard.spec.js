import { expect, test } from '@playwright/test';
import LoginPage from '../pages/LoginPage';
import SuperAdminUsersTable from '../pages/SuperAdminUsersTable';

import { ENTITY_TYPE } from '../utils/constant';
import { distributorMap, manufacturerMap } from '../utils/userMap';

// Helper to get user data from map
function getUserData(type, name) {
  const map =
    type === ENTITY_TYPE.MANUFACTURER ? manufacturerMap : distributorMap;
  if (!map) throw new Error(`${type}Map is not initialized`); // Explicit error
  const user = map.get(name);
  if (!user) throw new Error(`User "${name}" not found in ${type}Map`);
  return user;
}

test.describe('Super Admin View User Experience', () => {
  const superAdminEmail =
    process.env.SUPER_ADMIN_EMAIL || 'superadmin@example.com';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'password';

  /**
   * @param {import('@playwright/test').Page} page
   * @param {'manufacturer'|'distributor'} type
   * @param {string} name
   */
  async function impersonateUser(page, type, name) {
    const user = getUserData(type, name);
    const usersTable = new SuperAdminUsersTable(page);
    await usersTable.searchUser(user.name);
    await usersTable.waitForTableUpdate(user.email);
    await usersTable.openFirstRowActions();
    await usersTable.clickImpersonate();
    await usersTable.confirmImpersonation();
    // Wait for dashboard to load (can be improved with a specific selector)
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/app\/dashboard/);
  }

  test('Impersonate Manufacturer', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
    await loginPage.login(superAdminEmail, superAdminPassword);
    await impersonateUser(
      page,
      ENTITY_TYPE.MANUFACTURER,
      'Wonderful Pistachios'
    );
    // Add dashboard assertion if needed
  });

  test('Impersonate Distributor', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
    await loginPage.login(superAdminEmail, superAdminPassword);
    await impersonateUser(page, ENTITY_TYPE.DISTRIBUTOR, 'Sandstrom');
    // Add dashboard assertion if needed
  });
});

import { expect, test } from '@playwright/test';
import SalesRepManagerDashboardPage from '../../pages/sales-rep-manager/DashboardPage';
import SuperAdminUsersTable from '../../pages/SuperAdminUsersTable';
import { ENTITY_TYPE } from '../../utils/constant';
import {
  distributorMap,
  manufacturerMap,
  salesRepManagerMap,
} from '../../utils/userMap';

test.describe('Sales Rep Manager Dashboard', () => {
  let dashboardPage;
  let usersTable;

  test.beforeEach(async ({ page }) => {
    // Set larger viewport for all browsers
    await page.setViewportSize({ width: 1920, height: 1080 });

    dashboardPage = new SalesRepManagerDashboardPage(page);
    usersTable = new SuperAdminUsersTable(page);

    // Impersonate sales rep manager
    await usersTable.impersonateUser(
      ENTITY_TYPE.SALES_REP_MANAGER,
      'House Accounts',
      {
        manufacturerMap,
        distributorMap,
        salesRepManagerMap,
      }
    );

    // Wait for successful login and navigation
    await expect(page).toHaveURL(/app/);
    await page.waitForLoadState('networkidle');

    // Navigate to dashboard
    await page.waitForTimeout(5000);
  });

  test('should display all dashboard components', async ({ page }) => {
    await expect(
      page.locator(dashboardPage.selectors.dashboardTitle)
    ).toBeVisible();
    await expect(
      page.locator(dashboardPage.selectors.estimatedEarningsValue)
    ).toBeVisible();
    await expect(
      page.locator(dashboardPage.selectors.myEarningsValue)
    ).toBeVisible();
  });

  test('should verify dashboard navigation', async ({ page }) => {
    // Test clicking on estimated earnings widget
    await dashboardPage.clickEstimatedEarnings();

    // Test clicking on my earnings widget
    await dashboardPage.clickMyEarnings();

    // Test Programs button navigation
    await dashboardPage.clickProgramsButton();

    // Test Independent link navigation
    await dashboardPage.clickIndependentLink();
  });

  test('should validate financial widgets', async ({ page }) => {
    const { estimatedEarnings, myEarnings } =
      await dashboardPage.validateFinancialWidgets();

    // Verify that values are numeric and non-negative
    expect(estimatedEarnings).toBeGreaterThanOrEqual(0);
    expect(myEarnings).toBeGreaterThanOrEqual(0);

    console.log('Estimated Earnings:', estimatedEarnings);
    console.log('My Earnings:', myEarnings);
  });
});

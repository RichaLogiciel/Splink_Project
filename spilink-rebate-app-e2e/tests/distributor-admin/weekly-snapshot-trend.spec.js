import { expect, test } from '@playwright/test';
import ProgramPage from '../../pages/distributor-admin/ProgramPage';
import SuperAdminUsersTable from '../../pages/SuperAdminUsersTable';
import { ENTITY_TYPE } from '../../utils/constant';
import { distributorMap, manufacturerMap } from '../../utils/userMap';
import { ComparisonEngine } from '../shared/utils/ComparisonEngine';
import { SnapshotManager } from '../shared/utils/SnapshotManager';
import { TestHelpers } from '../shared/utils/TestHelpers';

distributorMap.forEach((distributor, distributorKey) => {
  test.describe(`Weekly Snapshot Trend: ${distributor.name}`, () => {
    let programPage;
    let usersTable;
    let snapshotManager;
    let comparisonEngine;

    test.beforeEach(async ({ page }) => {
      // Setup following existing pattern
      programPage = new ProgramPage(page);
      usersTable = new SuperAdminUsersTable(page);
      snapshotManager = new SnapshotManager();
      comparisonEngine = new ComparisonEngine();

      // Impersonate distributor
      await usersTable.impersonateUser(
        ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        distributorKey,
        { manufacturerMap, distributorMap }
      );

      await expect(page).toHaveURL(/app/);
      await page.waitForLoadState('networkidle');

      // Navigate to Store Programs tab
      await programPage.switchToStorePrograms();
      await expect(page).toHaveURL(/programs\/store/);
    });

    test('Compare current data with most recent snapshot from S3', async ({
      page,
    }) => {
      const errorFlag = [];

      // 1. Extract all store programs data from current page
      const programs = await programPage.getAllStoreProgramsWithCompleteData();

      if (programs.length === 0) {
        console.warn(
          `No programs found for ${distributor.name}. Skipping comparison.`
        );
        return;
      }

      // 2. Create current snapshot object from page data
      const currentSnapshot = {
        snapshot_date: new Date().toISOString().split('T')[0],
        week_ending: new Date().toISOString().split('T')[0],
        distributor: distributor.name,
        programs: programs,
      };

      // 3. Find and download most recent snapshot from S3
      const previousSnapshot = await snapshotManager.findMostRecentSnapshot(
        distributor.name
      );

      // 4. Compare current data with S3 snapshot
      if (previousSnapshot) {
        const comparison = comparisonEngine.compare(
          currentSnapshot,
          previousSnapshot
        );
        comparisonEngine.logComparisonReport(comparison);

        // Extract decrease errors (sales volume or earnings decreased)
        const decreaseErrors =
          comparisonEngine.extractDecreaseErrors(comparison);
        errorFlag.push(...decreaseErrors);
      } else {
        console.warn(
          `⚠️  No previous snapshot found in S3 for ${distributor.name}. Cannot perform comparison.`
        );
        // Test passes with warning - no comparison possible
      }

      // 5. Handle errors - fail test if there are decreases
      await TestHelpers.handleErrors(errorFlag, 'Weekly Snapshot Trend Test');
    });
  });
});

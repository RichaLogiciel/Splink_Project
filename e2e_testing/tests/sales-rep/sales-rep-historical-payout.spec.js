const { expect, test } = require('@playwright/test');
const SalesRepDashboardPage = require('../../pages/sales-rep/DashboardPage');
const SpiffProgramsPage = require('../../pages/sales-rep/SpiffProgramsPage');
const SuperAdminUsersTable =
  require('../../pages/SuperAdminUsersTable').default;
const { ENTITY_TYPE } = require('../../utils/constant');
const { expectWithMessage } = require('../../utils/helper');
const { salesRepMap } = require('../../utils/userMap');
const { TestHelpers } = require('../shared/utils/TestHelpers');

// Loop through each sales rep in the user map to create a test suite per user
salesRepMap.forEach((salesRep, salesRepKey) => {
  // Declare page object variables for use in beforeEach and tests
  let usersTable;
  let dashboardPage;
  let spiffProgramsPage;

  // Main test suite for each sales rep
  test.describe(`Sales Rep: Historical Payout Test - ${salesRep.name}`, () => {
    // Setup before each test: impersonate user and navigate to Dashboard
    test.beforeEach(async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Runs only on Chrome');

      // Set a large viewport for consistency
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Instantiate page objects
      usersTable = new SuperAdminUsersTable(page);
      dashboardPage = new SalesRepDashboardPage(page);
      spiffProgramsPage = new SpiffProgramsPage(page);

      // Impersonate the current sales rep
      await usersTable.impersonateUser(
        ENTITY_TYPE.DISTRIBUTOR_SALES_REP,
        salesRepKey,
        {
          salesRepMap,
        }
      );
      console.log(`[${salesRep.name}] Impersonation complete.`);

      // Ensure we are on the app page after impersonation
      await expectWithMessage(
        () => expect(page).toHaveURL(/\/app\/dashboard/),
        `Expected to be on the app page after impersonation, but got: ${page.url()}`
      );
      console.log(`[${salesRep.name}] On app page after impersonation.`);

      await page.waitForLoadState('networkidle');
    });

    test(`should match Dashboard payouts with Historical SPIFF Programs for ${salesRep.name}`, async ({
      page,
      browserName,
    }) => {
      if (browserName !== 'chromium') test.skip();

      // Error flag array to collect all soft errors for this user
      const errorFlag = [];
      const userData = salesRep;
      TestHelpers.logTestStart(userData.name, 'Historical Payout Match Test');

      // Double-check we are on the app page
      await expect(page).toHaveURL(/app/);
      await page.waitForLoadState('networkidle');

      // Get dashboard metrics
      const dashboardMetrics = await dashboardPage.getDashboardMetrics();
      console.log(`[${salesRep.name}] Dashboard metrics:`, dashboardMetrics);
      console.log(
        `[${salesRep.name}] Dashboard Pending Payout: ${dashboardMetrics.pendingPayout}`
      );
      console.log(
        `[${salesRep.name}] Dashboard Historical Payout: ${dashboardMetrics.historicalPayout}`
      );

      // Navigate to SPIFF Programs page
      await spiffProgramsPage.switchToSpiffPrograms();
      await page.waitForLoadState('networkidle');
      console.log(`[${salesRep.name}] Navigated to SPIFF Programs page.`);

      // Change dropdown to Historical
      await spiffProgramsPage.changeProgramTimeline('Historical');
      await page.waitForLoadState('networkidle');
      console.log(`[${salesRep.name}] Changed program timeline to Historical.`);

      // Get all SPIFF programs with Historical data
      const historicalSpiffPrograms =
        await spiffProgramsPage.getSpiffPrograms();
      console.log(
        `[${salesRep.name}] Found ${historicalSpiffPrograms.length} Historical SPIFF programs.`
      );

      // Calculate total earnings from all Historical SPIFF programs
      const totalHistoricalEarnings = historicalSpiffPrograms.reduce(
        (sum, program) => sum + program.myEarnings,
        0
      );
      console.log(
        `[${salesRep.name}] Total Historical SPIFF Programs earnings: ${totalHistoricalEarnings}`
      );

      // Compare Dashboard pending payout with Historical SPIFF Programs total (with small tolerance for rounding)
      if (
        Math.abs(dashboardMetrics.pendingPayout - totalHistoricalEarnings) > 1
      ) {
        const screenshot = await TestHelpers.takeScreenshot(
          page,
          'dashboard-pending-payout-historical-mismatch',
          `${userData.name}`
        );
        errorFlag.push({
          failed: true,
          message: `Dashboard Pending Payout vs Historical SPIFF Programs mismatch for ${userData.name}\nDashboard Pending Payout: ${dashboardMetrics.pendingPayout}, Historical SPIFF Programs Total: ${totalHistoricalEarnings}\nScreenshot: ${screenshot}\n\n`,
        });
      }

      // Compare Dashboard historical payout with Historical SPIFF Programs total (with small tolerance for rounding)
      if (
        Math.abs(dashboardMetrics.historicalPayout - totalHistoricalEarnings) >
        1
      ) {
        const screenshot = await TestHelpers.takeScreenshot(
          page,
          'dashboard-historical-payout-historical-mismatch',
          `${userData.name}`
        );
        errorFlag.push({
          failed: true,
          message: `Dashboard Historical Payout vs Historical SPIFF Programs mismatch for ${userData.name}\nDashboard Historical Payout: ${dashboardMetrics.historicalPayout}, Historical SPIFF Programs Total: ${totalHistoricalEarnings}\nScreenshot: ${screenshot}\n\n`,
        });
      }

      // Compare individual manufacturer earnings between Historical SPIFF Programs and Program Details
      console.log(
        `[${salesRep.name}] Testing manufacturer earnings comparison...`
      );
      const manufacturerComparisonData = [];

      for (let i = 0; i < historicalSpiffPrograms.length; i++) {
        const spiffProgram = historicalSpiffPrograms[i];
        console.log(
          `[${salesRep.name}] Clicking on Historical SPIFF Program card: ${spiffProgram.manufacturerName}`
        );

        // Click on the manufacturer card to open SPIFF Program Details
        const programCard = page.locator(
          `${spiffProgramsPage.selectors.spiffProgramCard}:nth-child(${i + 1})`
        );
        await programCard.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Wait for SPIFF Program Details page to load
        try {
          await page.waitForSelector(
            '#my-earnings-card .text-2xl.font-semibold',
            {
              state: 'visible',
              timeout: 10000,
            }
          );

          // Extract SPIFF Program Details data
          const detailsData =
            await spiffProgramsPage.getSpiffProgramDetailsData();
          console.log(
            `[${salesRep.name}] Historical SPIFF Program Details for ${spiffProgram.manufacturerName}:`,
            detailsData
          );

          // Compare earnings between Historical SPIFF Programs page and SPIFF Program Details page
          if (
            Math.abs(spiffProgram.myEarnings - detailsData.myEarnings) > 0.01
          ) {
            const screenshot = await TestHelpers.takeScreenshot(
              page,
              'historical-spiff-programs-details-earnings-mismatch',
              `${userData.name}-${spiffProgram.manufacturerName}`
            );
            errorFlag.push({
              failed: true,
              message: `Historical SPIFF Programs vs Details earnings mismatch for ${userData.name} - ${spiffProgram.manufacturerName}\nHistorical SPIFF Programs: ${spiffProgram.myEarnings}, Details: ${detailsData.myEarnings}\nScreenshot: ${screenshot}\n\n`,
            });
          }

          // Store comparison data
          manufacturerComparisonData.push({
            manufacturer: spiffProgram.manufacturerName,
            historicalSpiffProgramsEarnings: spiffProgram.myEarnings,
            detailsEarnings: detailsData.myEarnings,
            programDetails: detailsData.programDetails,
          });

          // Go back to SPIFF Programs page
          await page.goBack();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1000);
        } catch (error) {
          console.log(
            `[${salesRep.name}] Failed to load Historical SPIFF Program Details for ${spiffProgram.manufacturerName}: ${error.message}`
          );
          const screenshot = await TestHelpers.takeScreenshot(
            page,
            'historical-spiff-program-details-load-failed',
            `${userData.name}-${spiffProgram.manufacturerName}`
          );
          errorFlag.push({
            failed: true,
            message: `Failed to load Historical SPIFF Program Details for ${userData.name} - ${spiffProgram.manufacturerName}\nError: ${error.message}\nScreenshot: ${screenshot}\n\n`,
          });
        }
      }

      // Log comparison summary
      console.log(`[${salesRep.name}] Historical Payout Comparison Summary:`);
      console.log(
        `[${salesRep.name}] - Dashboard Pending Payout: ${dashboardMetrics.pendingPayout}`
      );
      console.log(
        `[${salesRep.name}] - Dashboard Historical Payout: ${dashboardMetrics.historicalPayout}`
      );
      console.log(
        `[${salesRep.name}] - Historical SPIFF Programs Total: ${totalHistoricalEarnings}`
      );
      console.log(
        `[${salesRep.name}] - Manufacturers compared: ${manufacturerComparisonData.length}`
      );

      console.log(
        `[${salesRep.name}] Historical Manufacturer Comparison Data:`,
        manufacturerComparisonData.map((data) => ({
          manufacturer: data.manufacturer,
          historicalSpiffProgramsEarnings: data.historicalSpiffProgramsEarnings,
          detailsEarnings: data.detailsEarnings,
          programDetailsCount: data.programDetails.length,
        }))
      );

      // Log test completion and handle all collected errors
      TestHelpers.logTestComplete(
        userData.name,
        'Historical Payout Match Test'
      );
      await TestHelpers.handleErrors(errorFlag, 'Historical Payout Match Test');
    });
  });
});

const { expect, test } = require('@playwright/test');
const SalesRepManagerDashboardPage = require('../../pages/sales-rep-manager/DashboardPage');
const SpiffProgramsPage = require('../../pages/sales-rep-manager/SpiffProgramsPage');
const SuperAdminUsersTable =
  require('../../pages/SuperAdminUsersTable').default;
const { ENTITY_TYPE } = require('../../utils/constant');
const { expectWithMessage } = require('../../utils/helper');
const { salesRepManagerMap } = require('../../utils/userMap');
const { TestHelpers } = require('../shared/utils/TestHelpers');

// Loop through each sales rep manager in the user map to create a test suite per user
salesRepManagerMap.forEach((salesRepManager, salesRepManagerKey) => {
  // Declare page object variables for use in beforeEach and tests
  let usersTable;
  let dashboardPage;
  let spiffProgramsPage;

  // Main test suite for each sales rep manager
  test.describe(`Sales Rep Manager: Earnings Match Test - ${salesRepManager.name}`, () => {
    // Setup before each test: impersonate user and navigate to Dashboard
    test.beforeEach(async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Runs only on Chrome');

      // Set a large viewport for consistency
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Instantiate page objects
      usersTable = new SuperAdminUsersTable(page);
      dashboardPage = new SalesRepManagerDashboardPage(page);
      spiffProgramsPage = new SpiffProgramsPage(page);

      // Impersonate the current sales rep manager
      await usersTable.impersonateUser(
        ENTITY_TYPE.SALES_REP_MANAGER,
        salesRepManagerKey,
        {
          salesRepManagerMap,
        }
      );
      console.log(`[${salesRepManager.name}] Impersonation complete.`);

      // Ensure we are on the app page after impersonation
      await expectWithMessage(
        () => expect(page).toHaveURL(/\/app\/dashboard/),
        `Expected to be on the app page after impersonation, but got: ${page.url()}`
      );
      console.log(`[${salesRepManager.name}] On app page after impersonation.`);

      await page.waitForLoadState('networkidle');
    });

    test(`should match SPIFF earnings between Programs overview and Details pages for ${salesRepManager.name}`, async ({
      page,
      browserName,
    }) => {
      if (browserName !== 'chromium') test.skip();

      const errorFlag = [];
      const userData = salesRepManager;
      TestHelpers.logTestStart(
        userData.name,
        'Sales Rep Manager SPIFF Programs vs Details Test'
      );

      // Navigate to SPIFF Programs page
      await spiffProgramsPage.switchToSpiffPrograms(true); // with timeline check
      await page.waitForLoadState('networkidle');
      console.log(
        `[${salesRepManager.name}] Navigated to SPIFF Programs page.`
      );

      // Get all SPIFF programs from overview page
      const spiffPrograms = await spiffProgramsPage.getSpiffPrograms();
      console.log(
        `[${salesRepManager.name}] Found ${spiffPrograms.length} SPIFF programs.`
      );

      const spiffProgramDetailsData = [];

      // Loop through each manufacturer
      for (let i = 0; i < spiffPrograms.length; i++) {
        const spiffProgram = spiffPrograms[i];
        console.log(
          `[${salesRepManager.name}] Testing manufacturer: ${spiffProgram.manufacturerName}`
        );

        // Click on manufacturer card to open SPIFF Program Details
        const programCard = page.locator(
          `${spiffProgramsPage.selectors.spiffProgramCard}:nth-child(${i + 1})`
        );
        await programCard.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Extract SPIFF Program Details data
        try {
          await page.waitForSelector(
            '#my-earnings-card .text-2xl.font-semibold',
            {
              state: 'visible',
              timeout: 10000,
            }
          );

          const detailsData =
            await spiffProgramsPage.getSpiffProgramDetailsData();
          console.log(
            `[${salesRepManager.name}] Details for ${spiffProgram.manufacturerName}:`,
            detailsData
          );

          // Compare earnings between overview and details page
          if (
            Math.abs(spiffProgram.myEarnings - detailsData.myEarnings) > 0.01
          ) {
            const screenshot = await TestHelpers.takeScreenshot(
              page,
              'spiff-overview-details-earnings-mismatch',
              `${userData.name}-${spiffProgram.manufacturerName}`
            );
            errorFlag.push({
              failed: true,
              message: `SPIFF Programs Overview vs Details earnings mismatch for ${userData.name} - ${spiffProgram.manufacturerName}\nOverview: ${spiffProgram.myEarnings}, Details: ${detailsData.myEarnings}\nScreenshot: ${screenshot}\n\n`,
            });
          }

          // Compare program counts
          if (
            spiffProgram.programDescriptions.length !==
            detailsData.programDetails.length
          ) {
            const screenshot = await TestHelpers.takeScreenshot(
              page,
              'spiff-overview-details-program-count-mismatch',
              `${userData.name}-${spiffProgram.manufacturerName}`
            );
            errorFlag.push({
              failed: true,
              message: `Program count mismatch for ${userData.name} - ${spiffProgram.manufacturerName}\nOverview: ${spiffProgram.programDescriptions.length}, Details: ${detailsData.programDetails.length}\nScreenshot: ${screenshot}\n\n`,
            });
          }

          // Store details data
          spiffProgramDetailsData.push({
            manufacturer: spiffProgram.manufacturerName,
            overviewEarnings: spiffProgram.myEarnings,
            detailsEarnings: detailsData.myEarnings,
            overviewProgramCount: spiffProgram.programDescriptions.length,
            detailsProgramCount: detailsData.programDetails.length,
          });

          // Go back to SPIFF Programs page
          await page.goBack();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1000);
        } catch (error) {
          const screenshot = await TestHelpers.takeScreenshot(
            page,
            'spiff-program-details-load-failed',
            `${userData.name}-${spiffProgram.manufacturerName}`
          );
          errorFlag.push({
            failed: true,
            message: `Failed to load SPIFF Program Details for ${userData.name} - ${spiffProgram.manufacturerName}\nError: ${error.message}\nScreenshot: ${screenshot}\n\n`,
          });
        }
      }

      // Log summary
      console.log(
        `[${salesRepManager.name}] Summary:`,
        spiffProgramDetailsData
      );

      TestHelpers.logTestComplete(
        userData.name,
        'Sales Rep Manager SPIFF Programs vs Details Test'
      );
      await TestHelpers.handleErrors(
        errorFlag,
        'Sales Rep Manager SPIFF Programs vs Details Test'
      );
    });
  });
});

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
  test.describe(`Sales Rep: Earnings Match Test - ${salesRep.name}`, () => {
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

    test(`should match Sales Rep earnings from Dashboard SPIFF Program Overview Card and SPIFF Programs page for ${salesRep.name}`, async ({
      page,
      browserName,
    }) => {
      if (browserName !== 'chromium') test.skip();

      // Error flag array to collect all soft errors for this user
      const errorFlag = [];
      const userData = salesRep;
      TestHelpers.logTestStart(userData.name, 'Sales Rep Earnings Match Test');

      // Double-check we are on the app page
      await expect(page).toHaveURL(/app/);
      await page.waitForLoadState('networkidle');

      // Get dashboard metrics
      const dashboardMetrics = await dashboardPage.getDashboardMetrics();
      console.log(`[${salesRep.name}] Dashboard metrics:`, dashboardMetrics);

      // Compare Current Earnings with sum of SPIFF Program Overview My Earnings column
      if (
        Math.abs(
          dashboardMetrics.mySpiffEarnings -
            dashboardMetrics.spiffProgramOverviewEarningsSum
        ) > 2
      ) {
        const screenshot = await TestHelpers.takeScreenshot(
          page,
          'current-earnings-spiff-overview-mismatch',
          `${userData.name}`
        );
        errorFlag.push({
          failed: true,
          message: `Current Earnings vs SPIFF Program Overview mismatch for ${userData.name}\nCurrent Earnings: ${dashboardMetrics.mySpiffEarnings}, SPIFF Overview Sum: ${dashboardMetrics.spiffProgramOverviewEarningsSum}\nScreenshot: ${screenshot}\n\n`,
        });
      }

      console.log(
        `[${salesRep.name}] Current Earnings: ${dashboardMetrics.mySpiffEarnings}`
      );
      console.log(
        `[${salesRep.name}] SPIFF Program Overview Sum: ${dashboardMetrics.spiffProgramOverviewEarningsSum}`
      );
      console.log(
        `[${salesRep.name}] SPIFF Program Overview Data:`,
        dashboardMetrics.spiffProgramOverviewData
      );

      // Navigate to SPIFF Programs page
      await spiffProgramsPage.switchToSpiffPrograms(false);
      await page.waitForLoadState('networkidle');
      console.log(`[${salesRep.name}] Navigated to SPIFF Programs page.`);

      // Get all SPIFF programs
      const spiffPrograms = await spiffProgramsPage.getSpiffPrograms();
      console.log(
        `[${salesRep.name}] Found ${spiffPrograms.length} SPIFF programs.`
      );

      // Calculate total earnings from all SPIFF programs
      const totalSpiffProgramsEarnings =
        await spiffProgramsPage.getTotalMyEarnings();

      // Compare dashboard earnings with SPIFF Programs page total earnings (with small tolerance for rounding)
      if (
        Math.abs(
          dashboardMetrics.mySpiffEarnings - totalSpiffProgramsEarnings
        ) > 1
      ) {
        const screenshot = await TestHelpers.takeScreenshot(
          page,
          'dashboard-spiff-programs-earnings-mismatch',
          `${userData.name}`
        );
        errorFlag.push({
          failed: true,
          message: `Dashboard SPIFF Earnings vs SPIFF Programs mismatch for ${userData.name}\nDashboard: ${dashboardMetrics.mySpiffEarnings}, SPIFF Programs Total: ${totalSpiffProgramsEarnings}\nScreenshot: ${screenshot}\n\n`,
        });
      }

      // Compare program counts
      const spiffProgramsCount = await spiffProgramsPage.getSpiffProgramCount();

      if (
        dashboardMetrics.spiffProgramOverviewData.length !=
        spiffProgramsCount.toString()
      ) {
        const screenshot = await TestHelpers.takeScreenshot(
          page,
          'dashboard-spiff-programs-count-mismatch',
          `${userData.name}`
        );
        errorFlag.push({
          failed: true,
          message: `Dashboard SPIFF Programs Available vs SPIFF Programs count mismatch for ${userData.name}\nDashboard: ${dashboardMetrics.spiffProgramOverviewData.length}, SPIFF Programs Count: ${spiffProgramsCount}\nScreenshot: ${screenshot}\n\n`,
        });
      }

      console.log(
        `[${salesRep.name}] SPIFF Programs Total Earnings: ${totalSpiffProgramsEarnings}`
      );
      console.log(
        `[${salesRep.name}] SPIFF Programs Count: ${spiffProgramsCount}`
      );

      // Compare individual manufacturer earnings between Dashboard SPIFF Overview and SPIFF Programs page
      console.log(
        `[${salesRep.name}] Dashboard SPIFF Overview Data:`,
        dashboardMetrics.spiffProgramOverviewData
      );

      for (const spiffOverviewProgram of dashboardMetrics.spiffProgramOverviewData) {
        console.log(
          `[${salesRep.name}] Comparing manufacturer: "${spiffOverviewProgram.manufacturer}" with earnings: ${spiffOverviewProgram.myEarnings}`
        );

        // Find matching program in SPIFF Programs page
        const matchingSpiffProgram = spiffPrograms.find(
          (program) =>
            program.manufacturerName === spiffOverviewProgram.manufacturer
        );

        if (!matchingSpiffProgram) {
          console.log(
            `[${salesRep.name}] Available SPIFF Programs manufacturers:`,
            spiffPrograms.map((p) => `"${p.manufacturerName}"`)
          );
          const screenshot = await TestHelpers.takeScreenshot(
            page,
            'spiff-overview-manufacturer-not-found-in-spiff-programs',
            `${userData.name}-${spiffOverviewProgram.manufacturer}`
          );
          errorFlag.push({
            failed: true,
            message: `SPIFF Overview Manufacturer not found in SPIFF Programs page for ${
              userData.name
            }\nManufacturer: "${
              spiffOverviewProgram.manufacturer
            }"\nAvailable: ${spiffPrograms
              .map((p) => `"${p.manufacturerName}"`)
              .join(', ')}\nScreenshot: ${screenshot}\n\n`,
          });
          continue;
        }

        console.log(
          `[${salesRep.name}] Found matching program: "${matchingSpiffProgram.manufacturerName}" with earnings: ${matchingSpiffProgram.myEarnings}`
        );

        // Compare earnings for this manufacturer (with small tolerance for rounding)
        if (
          Math.abs(
            spiffOverviewProgram.myEarnings - matchingSpiffProgram.myEarnings
          ) > 0.01
        ) {
          const screenshot = await TestHelpers.takeScreenshot(
            page,
            'manufacturer-earnings-mismatch',
            `${userData.name}-${spiffOverviewProgram.manufacturer}`
          );
          errorFlag.push({
            failed: true,
            message: `Manufacturer earnings mismatch for ${userData.name} - ${spiffOverviewProgram.manufacturer}\nSPIFF Overview: ${spiffOverviewProgram.myEarnings}, SPIFF Programs: ${matchingSpiffProgram.myEarnings}\nScreenshot: ${screenshot}\n\n`,
          });
        }

        console.log(
          `[${salesRep.name}] Successfully compared ${spiffOverviewProgram.manufacturer}: Earnings match (${spiffOverviewProgram.myEarnings})`
        );
      }

      // Check if all SPIFF Programs page manufacturers are represented in SPIFF Overview
      for (const spiffProgram of spiffPrograms) {
        console.log(
          `[${salesRep.name}] Checking if SPIFF Program manufacturer "${spiffProgram.manufacturerName}" exists in Dashboard Overview`
        );

        const matchingSpiffOverviewProgram =
          dashboardMetrics.spiffProgramOverviewData.find(
            (overviewProgram) =>
              overviewProgram.manufacturer === spiffProgram.manufacturerName
          );

        if (!matchingSpiffOverviewProgram) {
          console.log(
            `[${salesRep.name}] Available Dashboard Overview manufacturers:`,
            dashboardMetrics.spiffProgramOverviewData.map(
              (p) => `"${p.manufacturer}"`
            )
          );
          const screenshot = await TestHelpers.takeScreenshot(
            page,
            'spiff-program-manufacturer-not-found-in-overview',
            `${userData.name}-${spiffProgram.manufacturerName}`
          );
          errorFlag.push({
            failed: true,
            message: `SPIFF Program Manufacturer not found in SPIFF Overview for ${
              userData.name
            }\nManufacturer: "${
              spiffProgram.manufacturerName
            }"\nAvailable: ${dashboardMetrics.spiffProgramOverviewData
              .map((p) => `"${p.manufacturer}"`)
              .join(', ')}\nScreenshot: ${screenshot}\n\n`,
          });
        } else {
          console.log(
            `[${salesRep.name}] Found matching overview program for "${spiffProgram.manufacturerName}"`
          );
        }
      }

      // Log comparison summary
      console.log(`[${salesRep.name}] Comparison Summary:`);
      console.log(
        `[${salesRep.name}] - Dashboard Current Earnings: ${dashboardMetrics.mySpiffEarnings}`
      );
      console.log(
        `[${salesRep.name}] - Dashboard SPIFF Overview Sum: ${dashboardMetrics.spiffProgramOverviewEarningsSum}`
      );
      console.log(
        `[${salesRep.name}] - SPIFF Programs Total: ${totalSpiffProgramsEarnings}`
      );
      console.log(
        `[${salesRep.name}] - Dashboard Programs Available: ${dashboardMetrics.storeProgramsAvailable}`
      );
      console.log(
        `[${salesRep.name}] - SPIFF Programs Count: ${spiffProgramsCount}`
      );
      console.log(
        `[${salesRep.name}] - Manufacturers compared: ${dashboardMetrics.spiffProgramOverviewData.length}`
      );

      // Log test completion and handle all collected errors
      TestHelpers.logTestComplete(
        userData.name,
        'Sales Rep Earnings Match Test'
      );
      await TestHelpers.handleErrors(
        errorFlag,
        'Sales Rep Earnings Match Test'
      );
    });

    test(`should match program counts between Dashboard and SPIFF Programs page for ${salesRep.name}`, async ({
      page,
      browserName,
    }) => {
      if (browserName !== 'chromium') test.skip();

      // Error flag array to collect all soft errors for this user
      const errorFlag = [];
      const userData = salesRep;
      TestHelpers.logTestStart(userData.name, 'SPIFF Program Count Match Test');

      // Double-check we are on the app page
      await expect(page).toHaveURL(/app/);
      await page.waitForLoadState('networkidle');

      // Get dashboard metrics
      const dashboardMetrics = await dashboardPage.getDashboardMetrics();
      console.log(`[${salesRep.name}] Dashboard metrics:`, dashboardMetrics);

      // Store manufacturer modal data for later comparison
      const manufacturerModalData = [];

      // Click on each manufacturer row in Dashboard SPIFF Program Overview table
      for (
        let i = 0;
        i < dashboardMetrics.spiffProgramOverviewData.length;
        i++
      ) {
        const manufacturer = dashboardMetrics.spiffProgramOverviewData[i];
        console.log(
          `[${salesRep.name}] Clicking on manufacturer row: ${manufacturer.manufacturer}`
        );

        console.log(
          `[${salesRep.name}] Dashboard SPIFF Program Overview Card:`,
          dashboardPage.selectors.SpiffProgramOverviewCard
        );

        // Click on the manufacturer row to open modal
        const manufacturerRow = page.locator(
          `#spiff-program-overview tbody tr:nth-child(${i + 1})`
        );
        await manufacturerRow.click();
        await page.waitForTimeout(1000); // Wait for modal to open

        console.log(
          `[${salesRep.name}] Dashboard SPIFF Program Overview Modal:`,
          dashboardPage.selectors.SpiffProgramOverviewModal
        );

        // Wait for modal to be visible
        try {
          await page.waitForSelector(`#spiff-program-overview-modal`, {
            state: 'visible',
            timeout: 5000,
          });

          // Extract modal data
          const modalData = await dashboardPage.getManufacturerModalData();
          console.log(
            `[${salesRep.name}] Modal data for ${manufacturer.manufacturer}:`,
            modalData
          );

          // Compare modal earnings with row earnings (with small tolerance for rounding)
          if (Math.abs(modalData.myEarnings - manufacturer.myEarnings) > 0.01) {
            const screenshot = await TestHelpers.takeScreenshot(
              page,
              'modal-row-earnings-mismatch',
              `${userData.name}-${manufacturer.manufacturer}`
            );
            errorFlag.push({
              failed: true,
              message: `Modal vs Row earnings mismatch for ${userData.name} - ${manufacturer.manufacturer}\nRow Earnings: ${manufacturer.myEarnings}, Modal Earnings: ${modalData.myEarnings}\nScreenshot: ${screenshot}\n\n`,
            });
          }

          // Store modal data for later comparison
          manufacturerModalData.push({
            manufacturer: manufacturer.manufacturer,
            rowEarnings: manufacturer.myEarnings,
            modalEarnings: modalData.myEarnings,
            programs: modalData.programs,
          });

          // Close modal
          await dashboardPage.click(
            `#spiff-program-overview-modal img[alt="popupCloseIcon"]`
          );
          await page.waitForTimeout(500); // Wait for modal to close
        } catch (error) {
          console.log(
            `[${salesRep.name}] Failed to open modal for ${manufacturer.manufacturer}: ${error.message}`
          );
          const screenshot = await TestHelpers.takeScreenshot(
            page,
            'modal-open-failed',
            `${userData.name}-${manufacturer.manufacturer}`
          );
          errorFlag.push({
            failed: true,
            message: `Failed to open modal for ${userData.name} - ${manufacturer.manufacturer}\nError: ${error.message}\nScreenshot: ${screenshot}\n\n`,
          });
        }
      }

      console.log(
        `[${salesRep.name}] Collected modal data for ${manufacturerModalData.length} manufacturers`
      );

      // Navigate to SPIFF Programs page
      await spiffProgramsPage.switchToSpiffPrograms(false);
      await page.waitForLoadState('networkidle');
      console.log(`[${salesRep.name}] Navigated to SPIFF Programs page.`);

      // Get SPIFF programs data
      const spiffPrograms = await spiffProgramsPage.getSpiffPrograms();
      console.log(
        `[${salesRep.name}] Found ${spiffPrograms.length} SPIFF programs.`
      );

      // Get SPIFF programs count
      const spiffProgramsCount = await spiffProgramsPage.getSpiffProgramCount();
      console.log(
        `[${salesRep.name}] SPIFF Programs Count: ${spiffProgramsCount}`
      );

      // Compare program counts
      if (
        dashboardMetrics.spiffProgramOverviewData.length !=
        spiffProgramsCount.toString()
      ) {
        const screenshot = await TestHelpers.takeScreenshot(
          page,
          'dashboard-spiff-programs-count-mismatch',
          `${userData.name}`
        );
        errorFlag.push({
          failed: true,
          message: `Dashboard SPIFF Programs Available vs SPIFF Programs count mismatch for ${userData.name}\nDashboard: ${dashboardMetrics.spiffProgramOverviewData.length}, SPIFF Programs Count: ${spiffProgramsCount}\nScreenshot: ${screenshot}\n\n`,
        });
      }

      // Compare program descriptions between Dashboard modal data and SPIFF Programs page
      console.log(`[${salesRep.name}] Comparing program descriptions...`);
      console.log(
        `[${salesRep.name}] SPIFF Programs data:`,
        spiffPrograms.map((p) => ({
          manufacturer: p.manufacturerName,
          descriptions: p.programDescriptions,
        }))
      );

      for (const modalData of manufacturerModalData) {
        const spiffProgram = spiffPrograms.find(
          (program) => program.manufacturerName === modalData.manufacturer
        );

        if (spiffProgram) {
          console.log(
            `[${salesRep.name}] Comparing descriptions for ${modalData.manufacturer}`
          );
          console.log(
            `[${salesRep.name}] Modal programs: ${modalData.programs.length}, SPIFF Programs descriptions: ${spiffProgram.programDescriptions.length}`
          );
          console.log(
            `[${salesRep.name}] Modal descriptions:`,
            modalData.programs.map((p) => p.description)
          );
          console.log(
            `[${salesRep.name}] SPIFF Programs descriptions:`,
            spiffProgram.programDescriptions
          );

          // Compare program description counts
          if (
            modalData.programs.length !==
            spiffProgram.programDescriptions.length
          ) {
            const screenshot = await TestHelpers.takeScreenshot(
              page,
              'program-description-count-mismatch',
              `${userData.name}-${modalData.manufacturer}`
            );
            errorFlag.push({
              failed: true,
              message: `Program description count mismatch for ${userData.name} - ${modalData.manufacturer}\nModal: ${modalData.programs.length}, SPIFF Programs: ${spiffProgram.programDescriptions.length}\nScreenshot: ${screenshot}\n\n`,
            });
          }
        } else {
          console.log(
            `[${salesRep.name}] No matching SPIFF program found for ${modalData.manufacturer}`
          );
        }
      }

      // Click on each manufacturer card on SPIFF Programs page to open SPIFF Program Details
      console.log(`[${salesRep.name}] Testing SPIFF Program Details page...`);
      const spiffProgramDetailsData = [];

      for (let i = 0; i < spiffPrograms.length; i++) {
        const spiffProgram = spiffPrograms[i];
        console.log(
          `[${salesRep.name}] Clicking on SPIFF Program card: ${spiffProgram.manufacturerName}`
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
            `[${salesRep.name}] SPIFF Program Details for ${spiffProgram.manufacturerName}:`,
            detailsData
          );

          // Compare earnings between SPIFF Programs page and SPIFF Program Details page
          if (
            Math.abs(spiffProgram.myEarnings - detailsData.myEarnings) > 0.01
          ) {
            const screenshot = await TestHelpers.takeScreenshot(
              page,
              'spiff-programs-details-earnings-mismatch',
              `${userData.name}-${spiffProgram.manufacturerName}`
            );
            errorFlag.push({
              failed: true,
              message: `SPIFF Programs vs Details earnings mismatch for ${userData.name} - ${spiffProgram.manufacturerName}\nSPIFF Programs: ${spiffProgram.myEarnings}, Details: ${detailsData.myEarnings}\nScreenshot: ${screenshot}\n\n`,
            });
          }

          // Store details data for comparison
          spiffProgramDetailsData.push({
            manufacturer: spiffProgram.manufacturerName,
            spiffProgramsEarnings: spiffProgram.myEarnings,
            detailsEarnings: detailsData.myEarnings,
            programDetails: detailsData.programDetails,
          });

          // Go back to SPIFF Programs page
          await page.goBack();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1000);
        } catch (error) {
          console.log(
            `[${salesRep.name}] Failed to load SPIFF Program Details for ${spiffProgram.manufacturerName}: ${error.message}`
          );
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

      // Log collected data for debugging
      console.log(
        `[${salesRep.name}] Manufacturer Modal Data Summary:`,
        manufacturerModalData.map((data) => ({
          manufacturer: data.manufacturer,
          rowEarnings: data.rowEarnings,
          modalEarnings: data.modalEarnings,
          programCount: data.programs.length,
        }))
      );

      console.log(
        `[${salesRep.name}] SPIFF Program Details Data Summary:`,
        spiffProgramDetailsData.map((data) => ({
          manufacturer: data.manufacturer,
          spiffProgramsEarnings: data.spiffProgramsEarnings,
          detailsEarnings: data.detailsEarnings,
          programDetailsCount: data.programDetails.length,
        }))
      );

      // Log test completion and handle all collected errors
      TestHelpers.logTestComplete(
        userData.name,
        'SPIFF Program Count Match Test'
      );
      await TestHelpers.handleErrors(
        errorFlag,
        'SPIFF Program Count Match Test'
      );
    });
  });
});

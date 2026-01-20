import { expect, test } from '@playwright/test';
import StoreDetailModal from '../../pages/Modals/StoreDetailModal';
import SuperAdminUsersTable from '../../pages/SuperAdminUsersTable';
import {
  ENTITY_TYPE,
  ManufacturerToSkip,
  MAX_STORES_TO_TEST,
} from '../../utils/constant';
import { softExpectWithScreenshot } from '../../utils/helper';
import {
  distributorMap,
  manufacturerMap,
  salesRepManagerMap,
  salesRepMap,
} from '../../utils/userMap';
import { TestConfig } from './types/TestConfig';
import { TestHelpers } from './utils/TestHelpers';

export abstract class StoreProgramDetailTestBase {
  protected abstract getTestConfig(): TestConfig;

  protected async setupProgramTest(page: any, browserName: string) {
    const config = this.getTestConfig();

    test.skip(browserName !== 'chromium', 'Runs only on Chrome');

    // Set larger viewport for all browsers
    await page.setViewportSize({ width: 1920, height: 1080 });

    const usersTable = new SuperAdminUsersTable(page);

    // Check if programPage is available in config
    if (!config.pageClasses.programPage) {
      throw new Error(`ProgramPage not configured for ${config.entityType}`);
    }

    const programPage = new config.pageClasses.programPage(page);
    const detailPage = new config.pageClasses.storeProgramDetailPage(page);
    const storeDetailModal = new StoreDetailModal(page);

    // Impersonate user
    await usersTable.impersonateUser(config.entityType, config.userKey, {
      distributorMap,
      manufacturerMap,
      salesRepMap,
      salesRepManagerMap,
    });

    await page.waitForTimeout(1000);

    await softExpectWithScreenshot(
      page,
      () => expect.soft(page).toHaveURL(/app/),
      `Expected to be on the app page after impersonation, but was not.`
    );

    await page.waitForLoadState('networkidle');

    // Navigate to Programs page
    // const url = await programPage.switchToStorePrograms();
    // await page.waitForLoadState('networkidle', { timeout: 10000 });
    // await page.waitForSelector(programPage.selectors.programCard, {
    //   state: 'visible',
    //   timeout: 3000,
    // });

    // await softExpectWithScreenshot(
    //   page,
    //   () => expect.soft(page).toHaveURL(url),
    //   'Expected to be on the Store Programs page after navigation, but was not.'
    // );

    // await page.waitForLoadState('networkidle');

    // Load the correct JSON for this user
    // const outputData = this.loadUserJson(config.userData.jsonPath);

    return {
      usersTable,
      programPage,
      detailPage,
      // outputData,
      config,
      storeDetailModal,
    };
  }

  public async runProgramDetailTest(page: any) {
    const { programPage, detailPage, config, storeDetailModal } =
      await this.setupProgramTest(page, 'chromium');

    const errorFlag: any[] = [];
    TestHelpers.logTestStart(config.userData.name, 'Store Program Detail Test');

    await programPage.switchToStorePrograms();
    await page.waitForSelector(programPage.selectors.programCard, {
      state: 'visible',
      timeout: 30000,
    });
    await page.waitForLoadState('networkidle');

    const allPrograms = await programPage.getProgramCards();

    for (let i = 0; i < allPrograms.length; i++) {
      const program = await programPage.getProgramByIndex(i);
      TestHelpers.logProgramTest(
        program.manufacturerName,
        config.userData.name
      );

      // Click on first program
      await programPage.clickProgram(i);
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      await page.waitForTimeout(3000);

      // Check if retailer program table is visible
      const isTableVisible = await page
        .locator(detailPage.selectors.storeRetailerProgramTable)
        .isVisible();
      if (!isTableVisible) {
        const screenshot = await TestHelpers.takeScreenshot(
          page,
          'retailer-program-table-not-visible',
          `${config.userData.name}-${program.manufacturerName}`
        );
        errorFlag.push({
          failed: true,
          message: `Expected Retailer Program Breakdown table to be visible for ${config.userData.name} - ${program.manufacturerName}\nScreenshot: ${screenshot}`,
        });
        continue;
      }

      // Validate retailer program breakdown
      const retailerBreakdown =
        await detailPage.getStoreRetailerProgramBreakdown();
      const storesEnrolled = await detailPage.getStoresEnrolled();
      const programsCompliantCardValue =
        await detailPage.getProgramsCompliant();
      const salesVolume = await detailPage.getSalesVolume();
      const estEarnings = await detailPage.getEstimateStoreEarnings();

      const [enrolledStores, totalStores] = storesEnrolled
        .split('/')
        .map((el) => Number(el.replace(/[^0-9]/g, '') || 0));

      const rowEnrolledPrograms = retailerBreakdown.reduce(
        (acc, curr) => acc + curr.storesCompliance.enrolled,
        0
      );
      const rowTotalPrograms = retailerBreakdown.reduce(
        (acc, curr) => acc + curr.storesCompliance.total,
        0
      );

      console.log(
        `Total Stores: ${storesEnrolled}, Enrolled Stores: ${enrolledStores}, Total Stores: ${totalStores}`
      );

      // Compare Estimate Earnings with Program overview
      if (estEarnings !== program.estimatedEarnings) {
        errorFlag.push({
          failed: true,
          message: `Expected Est Earnings: ${program.estimatedEarnings}, Actual Est Earnings: ${estEarnings} not matching for ${config.userData.name} and Manufacturer: ${program.manufacturerName}`,
        });
      }

      // Compare Sales Volume with Program overview
      if (salesVolume !== program.purchaseVolume) {
        errorFlag.push({
          failed: true,
          message: `Expected Sales Volume: ${program.purchaseVolume}, Actual Sales Volume: ${salesVolume} not matching for ${config.userData.name} and Manufacturer: ${program.manufacturerName}`,
        });
      }

      // Let's Verify Program Compliance in top card and in retailer program table row
      if (programsCompliantCardValue.completed !== rowEnrolledPrograms) {
        const screenshot = await TestHelpers.takeScreenshot(
          page,
          `programs-compliant-not-matching`,
          `${config.userData.name}-${program.manufacturerName}`
        );
        errorFlag.push({
          failed: true,
          message: `Expected Programs Compliant: ${rowEnrolledPrograms}, Actual Programs Compliant: ${programsCompliantCardValue.completed} not matching\nfor ${config.userData.name} and Manufacturer: ${program.manufacturerName}\nScreenshot: ${screenshot}\n\n`,
        });
      }
      if (programsCompliantCardValue.total !== rowTotalPrograms) {
        const screenshot = await TestHelpers.takeScreenshot(
          page,
          `programs-compliant-not-matching`,
          `${config.userData.name}-${program.manufacturerName}`
        );
        errorFlag.push({
          failed: true,
          message: `Expected Programs Compliant: ${rowTotalPrograms}, Actual Programs Compliant: ${programsCompliantCardValue.total} not matching\nfor ${config.userData.name} and Manufacturer: ${program.manufacturerName}\nScreenshot: ${screenshot}\n\n`,
        });
      }
      console.log(
        `Programs Compliant: ${programsCompliantCardValue.completed} | Expected Programs Compliant: ${rowEnrolledPrograms} for ${config.userData.name} and Manufacturer: ${program.manufacturerName}`
      );
      console.log(
        `Programs Compliant: ${programsCompliantCardValue.total} | Expected Programs Compliant: ${rowTotalPrograms} for ${config.userData.name} and Manufacturer: ${program.manufacturerName}`
      );

      // Test Store Modals
      await this.testStoreModals(
        page,
        detailPage,
        retailerBreakdown,
        totalStores,
        program,
        config,
        errorFlag,
        storeDetailModal
      );

      await page.locator(detailPage.selectors.backButton).click();
    }

    TestHelpers.logTestComplete(
      config.userData.name,
      'Store Program Detail Test'
    );

    // Handle errors
    await TestHelpers.handleErrors(errorFlag, 'Store Program Detail Test');
  }

  private async testStoreModals(
    page: any,
    detailPage: any,
    retailerBreakdown: any[],
    totalStores: number,
    program: any,
    config: TestConfig,
    errorFlag: any[],
    storeDetailModal: any
  ) {
    for (let i = 0; i < retailerBreakdown.length; i++) {
      const retailer = retailerBreakdown[i];
      if (retailer == null) continue;

      const row = page.locator(
        `${detailPage.selectors.storeRetailerProgramRow}:nth-child(${i + 1})`,
        { timeout: 1000 }
      );

      const totalStoresInRow = retailer.storesCompliance.total;

      // if (totalStoresInRow != totalStores) {
      //   const screenshot = await TestHelpers.takeScreenshot(
      //     page,
      //     `total-stores-not-matching`,
      //     `${config.userData.name}-${program.manufacturerName}-${retailer.type}`
      //   );
      //   errorFlag.push({
      //     failed: true,
      //     message: `Total stores in row should match total stores from dashboard card for ${config.userData.name} - ${program.manufacturerName} - ${retailer.type}\nTotal Stores in Row: ${totalStoresInRow} | Total Stores from Dashboard Card: ${totalStores}\nScreenshot: ${screenshot}`,
      //   });
      // }

      console.log(
        `Total Stores for current row: ${totalStoresInRow}, Total Stores from Dashboard Card: ${totalStores} for ${config.userData.name} - ${program.manufacturerName} - ${retailer.type}`
      );

      // Click on the retailer row to open modal
      await row.click();
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      await page.waitForTimeout(1000);

      // Verify modal content
      const isModalVisible = await page
        .locator(detailPage.selectors.storeRpm)
        .isVisible();
      if (!isModalVisible) {
        const screenshot = await TestHelpers.takeScreenshot(
          page,
          'tier-detail-modal-not-visible',
          `${config.userData.name}-${program.manufacturerName}-${retailer.type}`
        );
        errorFlag.push({
          failed: true,
          message: `Expected Tier Detail Modal to be visible for ${config.userData.name} - ${program.manufacturerName} - ${retailer.type}\nScreenshot: ${screenshot}`,
        });
        continue;
      }

      // Verify modal title
      const modalTitle = await page
        .locator(detailPage.selectors.storeRpmTitle)
        .textContent();
      if (!modalTitle?.includes(retailer.type)) {
        errorFlag.push({
          failed: true,
          message: `Expected modal title to contain retailer type for ${config.userData.name} - ${program.manufacturerName} - ${retailer.type}\nExpected: ${retailer.type}, Actual: ${modalTitle}`,
        });
      }

      // Verify rebate value
      const rebateValue = await page
        .locator(detailPage.selectors.storeRpmRebate)
        .textContent();
      if (rebateValue !== retailer.rebate) {
        errorFlag.push({
          failed: true,
          message: `Expected rebate value to match retailer rebate for ${config.userData.name} - ${program.manufacturerName} - ${retailer.type}\nExpected: ${retailer.rebate}, Actual: ${rebateValue}`,
        });
      }

      // Close modal
      await page.locator(detailPage.selectors.storeRpmClose).click();
      await page.waitForTimeout(500);
    }
  }

  public async runEnrolledStoresTabTest(page: any) {
    const { programPage, detailPage, config, storeDetailModal } =
      await this.setupProgramTest(page, 'chromium');
    const errorFlag: any[] = [];

    console.log('Switching to Store Programs');
    await programPage.switchToStorePrograms();
    await page.waitForSelector(programPage.selectors.programCard, {
      state: 'visible',
      timeout: 30000,
    });
    await page.waitForLoadState('networkidle');
    console.log('Store Programs Page Loaded');
    const allPrograms = await programPage.getProgramCards();

    for (let i = 0; i < allPrograms.length; i++) {
      const program = await programPage.getProgramByIndex(i);
      if (ManufacturerToSkip.includes(program.manufacturerName)) {
        console.log(
          `Skipping Manufacturer: ${program.manufacturerName} for User: ${config.userData.name}`
        );
        continue;
      }
      console.log(
        `================= Page Started for: ${config.userData.name} - ${program.manufacturerName} ==================`
      );
      await programPage.clickProgram(i);
      try {
        await page.waitForLoadState('networkidle', { timeout: 30000 });
        await page.waitForSelector(detailPage.selectors.allTabs, {
          state: 'visible',
          timeout: 30000,
        });
      } catch (error) {
        errorFlag.push({
          failed: true,
          message: `Store Detail Page Response timeout for ${config.userData.name} - ${program.manufacturerName}`,
        });
        continue;
      }

      // Validate Sales Volume and Estimated Store Earnings against Program Listing
      const salesVolume = await detailPage.getSalesVolume();
      const estEarnings = await detailPage.getEstimateStoreEarnings();

      // Compare Sales Volume with Program overview
      if (salesVolume !== program.purchaseVolume) {
        const screenshot = await TestHelpers.takeScreenshot(
          page,
          `sales-volume-not-matching`,
          `${config.userData.name?.replace(
            / /g,
            '-'
          )}-${program.manufacturerName?.replace(/ /g, '-')}`
        );
        errorFlag.push({
          failed: true,
          message: `For ${config.userData.name} and Manufacturer: ${program.manufacturerName}\nExpected Sales Volume: ${program.purchaseVolume}, Actual Sales Volume: ${salesVolume} not matching\nScreenshot: ${screenshot}\n\n`,
        });
      }

      // Compare Estimated Store Earnings with Program overview
      if (estEarnings !== program.estimatedEarnings) {
        const screenshot = await TestHelpers.takeScreenshot(
          page,
          `estimated-earnings-not-matching`,
          `${config.userData.name?.replace(
            / /g,
            '-'
          )}-${program.manufacturerName?.replace(/ /g, '-')}`
        );
        errorFlag.push({
          failed: true,
          message: `For ${config.userData.name} and Manufacturer: ${program.manufacturerName}\nExpected Estimated Store Earnings: ${program.estimatedEarnings}, Actual Estimated Store Earnings: ${estEarnings} not matching\nScreenshot: ${screenshot}\n\n`,
        });
      }

      console.log(
        `For ${config.userData.name} and Manufacturer: ${program.manufacturerName}\nSales Volume Validation - Expected: ${program.purchaseVolume}, Actual: ${salesVolume}`
      );
      console.log(
        `For ${config.userData.name} and Manufacturer: ${program.manufacturerName}\nEstimated Store Earnings Validation - Expected: ${program.estimatedEarnings}, Actual: ${estEarnings}`
      );

      // Move to Enrolled and Not Enrolled Stores Tab
      const tabs = await page.locator(detailPage.selectors.allTabs).all();
      for (const tab of tabs) {
        let isTabEnabled = false;
        let forEnrolled = false;
        const tabText = await tab.textContent();
        if (tabText.includes('Overview')) continue;
        if (tabText == 'Stores') {
          await tab.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(300);
          isTabEnabled = true;
          forEnrolled = true;
          console.log(
            `---------------- Switched to Stores tab for ${config.userData.name} - ${program.manufacturerName} ----------------`
          );
        }
        if (tabText.includes('Stores Not Enrolled')) {
          await tab.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(300);
          isTabEnabled = true;
          console.log(
            `---------------- Switched to Stores Not Enrolled tab for ${config.userData.name} - ${program.manufacturerName} ----------------`
          );
        }
        if (!isTabEnabled) {
          errorFlag.push({
            failed: true,
            message: `Stores or Stores Not Enrolled tab not found for ${config.userData.name} - ${program.manufacturerName}`,
          });
          continue;
        }
        const StoreTable = forEnrolled
          ? detailPage.selectors.storeTable
          : detailPage.selectors.unenrolledStoreTable;

        console.log(
          `Checking if Store Table is visible...${tabText}, ${StoreTable}`
        );
        // Check that the store table is visible
        const isTableVisible = await page.locator(StoreTable).isVisible();
        if (!isTableVisible) {
          errorFlag.push({
            failed: true,
            message: `Expected Store Table to be visible for ${config.userData.name} - ${program.manufacturerName}`,
          });
          continue;
        }
        await page.waitForTimeout(500);
        // Click on the "Store Earnings" heading to sort the table
        const heading = page.locator(`${StoreTable} th`, {
          hasText: 'Store Earnings',
          timeout: 200,
        });
        await heading.click();
        try {
          await page.waitForLoadState('networkidle', { timeout: 5000 });
        } catch (error) {
          errorFlag.push({
            failed: true,
            message: `Store Details Modal Response timeout for ${config.userData.name} - ${program.manufacturerName}`,
          });
        }
        await page.waitForTimeout(2000);
        // Get all Sorted Stores as an Array
        const rows = await detailPage.getAllStoresData(forEnrolled);
        const maxStores =
          rows.length > MAX_STORES_TO_TEST ? MAX_STORES_TO_TEST : rows.length;
        console.log(
          `For ${config.userData.name} - ${program.manufacturerName} | Max Stores to Test: ${maxStores} | Total Stores: ${rows.length}`
        );
        for (let i = 0; i < maxStores; i++) {
          const row = rows[i];
          if (
            !row ||
            row.store?.includes(
              'There are no stores currently signed up for this program'
            )
          )
            continue;
          console.log(
            `---------------- Working on ${config.userData.name} - ${program.manufacturerName} Store: ${row.store} ----------------`
          );
          console.log(`Row Data: ${JSON.stringify(row)}`);
          const currentRow = page.locator(
            `${
              forEnrolled
                ? detailPage.selectors.storeRow
                : detailPage.selectors.unenrolledStoreTableRow
            }:nth-child(${i + 1})`
          );

          console.log(
            'Clicking on the store row to open the store details modal...'
          );
          await currentRow.click();

          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(250);

          // Open all closed accordions before starting the test
          console.log(
            'Opening all closed accordions before starting the test...'
          );
          await TestHelpers.openAllClosedAccordions(page);
          console.log(
            'All closed accordions opened before starting the test...'
          );

          // Verify the Store Details Modal
          await TestHelpers.verifyStoreOrProgramTiers({
            page,
            row,
            program,
            config,
            storeDetailsPage: detailPage,
            storeDetailModal,
            errorFlag,
            tierModalSelector: detailPage.selectors.TD_Modal,
            tierModalCloseSelector: detailPage.selectors.TD_ModalBackButton,
            tiersSelector: detailPage.selectors.SD_Tiers,
            completedSkusCheck: async () =>
              await storeDetailModal.matchCompletedSkusTiersInStoreDetailsModal(
                {
                  loggedInUser: config.userData.name,
                  manufacturer: program.manufacturerName,
                  store: row.store,
                }
              ),
            tierChecks: null, // Add tier-level checks if needed
          });
          // Close the Store Details Modal
          await page.locator(detailPage.selectors.SD_ModalClose).click();
        }
      }
      await page.locator(detailPage.selectors.backButton).click();
      console.log(
        `================= Page Completed for: ${config.userData.name} - ${program.manufacturerName} ==================`
      );
    }
    await TestHelpers.handleErrors(
      errorFlag,
      'Store Programs: Tier Level test for stores in Enrolled and Not Enrolled tabs'
    );
  }

  public async compareStoreEarnings(page: any, entityType: string) {
    const { programPage, detailPage, config, storeDetailModal } =
      await this.setupProgramTest(page, 'chromium');
    const errorFlag: any[] = [];

    TestHelpers.logTestStart(
      config.userData.name,
      'Compare Store Earnings Test'
    );

    // Import DashboardPage for distributor admin
    const DashboardPage =
      entityType === ENTITY_TYPE.SALES_REP_MANAGER
        ? require('../../pages/sales-rep-manager/DashboardPage')
        : require('../../pages/distributor-admin/DashboardPage');
    const dashboardPage = new DashboardPage(page);

    // Step 1: Get dashboard store earnings
    console.log('Getting dashboard store earnings...');
    const dashboardEarnings = await dashboardPage.getEstimatedEarnings();
    console.log(`Dashboard Store Earnings: $${dashboardEarnings}`);

    // Step 2: Navigate to Store Programs page (Current timeline)
    console.log('Navigating to Store Programs page...');
    await programPage.switchToStorePrograms();
    await page.waitForSelector(programPage.selectors.programCard, {
      state: 'visible',
      timeout: 30000,
    });
    await page.waitForLoadState('networkidle');

    // Step 3: Sum all Current program earnings
    console.log('Summing Current program earnings...');
    const currentPrograms = await programPage.getAllProgramsWithEarnings();
    const currentEarningsTotal = currentPrograms.reduce(
      (sum, program) => sum + program.estimatedEarnings,
      0
    );

    currentPrograms.forEach((program, index) => {
      console.log(
        `Current Manufacturer: ${program.manufacturerName} - $${program.estimatedEarnings}`
      );
    });

    console.log(`Total Current Program Earnings: $${currentEarningsTotal}`);

    // Step 4: Switch to Historical timeline
    await page.waitForTimeout(500); // Wait for page to completely load
    console.log('Switching to Historical timeline...');
    await programPage.changeProgramTimeline('Historical');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for page to completely load

    // Step 5: Sum all Historical program earnings
    console.log('Summing Historical program earnings...');
    const historicalPrograms = await programPage.getAllProgramsWithEarnings();
    const historicalEarningsTotal = historicalPrograms.reduce(
      (sum, program) => sum + program.estimatedEarnings,
      0
    );

    historicalPrograms.forEach((program, index) => {
      console.log(
        `Historical Program ${index + 1}: ${program.manufacturerName} - $${
          program.estimatedEarnings
        }`
      );
    });

    console.log(
      `Total Historical Program Earnings: $${historicalEarningsTotal}`
    );

    // Step 6: Calculate total (Current + Historical)
    const totalProgramEarnings = currentEarningsTotal + historicalEarningsTotal;
    console.log(
      `Total Program Earnings (Current + Historical): $${totalProgramEarnings}`
    );

    // Step 7: Compare with dashboard earnings
    console.log(`Dashboard Earnings: $${dashboardEarnings}`);
    console.log(`Total Program Earnings: $${totalProgramEarnings}`);

    if (Math.abs(dashboardEarnings - totalProgramEarnings) > 3) {
      errorFlag.push({
        failed: true,
        message: `Store earnings mismatch for ${
          config.userData.name
        }:\nDashboard Store Earnings: $${dashboardEarnings} || Total Program Earnings (Current + Historical): $${totalProgramEarnings}\nDifference: $${Math.abs(
          dashboardEarnings - totalProgramEarnings
        )}\n`,
      });
    } else {
      console.log(`✅ Store earnings match for ${config.userData.name}`);
    }

    TestHelpers.logTestComplete(
      config.userData.name,
      'Compare Store Earnings Test'
    );

    // Handle errors
    await TestHelpers.handleErrors(errorFlag, 'Compare Store Earnings Test');
  }
}

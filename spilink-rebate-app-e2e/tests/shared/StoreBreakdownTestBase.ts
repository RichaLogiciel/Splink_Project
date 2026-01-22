import { expect, test } from '@playwright/test';
import StoreDetailModal from '../../pages/Modals/StoreDetailModal';
import SuperAdminUsersTable from '../../pages/SuperAdminUsersTable';
import { ManufacturerToSkip, MAX_STORES_TO_TEST } from '../../utils/constant';
import { expectWithMessage, saveScreenshot } from '../../utils/helper';
import {
  distributorMap,
  manufacturerMap,
  salesRepManagerMap,
  salesRepMap,
} from '../../utils/userMap';
import { TestConfig } from './types/TestConfig';
import { ErrorFlag, TestHelpers } from './utils/TestHelpers';

export abstract class StoreBreakdownTestBase {
  protected abstract getTestConfig(): TestConfig;

  protected async setupTest(page: any, browserName: string) {
    const config = this.getTestConfig();

    test.skip(browserName !== 'chromium', 'Runs only on Chrome');

    // Set larger viewport for all browsers
    await page.setViewportSize({ width: 1920, height: 1080 });

    const usersTable = new SuperAdminUsersTable(page);
    const storePage = new config.pageClasses.storePage(page);
    const storeDetailsPage = new config.pageClasses.storeDetailsPage(page);
    const storeDetailModal = new StoreDetailModal(page);

    // Impersonate user
    await usersTable.impersonateUser(config.entityType, config.userKey, {
      manufacturerMap,
      distributorMap,
      salesRepMap,
      salesRepManagerMap,
    });
    await page.waitForTimeout(100);

    // Check if the page is on the app page
    await expectWithMessage(
      () => expect(page).toHaveURL(/app/),
      `Expected to be on the app page after impersonation, but got: ${page.url()}`
    );

    await page.waitForLoadState('networkidle');

    // Navigate to Store page
    await storePage.switchToStorePage();

    await page.waitForSelector(storePage.selectors.storeTable, {
      state: 'visible',
      timeout: 60000,
    });

    // Change Program Timeline to Historical
    await storePage.changeProgramTimeline();

    await page.waitForLoadState('networkidle');
    if (!config.navigationConfig.storePageUrl?.includes('Current')) {
      await page.waitForURL(config.navigationConfig.storePageUrl);
    }

    const currentUrl = page.url();
    if (
      !currentUrl.includes(config.navigationConfig.storePageUrl) &&
      !config.navigationConfig.storePageUrl?.includes('Current')
    ) {
      const screenshot = await TestHelpers.takeScreenshot(
        page,
        'store-table-not-visible',
        config.userData.name
      );
      expect.soft(page).toHaveURL(config.navigationConfig.storePageUrl);
      throw new Error(
        `Expected to be on the store page (${config.navigationConfig.storePageUrl}) after navigation, but got: ${currentUrl}\nscreenshot: ${screenshot}\n\n`
      );
    }

    await page.waitForLoadState('networkidle');

    return {
      usersTable,
      storePage,
      storeDetailsPage,
      storeDetailModal,
      config,
    };
  }

  public async runStoreBreakdownTest(page: any) {
    const { storePage, storeDetailsPage, storeDetailModal, config } =
      await this.setupTest(page, 'chromium');

    const errorFlag: ErrorFlag[] = [];
    TestHelpers.logTestStart(config.userData.name, 'Store Breakdown Test');

    // Change Program Timeline to Historical
    await storePage.changeProgramTimeline();

    // Check if store table is visible
    const isStoreTableVisible = await page
      .locator(storePage.selectors.storeTable)
      .isVisible();
    if (!isStoreTableVisible) {
      const screenshot = await TestHelpers.takeScreenshot(
        page,
        'store-table-not-visible',
        config.userData.name
      );
      errorFlag.push({
        failed: true,
        message: `Expected Store Table to be visible for ${config.userData.name}\nScreenshot: ${screenshot}\n\n`,
      });
      await TestHelpers.handleErrors(errorFlag, 'Store Breakdown Test');
      return;
    }

    // Click on the "Store Earnings" heading to sort the table
    const heading = page.locator(`${storePage.selectors.storeTable} th`, {
      hasText: 'Store Earnings',
    });
    await heading.click();
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle');

    // Wait for the page to load
    await TestHelpers.waitForPageLoad(
      page,
      'Store Details Modal Response timeout - continuing with test'
    );
    await page.waitForTimeout(3000);

    // Get All Stores from the Store Table
    const rows = await storePage.getAllStoresData();
    const maxStores =
      rows?.length > MAX_STORES_TO_TEST ? MAX_STORES_TO_TEST : rows?.length;
    console.log(
      `For ${config.userData.name} | Max Stores to Test: ${maxStores} | Total Stores: ${rows.length}`
    );

    // Store Loop
    for (let i = 0; i <= maxStores; i++) {
      const row = rows[i];
      if (!row?.store) continue;

      TestHelpers.logStoreTest(row.store, config.userData.name);
      console.log(
        `================= Store Started: ${row.store} for ${config.userData.name} ==================`
      );

      // Go to the Store Details Page
      const currentStoreRow = page.locator(
        `${storePage.selectors.storeTableRow}:nth-child(${i + 1})`
      );

      // Check if the store row is visible
      if (!(await currentStoreRow.isVisible())) {
        const screenshot = await TestHelpers.takeScreenshot(
          page,
          'store-not-found',
          config.userData.name
        );
        errorFlag.push({
          failed: true,
          message: `Store: ${row.store} not found in the Store Table for: ${config.userData.name}.\nScreenshot saved: ${screenshot}\n\n`,
        });
        console.log(
          `Store: ${row.store} not found in the Store Table for: ${config.userData.name}`
        );
        continue;
      }

      // Click on the current Store Row
      await currentStoreRow.click();
      console.log(`Clicked on Store Row: ${row.store}`);

      // Wait for the page to load
      await TestHelpers.waitForPageLoad(
        page,
        'Store Details Modal Response timeout - continuing with test'
      );
      await page.waitForTimeout(3000);

      // Get Dashboard Metrics
      const dashboardMetrics = await storeDetailsPage.getDashboardMetrics();
      console.log(`Dashboard Metrics for ${row.store}:`, dashboardMetrics);

      // Compare Dashboard Metrics with Store listing list
      const purchaseDiff = Math.abs(
        dashboardMetrics.purchaseVolume - row.purchaseVolume
      );
      if (
        dashboardMetrics.purchaseVolume !== row.purchaseVolume &&
        purchaseDiff < 2
      ) {
        const screenshot = await saveScreenshot(
          page,
          `purchase-volume-not-matching-${config.userData.name}-${row.store}`
        );
        errorFlag.push({
          failed: true,
          message: `Purchase Volume: ${dashboardMetrics.purchaseVolume} is not equal to the expected purchase volume: ${row.purchaseVolume} for store: ${row.store}\nScreenshot saved: ${screenshot}\n\n`,
        });
        console.log(
          `Purchase Volume mismatch for ${row.store}: Actual: ${dashboardMetrics.purchaseVolume}, Expected: ${row.purchaseVolume}`
        );
      }

      const estimatedEarningsDiff = Math.abs(
        dashboardMetrics.estimatedEarnings - row.estimatedEarnings
      );
      if (
        dashboardMetrics.estimatedEarnings !== row.estimatedEarnings &&
        estimatedEarningsDiff < 2
      ) {
        const screenshot = await saveScreenshot(
          page,
          `estimated-earnings-not-matching-${config.userData.name}-${row.store}`
        );
        errorFlag.push({
          failed: true,
          message: `Store Earnings: ${dashboardMetrics.estimatedEarnings} is not equal to the expected Store earnings: ${row.estimatedEarnings} for store: ${row.store}\nScreenshot saved: ${screenshot}\n\n`,
        });
        console.log(
          `Store Earnings mismatch for ${row.store}: Actual: ${dashboardMetrics.estimatedEarnings}, Expected: ${row.estimatedEarnings}`
        );
      }

      // Check if the enrolledprogram rows are visible
      const programTableLocators = page.locator(
        `${storeDetailsPage.selectors.programTable}`
      );
      const isProgramTableVisible =
        (await programTableLocators.count()) > 0 &&
        (await programTableLocators.first().isVisible());
      if (!isProgramTableVisible) {
        const screenshot = await TestHelpers.takeScreenshot(
          page,
          `program-table-not-visible`,
          config.userData.name
        );
        errorFlag.push({
          failed: true,
          message: `Program Rows are not visible for store: ${row.store}\nScreenshot saved: ${screenshot}\n\n`,
        });
        console.log(`Program Rows are not visible for store: ${row.store}`);
      }

      // Get all program rows
      const programRows = await storeDetailsPage.getAllProgramRows(true);

      // Check if the not enrolled tab is visible
      const notEnrolledTab = page.locator(
        storeDetailsPage.selectors.programNotEnrolledTab
      );
      const isNotEnrolledTabVisible = await notEnrolledTab.isVisible();
      if (!isNotEnrolledTabVisible) {
        const screenshot = await TestHelpers.takeScreenshot(
          page,
          `not-enrolled-tab-not-visible`,
          config.userData.name
        );
        errorFlag.push({
          failed: true,
          message: `Not Enrolled Tab is not visible for ${config.userData.name} in Store Details: ${row.store}\n\nScreenshot saved: ${screenshot}\n`,
        });
        console.log(
          `Not Enrolled Tab is not visible for ${config.userData.name} in Store Details: ${row.store}`
        );
        continue;
      }

      console.log('Not Enrolled Tab is visible: ', isNotEnrolledTabVisible);

      // Click on the not enrolled tab
      await notEnrolledTab.click();
      await TestHelpers.waitForPageLoad(
        page,
        'Not Response timeout - continuing with test'
      );
      await page.waitForTimeout(3000);

      // Get all not enrolled program rows
      const notEnrolledProgramRows = await storeDetailsPage.getAllProgramRows(
        false
      );

      // Compare total purchase volume and Store earnings with dashboard metrics
      const enrolledPurchaseVolume = programRows.reduce(
        (acc, curr) => acc + curr.purchaseVolume,
        0
      );
      const notEnrolledPurchaseVolume = notEnrolledProgramRows.reduce(
        (acc, curr) => acc + curr.purchaseVolume,
        0
      );
      const totalPurchaseVolume =
        enrolledPurchaseVolume + notEnrolledPurchaseVolume;
      if (Math.abs(totalPurchaseVolume - dashboardMetrics.purchaseVolume) > 3) {
        const screenshot = await saveScreenshot(
          page,
          `total-purchase-volume-not-matching-${config.userData.name}-${row.store}`
        );
        errorFlag.push({
          failed: true,
          message: `For ${config.userData.name} | Store Name: ${
            row.store
          }\nScreenshot saved: ${screenshot}\nTotal Purchase Volume: ${
            dashboardMetrics.purchaseVolume
          } | Sum of Enrolled and Not Enrolled: ${totalPurchaseVolume} | Difference: ${
            totalPurchaseVolume - dashboardMetrics.purchaseVolume
          }\n`,
        });
      } else {
        console.log(
          `Total Purchase Volume: ${totalPurchaseVolume} | Sum of Enrolled and Not Enrolled: ${
            dashboardMetrics.purchaseVolume
          } | Difference: ${
            totalPurchaseVolume - dashboardMetrics.purchaseVolume
          }
        For ${config.userData.name} | Store Name: ${row.store}\n`
        );
      }

      // Verify total Store earnings
      const totalEstimatedEarnings = programRows.reduce(
        (acc, curr) => acc + curr.estimatedEarnings,
        0
      );
      console.log(
        `Total Store Earnings for ${row.store}: ${totalEstimatedEarnings}, Dashboard: ${dashboardMetrics.estimatedEarnings}`
      );

      // Throw Error if difference is greater than 1
      if (
        Math.abs(totalEstimatedEarnings - dashboardMetrics.estimatedEarnings) >
        1
      ) {
        const screenshot = await TestHelpers.takeScreenshot(
          page,
          `total-estimated-earnings-not-matching`,
          `${config.userData.name}-${row.store}`
        );
        errorFlag.push({
          failed: true,
          message: `For ${config.userData.name} | Store Name: ${
            row.store
          }\nScreenshot saved: ${screenshot}\nTotal Store Earnings: ${
            dashboardMetrics.estimatedEarnings
          } | Sum of Enrolled Programs: ${totalEstimatedEarnings} | Difference: ${
            totalEstimatedEarnings - dashboardMetrics.estimatedEarnings
          }\n`,
        });
        console.log(`Total Store Earnings mismatch for ${row.store}`);
      } else {
        console.log(
          `Total Store Earnings: ${totalEstimatedEarnings} | Sum of Enrolled Programs: ${
            dashboardMetrics.estimatedEarnings
          } | Difference: ${
            totalEstimatedEarnings - dashboardMetrics.estimatedEarnings
          }\nFor ${config.userData.name} | Store Name: ${row.store}\n`
        );
      }

      // Compare total program compliance with dashboard metrics
      const enrolledProgramCompliance = programRows.reduce(
        (acc, curr) => acc + curr.programCompliance.total,
        0
      );
      const totalEnrolledPrograms = programRows.reduce(
        (acc, curr) => acc + curr.programCompliance.completed,
        0
      );
      const notEnrolledProgramCompliance = notEnrolledProgramRows.reduce(
        (acc, curr) => acc + curr.programCompliance.total,
        0
      );
      const totalNotEnrolledPrograms = notEnrolledProgramRows.reduce(
        (acc, curr) => acc + curr.programCompliance.completed,
        0
      );

      const enrolledPrograms = totalEnrolledPrograms + totalNotEnrolledPrograms;
      const totalProgramCompliance =
        enrolledProgramCompliance + notEnrolledProgramCompliance;

      // TODO: Uncomment this when we have a way to get the total number of programs in the store
      // if (enrolledPrograms !== row.programCompliance.completed) {
      //   const screenshot = await saveScreenshot(
      //     page,
      //     `enrolled-programs-not-matching-${config.userData.name}-${row.store}`
      //   );
      //   errorFlag.push({
      //     failed: true,
      //     message: `Enrolled Programs: ${enrolledPrograms} is not equal to the expected enrolled programs: ${row.programCompliance.completed} for in Store Details: ${row.store}\nScreenshot saved: ${screenshot}\n\n`,
      //   });
      //   console.log(
      //     `Enrolled Programs mismatch for ${row.store}: Actual: ${enrolledPrograms}, Expected: ${row.programCompliance.completed}`
      //   );
      // } else {
      //   console.log(
      //     `Enrolled Programs: ${enrolledPrograms} | Expected Enrolled Programs: ${row.programCompliance.completed}\nFor ${config.userData.name} | Store Name: ${row.store}\n`
      //   );
      // }

      // TODO: Uncomment this when we have a way to get the total number of programs in the store
      // if (totalProgramCompliance !== row.programCompliance.total) {
      //   const screenshot = await saveScreenshot(
      //     page,
      //     `total-program-compliance-not-matching-${config.userData.name}-${row.store}`
      //   );
      //   errorFlag.push({
      //     failed: true,
      //     message: `Total Program Compliance: ${totalProgramCompliance} is not equal to the expected total program compliance: ${row.programCompliance.total} for in Store Details: ${row.store}\nScreenshot saved: ${screenshot}\n\n`,
      //   });
      //   console.log(
      //     `Total Program Compliance mismatch for ${row.store}: Actual: ${totalProgramCompliance}, Expected: ${row.programCompliance.total}`
      //   );
      // } else {
      //   console.log(
      //     `Total Program Compliance: ${totalProgramCompliance} | Expected Total Program Compliance: ${row.programCompliance.total}\nFor ${config.userData.name} | Store Name: ${row.store}\n`
      //   );
      // }

      // Test Store Detail Modal
      await this.testStoreDetailModal(
        page,
        storeDetailsPage,
        storeDetailModal,
        row,
        config,
        errorFlag
      );

      // Go Back to the Store Page
      await storeDetailsPage.goBackToStorePage();
      console.log(
        `================= Store Completed: ${row.store} for ${config.userData.name} ==================`
      );
    }

    TestHelpers.logTestComplete(config.userData.name, 'Store Breakdown Test');

    // Handle errors
    await TestHelpers.handleErrors(errorFlag, 'Store Breakdown Test');
  }

  public async runManufacturerStoreBreakdownTest(page: any) {
    const { storePage, storeDetailModal, config } = await this.setupTest(
      page,
      'chromium'
    );

    const errorFlag: ErrorFlag[] = [];
    TestHelpers.logTestStart(config.userData.name, 'Store Breakdown Test');

    // Check if store table is visible
    const isStoreTableVisible = await page
      .locator(storePage.selectors.storeTable)
      .isVisible();
    if (!isStoreTableVisible) {
      const screenshot = await TestHelpers.takeScreenshot(
        page,
        'store-table-not-visible',
        config.userData.name
      );
      errorFlag.push({
        failed: true,
        message: `Expected Store Table to be visible for ${config.userData.name}\nScreenshot: ${screenshot}\n\n`,
      });
      await TestHelpers.handleErrors(errorFlag, 'Store Breakdown Test');
      return;
    }

    // Change Program Timeline to Historical
    await storePage.changeProgramTimeline();

    // Click on the "	Purchase Volume" heading to sort the table
    const heading = page.locator(`${storePage.selectors.storeTable} th`, {
      hasText: '	Purchase Volume',
    });
    await heading.click();

    // Wait for the page to load
    await TestHelpers.waitForPageLoad(
      page,
      'Store Details Modal Response timeout - continuing with test'
    );
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle');

    // Get All Stores from the Store Table
    const rows = await storePage.getAllStoresData();
    const maxStorestoTest = Number(MAX_STORES_TO_TEST || 0) * 2;
    const maxStores =
      rows?.length > maxStorestoTest ? maxStorestoTest : rows?.length;
    console.log(
      `For ${config.userData.name} | Max Stores to Test: ${maxStores} | Total Stores: ${rows.length}`
    );

    // Store Loop
    for (let i = 0; i <= maxStores; i++) {
      const row = rows[i];
      if (!row?.store) continue;

      TestHelpers.logStoreTest(row.store, config.userData.name);
      console.log(
        `================= Store Started: ${row.store} for ${config.userData.name} ==================`
      );

      // Go to the Store Details Page
      const currentStoreRow = page.locator(
        `${storePage.selectors.storeTableRow}:nth-child(${i + 1})`
      );

      // Check if the store row is visible
      if (!(await currentStoreRow.isVisible())) {
        const screenshot = await TestHelpers.takeScreenshot(
          page,
          'store-not-found',
          config.userData.name
        );
        errorFlag.push({
          failed: true,
          message: `Store: ${row.store} not found in the Store Table for: ${config.userData.name}.\nScreenshot saved: ${screenshot}\n\n`,
        });
        console.log(
          `Store: ${row.store} not found in the Store Table for: ${config.userData.name}`
        );
        continue;
      }

      // Click on the current Store Row
      await currentStoreRow.click();
      console.log(`Clicked on Store Row: ${row.store}`);

      await page.waitForLoadState('networkidle');

      // Wait for the page to load
      await TestHelpers.waitForPageLoad(
        page,
        'Store Details Modal Response timeout - continuing with test'
      );
      await page.waitForTimeout(3000);

      // Verify Total Number Of Programs in Row and Total Number of Programs in Store Details Modal
      // TODO: Uncomment this when we have a way to get the total number of programs in the store
      // const totalProgramsInRow = row.programCompliance.total;
      // const totalProgramsInRow = 0;
      // const totalProgramsInModal = await page
      //   .locator(storeDetailModal.selectors.storeTiers + ' > div')
      //   .count();

      // if (totalProgramsInRow !== totalProgramsInModal) {
      //   const screenshot = await TestHelpers.takeScreenshot(
      //     page,
      //     `total-programs-not-matching`,
      //     `${config.userData.name}-${row.store}`
      //   );
      //   errorFlag.push({
      //     failed: true,
      //     message: `Total Programs in Row: ${totalProgramsInRow} is not equal to the Total Programs in Store Details Modal: ${totalProgramsInModal} for ${config.userData.name} - ${row.store} - ${row.manufacturer}\nScreenshot: ${screenshot}\n\n`,
      //   });
      //   console.error(
      //     `Total Programs mismatch for ${row.store}: Row: ${totalProgramsInRow}, Modal: ${totalProgramsInModal}`
      //   );
      // }

      const { status: isCompletedSkus, message }: any =
        await storeDetailModal.matchCompletedSkusTiersInStoreDetailsModal({
          loggedInUser: config.userData.name,
          manufacturer: row.manufacturer,
          store: row.store,
        });

      // Verify Completed Skus
      if (
        isCompletedSkus === false ||
        isCompletedSkus != row?.programCompliance?.completed
      ) {
        const screenshot = await TestHelpers.takeScreenshot(
          page,
          `issue-in-sku-matching`,
          `${config.userData.name}-${row.store}-${row.manufacturer}`
        );
        errorFlag.push({
          failed: true,
          message: `Message from completedSkusCheck: ${message}\nScreenshot: ${screenshot}\n\n`,
        });
      }

      // Verify All Tiers
      await storeDetailModal.verifyAllTiers(
        {
          earningsOpportunity: row.earningsOpportunity,
          programCompliance: row.programCompliance,
          purchaseVolume: row.purchaseVolume,
          estimatedEarnings: row.estimatedEarnings,
          manufacturer: row.manufacturer,
        },
        page,
        row.store
      );

      // Go Back to the Store Page
      // await storeDetailsPage.goBackToStorePage();
      await page.locator(storeDetailModal.selectors.modalClose).click();
      console.log(
        `================= Store Completed: ${row.store} for ${config.userData.name} ==================`
      );
    }

    TestHelpers.logTestComplete(config.userData.name, 'Store Breakdown Test');

    // Handle errors
    await TestHelpers.handleErrors(errorFlag, 'Store Breakdown Test');
  }

  private async testStoreDetailModal(
    page: any,
    storeDetailsPage: any,
    storeDetailModal: any,
    row: any,
    config: TestConfig,
    errorFlag: ErrorFlag[]
  ) {
    const allTabs = await page
      .locator(storeDetailsPage.selectors.allTabs)
      .all();

    for (let i = 0; i < allTabs.length; i++) {
      const enrolled = i === 0;

      await allTabs[i].click();
      await page.waitForLoadState('networkidle', {
        timeout: 5000,
      });
      await TestHelpers.waitForPageLoad(
        page,
        'Unable to load the tab - continuing with test'
      );
      await page.waitForTimeout(250);

      const programs = await storeDetailsPage.getAllProgramRows(enrolled);
      const maxPrograms = programs?.length;

      for (let j = 0; j < maxPrograms; j++) {
        const program = programs[j];
        if (!program) continue;

        // Ability to skip certain manufacturers
        if (ManufacturerToSkip.includes(program.manufacturer)) {
          console.log(
            `Skipping Manufacturer: ${program.manufacturer} for Store: ${row.store}`
          );
          continue;
        }

        const programTableRow = enrolled
          ? storeDetailsPage.selectors.programTableRow
          : storeDetailsPage.selectors.unenrolledProgramTableRow;

        const programRow = page.locator(
          `${programTableRow}:nth-child(${j + 1})`
        );
        if (!(await programRow.isVisible())) {
          const screenshot = await TestHelpers.takeScreenshot(
            page,
            `program-row-not-visible`,
            `${config.userData.name}-${row.store}-${program.manufacturer}`
          );
          errorFlag.push({
            failed: true,
            message: `Program Row is not visible for store: ${row.store} - Program: ${program.manufacturer}\nScreenshot: ${screenshot}\n\n`,
          });
          continue;
        }

        await programRow.click();
        await TestHelpers.verifyStoreOrProgramTiers({
          page,
          row,
          program,
          config,
          storeDetailsPage,
          storeDetailModal,
          errorFlag,
          tierModalSelector: storeDetailModal.selectors.TD_Modal,
          tierModalCloseSelector: storeDetailModal.selectors.TD_ModalBackButton,
          tiersSelector: storeDetailsPage.selectors.SD_Tiers,
          completedSkusCheck: async () =>
            await storeDetailModal.matchCompletedSkusTiersInStoreDetailsModal({
              loggedInUser: config.userData.name,
              manufacturer: program.manufacturer,
              store: row.store,
            }),
          tierChecks: null, // Add tier-level checks if needed
        });
        // Legacy verifyAllTiers logic (if still needed)
        try {
          await storeDetailModal.verifyAllTiers(program, page, row.store);
        } catch (error) {
          const screenshot = await TestHelpers.takeScreenshot(
            page,
            `tier-verification-failed`,
            `${config.userData.name}-${row.store}-${program.manufacturer}`
          );
          errorFlag.push({
            failed: true,
            message: `Tier verification failed for ${config.userData.name} - ${row.store} - ${program.manufacturer}\n${error.message}\nScreenshot: ${screenshot}\n\n`,
          });
        }
        await page.locator(storeDetailModal.selectors.modalClose).click();
      }
    }
  }
}

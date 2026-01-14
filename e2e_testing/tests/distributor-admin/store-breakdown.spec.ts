import { expect, test } from '@playwright/test';
import StoreDetailsPage, {
  ProgramRow,
} from '../../pages/distributor-admin/StoreDetailsPage';
import StorePage from '../../pages/distributor-admin/StorePage';
import StoreDetailModal from '../../pages/Modals/StoreDetailModal';
import SuperAdminUsersTable from '../../pages/SuperAdminUsersTable';
import { ENTITY_TYPE, MAX_STORES_TO_TEST } from '../../utils/constant';
import {
  expectWithMessage,
  saveScreenshot,
  waitForPageLoad,
} from '../../utils/helper';
import { distributorMap } from '../../utils/userMap';

const MANUFACTURER_TO_SKIP: string[] = [
  // 'Jack Links', 'HERSHEY'
];

distributorMap.forEach((distributor, distributorKey) => {
  // if (distributor.name !== 'Pitco') return;

  test.describe(`Distributor Store Page Detail: ${distributor.name}`, () => {
    let usersTable;
    let storePage;
    let storeDetailsPage;
    let storeDetailModal;

    test.beforeEach(async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Runs only on Chrome');

      // Set larger viewport for all browsers
      await page.setViewportSize({ width: 1920, height: 1080 });

      usersTable = new SuperAdminUsersTable(page);
      storePage = new StorePage(page);
      storeDetailsPage = new StoreDetailsPage(page);
      storeDetailModal = new StoreDetailModal(page);

      // Impersonate distributor
      await usersTable.impersonateUser(
        ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        distributorKey,
        {
          distributorMap,
        }
      );

      // Check if the page is on the app page
      await expectWithMessage(
        () => expect(page).toHaveURL(/app/),
        `Expected to be on the app page after impersonation, but got: ${page.url()}`
      );

      await page.waitForLoadState('networkidle');
      // Navigate to Programs page
      await storePage.switchToStorePage();

      await page.waitForSelector(storePage.selectors.storeTable, {
        state: 'visible',
        timeout: 30000,
      });

      await expectWithMessage(
        () => expect(page).toHaveURL('app/store'),
        `Expected to be on the store page after navigation, but got: ${page.url()}`
      );

      await page.waitForLoadState('networkidle');
    });

    // This test verifies the Store Breakdown page for each store under a distributor.
    test('Test and Verify Purchase Volume and Estimated Earnings for each store on Stores Page', async ({
      page,
    }) => {
      const errorFlag: { failed: boolean; message: string }[] = [];
      console.log(`========= Page Started for: ${distributor.name} =========`);
      await expectWithMessage(
        () =>
          expect(page.locator(storePage.selectors.storeTable)).toBeVisible(),
        'Expected Store Table to be visible'
      );

      // Click on the "Estimated Earnings" heading to sort the table
      const heading = page.locator(`${storePage.selectors.storeTable} th`, {
        hasText: 'Store Earnings',
      });
      await heading.click();

      // Wait for the page to load
      await waitForPageLoad({
        page,
        errorMessage:
          'Store Details Modal Response timeout - continuing with test',
      });
      await page.waitForTimeout(3000);

      // Get All Stores from the Store Table
      const rows = await storePage.getAllStoresData();
      const maxStores =
        rows?.length > MAX_STORES_TO_TEST ? MAX_STORES_TO_TEST : rows?.length;

      // Store Loop
      for (let i = 0; i <= maxStores; i++) {
        // Get the current Store Row
        const row = rows[i];
        // Skip if the row is null or the store is not found
        if (!row?.store) continue;

        console.log(
          `--------- Testing Store: ${row.store} for: ${distributor.name} ---------`
        );

        // Go to the Store Details Page
        const currentStoreRow = page.locator(
          `${storePage.selectors.storeTableRow}:nth-child(${i + 1})`
        );

        // Check if the store row is visible
        if (!(await currentStoreRow.isVisible())) {
          const screenshot = await saveScreenshot(page, `store-not-found`);
          errorFlag.push({
            failed: true,
            message: `Store: ${row.store} not found in the Store Table for: ${distributor.name}.\nScreenshot saved: ${screenshot}\n`,
          });
          console.log(
            `Store: ${row.store} not found in the Store Table for: ${distributor.name}`
          );
          continue;
        }
        // Click on the current Store Row
        await currentStoreRow.click();

        // Wait for the page to load
        await waitForPageLoad({
          page,
          errorMessage:
            'Store Details Modal Response timeout - continuing with test',
        });
        // Wait for 3 seconds
        await page.waitForTimeout(3000);

        // Get Dashboard Metrics
        const dashboardMetrics = await storeDetailsPage.getDashboardMetrics();

        // Compare Dashboard Metrics with Store listing list
        if (dashboardMetrics.purchaseVolume !== row.purchaseVolume) {
          errorFlag.push({
            failed: true,
            message: `Purchase Volume: ${dashboardMetrics.purchaseVolume} is not equal to the expected purchase volume: ${row.purchaseVolume} for store: ${row.store}`,
          });
        }
        if (dashboardMetrics.estimatedEarnings !== row.estimatedEarnings) {
          errorFlag.push({
            failed: true,
            message: `Estimated Earnings: ${dashboardMetrics.estimatedEarnings} is not equal to the expected estimated earnings: ${row.estimatedEarnings} for store: ${row.store}`,
          });
        }

        // Check if the enrolledprogram rows are visible
        const programTableLocators = page.locator(
          `${storeDetailsPage.selectors.programTable}`
        );
        const isProgramTableVisible =
          (await programTableLocators.count()) > 0 &&
          (await programTableLocators.first().isVisible());
        if (!isProgramTableVisible) {
          errorFlag.push({
            failed: true,
            message: `Program Rows are not visible for store: ${row.store}`,
          });
        }

        // Get all program rows
        const programRows: ProgramRow[] =
          await storeDetailsPage.getAllProgramRows();

        // Check if the not enrolled tab is visible
        const notEnrolledTab = page.locator(
          storeDetailsPage.selectors.programNotEnrolledTab
        );
        const isNotEnrolledTabVisible = await notEnrolledTab.isVisible();
        if (!isNotEnrolledTabVisible) {
          const screenshot = await saveScreenshot(
            page,
            `not-enrolled-tab-not-visible-${distributor.name}`
          );
          errorFlag.push({
            failed: true,
            message: `Not Enrolled Tab is not visible for Distributor: ${distributor.name} in Store Details: ${row.store}\n\n
            Screenshot saved: ${screenshot}\n`,
          });
          continue;
        }
        console.log('Not Enrolled Tab is visible: ', isNotEnrolledTabVisible);
        // Click on the not enrolled tab
        await notEnrolledTab.click();
        await waitForPageLoad({
          page,
          errorMessage: 'Not Response timeout - continuing with test',
        });
        await page.waitForTimeout(3000);

        // Get all program rows
        const notEnrolledProgramRows: ProgramRow[] =
          await storeDetailsPage.getAllProgramRows();

        // Compare total purchase volume and estimated earnings with dashboard metrics
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
        if (
          Math.abs(totalPurchaseVolume - dashboardMetrics.purchaseVolume) > 2
        ) {
          const screenshot = await saveScreenshot(
            page,
            `total-purchase-volume-not-matching-${distributor.name}-${row.store}`
          );
          errorFlag.push({
            failed: true,
            message: `For Distributor: ${distributor.name} | Store Name: ${
              row.store
            }\nScreenshot saved: ${screenshot}\nTotal Purchase Volume: ${
              dashboardMetrics.purchaseVolume
            } | Sum of Enrolled and Not Enrolled: ${totalPurchaseVolume} | Difference: ${
              totalPurchaseVolume - dashboardMetrics.purchaseVolume
            }\n`,
          });
        } else {
          console.log(
            `Total Purchase Volume: ${
              dashboardMetrics.purchaseVolume
            } | Sum of Enrolled and Not Enrolled: ${totalPurchaseVolume} | Difference: ${
              totalPurchaseVolume - dashboardMetrics.purchaseVolume
            }
            For Distributor: ${distributor.name} | Store Name: ${row.store}\n`
          );
        }

        // Compare total estimated earnings with dashboard metrics
        const totalEstimatedEarnings = programRows.reduce(
          (acc, curr) => acc + curr.estimatedEarnings,
          0
        );
        if (
          Math.abs(
            totalEstimatedEarnings - dashboardMetrics.estimatedEarnings
          ) > 2
        ) {
          const screenshot = await saveScreenshot(
            page,
            `total-estimated-earnings-not-matching-${distributor.name}-${row.store}`
          );
          errorFlag.push({
            failed: true,
            message: `For Distributor: ${distributor.name} | Store Name: ${
              row.store
            }\nScreenshot saved: ${screenshot}\nTotal Estimated Earnings: ${
              dashboardMetrics.estimatedEarnings
            } | Sum of Enrolled Programs: ${totalEstimatedEarnings} | Difference: ${
              totalEstimatedEarnings - dashboardMetrics.estimatedEarnings
            }\n`,
          });
        } else {
          console.log(
            `Total Estimated Earnings: ${
              dashboardMetrics.estimatedEarnings
            } | Sum of Enrolled Programs: ${totalEstimatedEarnings} | Difference: ${
              totalEstimatedEarnings - dashboardMetrics.estimatedEarnings
            }
            For Distributor: ${distributor.name} | Store Name: ${row.store}\n`
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

        const enrolledPrograms =
          totalEnrolledPrograms + totalNotEnrolledPrograms;
        const totalProgramCompliance =
          enrolledProgramCompliance + notEnrolledProgramCompliance;

        if (enrolledPrograms !== row.programCompliance.completed) {
          errorFlag.push({
            failed: true,
            message: `Enrolled Programs: ${enrolledPrograms} is not equal to the expected enrolled programs: ${row.programCompliance.completed} for in Store Details: ${row.store}`,
          });
        } else {
          console.log(
            `Enrolled Programs: ${enrolledPrograms} | Expected Enrolled Programs: ${row.programCompliance.completed}
            For Distributor: ${distributor.name} | Store Name: ${row.store}\n`
          );
        }
        if (totalProgramCompliance !== row.programCompliance.total) {
          errorFlag.push({
            failed: true,
            message: `Total Program Compliance: ${totalProgramCompliance} is not equal to the expected total program compliance: ${row.programCompliance.total} for in Store Details: ${row.store}`,
          });
        } else {
          console.log(
            `Total Program Compliance: ${totalProgramCompliance} | Expected Total Program Compliance: ${row.programCompliance.total}
            For Distributor: ${distributor.name} | Store Name: ${row.store}\n`
          );
        }

        // Now we will check Tier compliance in the store detail modal
        const allTabs = await page
          .locator(storeDetailsPage.selectors.allTabs)
          .all();

        // Click on the Tabs
        for (let i = 0; i < allTabs.length; i++) {
          await allTabs[i].click();
          await waitForPageLoad({
            page,
            errorMessage: 'Unable to load the tab - continuing with test',
          });
          await page.waitForTimeout(100);

          // Get all programs
          const programs: ProgramRow[] =
            await storeDetailsPage.getAllProgramRows();
          const maxPrograms = programs?.length;

          // Program Loop
          for (let j = 0; j < maxPrograms; j++) {
            const program = programs[j];
            if (!program) continue;

            if (MANUFACTURER_TO_SKIP.includes(program.manufacturer)) {
              continue;
            }

            // Get the program row
            const programRow = page.locator(
              `${storeDetailsPage.selectors.programTableRow}:nth-child(${
                j + 1
              })`
            );
            if (!(await programRow.isVisible())) {
              errorFlag.push({
                failed: true,
                message: `Program Row is not visible for store: ${
                  row.store
                } - Tab: ${allTabs[i].textContent()} - Program: ${
                  program.manufacturer
                }`,
              });
              continue;
            }
            // Click on the program row
            await programRow.click();
            await waitForPageLoad({
              page,
              errorMessage: 'Unable to load the program - continuing with test',
            });
            await page.waitForTimeout(1000);

            // Wait for the store detail modal to be visible
            await page.waitForSelector(storeDetailModal.selectors.storeModal, {
              state: 'visible',
            });
            await page.waitForTimeout(1000);

            // Match Visual and Text Completed Skus
            const { status: isCompletedSkus, message } =
              await storeDetailModal.matchCompletedSkusTiersInStoreDetailsModal(
                {
                  loggedInUser: distributor.name,
                  manufacturer: program.manufacturer,
                  store: row.store,
                }
              );
            console.log(
              `isCompletedSkus: ${isCompletedSkus} | from modal: ${program.programCompliance.completed} | from table: ${row.programCompliance.completed} for ${distributor.name} - ${program.manufacturer} - ${row.store}`
            );
            console.log(`isCompletedSkus Message: ${message}`);

            // If the completed skus are not matching, add to error flag
            if (
              isCompletedSkus === false ||
              isCompletedSkus != program.programCompliance.completed
            ) {
              const screenshot = await saveScreenshot(
                page,
                `issue-in-sku-matching-${program.manufacturer}`
              );
              errorFlag.push({
                failed: true,
                message: `Completed Skus are not matching for ${distributor.name} - ${program.manufacturer} Store: ${row.store}\nTier: ${row.tier} | Completed Skus: ${isCompletedSkus} | Expected: ${program.programCompliance.completed}\nScreenshot: ${screenshot}\n\n`,
              });
              errorFlag.push({
                failed: true,
                message: `Message from completedSkusCheck: ${message}\nScreenshot: ${screenshot}\n\n`,
              });
            }

            // Verify all tiers in the store detail modal
            try {
              await storeDetailModal.verifyAllTiers(program, page, row.store);
            } catch (error) {
              const screenshot = await saveScreenshot(
                page,
                `tier-verification-failed-${distributor.name}-${row.store}-${program.manufacturer}`
              );
              errorFlag.push({
                failed: true,
                message: `Tier verification failed for ${distributor.name} - ${row.store} - ${program.manufacturer}\n${error.message}\nScreenshot: ${screenshot}\n\n`,
              });
            }

            // Close the store detail modal
            await page.locator(storeDetailModal.selectors.modalClose).click();
          }
        }

        // Go Back to the Store Page
        await storeDetailsPage.goBackToStorePage();
      }
      console.log(
        `========= Page Completed for: ${distributor.name} =========`
      );

      // Log Error Flag
      const failedCases = errorFlag.filter((error) => error.failed);
      if (failedCases.length > 0) {
        failedCases.forEach((error) => {
          console.error(error.message);
        });
        expectWithMessage(
          () => expect(failedCases.length).toBe(0),
          'There are one or more failed cases, Check the screenshot and Console error for more details'
        );
      } else {
        console.log('No failed cases: ', errorFlag);
      }
    });
  });
});

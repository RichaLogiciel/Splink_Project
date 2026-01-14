import { expect, test } from '@playwright/test';
import StorePage from '../../pages/sales-rep/StorePage';
import StoreSpiffDetailPage from '../../pages/sales-rep/StoreSpiffDetailPage';
import StoreSpiffPage from '../../pages/sales-rep/StoreSpiffPage';
import SuperAdminUsersTable from '../../pages/SuperAdminUsersTable';
import {
  ENTITY_TYPE,
  MAX_STORES_TO_TEST,
  PROGRAM_TIMELINE_TO_TEST,
} from '../../utils/constant';
import { expectWithMessage } from '../../utils/helper';
import { salesRepMap } from '../../utils/userMap';
import { TestHelpers } from '../shared/utils/TestHelpers';

// Type assertion for selectors property for type safety
interface StoreSpiffPageWithSelectors extends StoreSpiffPage {
  selectors: any;
}
interface StoreSpiffDetailPageWithSelectors extends StoreSpiffDetailPage {
  selectors: any;
}

// Loop through each sales rep in the user map to create a test suite per user
salesRepMap.forEach((salesRep, salesRepKey) => {
  // Declare page object variables for use in beforeEach and tests
  let usersTable;
  let storePage;
  let storeSpiffPage;
  let storeSpiffDetailPage;

  // Main test suite for each sales rep
  test.describe(`Sales Rep: Store SPIFF Breakdown - ${salesRep.name}`, () => {
    // Setup before each test: impersonate user and navigate to Store page
    test.beforeEach(async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Runs only on Chrome');

      // Set a large viewport for consistency
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Instantiate page objects
      usersTable = new SuperAdminUsersTable(page);
      storePage = new StorePage(page);
      storeSpiffPage = new StoreSpiffPage(page) as StoreSpiffPageWithSelectors;
      storeSpiffDetailPage = new StoreSpiffDetailPage(
        page
      ) as StoreSpiffDetailPageWithSelectors;

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

      // Navigate to the Store page from the menu
      await storePage.switchToStorePage();
      console.log(`[${salesRep.name}] Navigated to Store page.`);

      // Wait for the store table to be visible
      await page.waitForSelector(storePage.selectors.storeTable, {
        state: 'visible',
        timeout: 30000,
      });
      console.log(`[${salesRep.name}] Store table visible.`);

      // Confirm we are on the correct store page
      if (PROGRAM_TIMELINE_TO_TEST !== 'Current') {
        await expectWithMessage(
          () =>
            expect(page).toHaveURL(
              '/app/store?programTimeline=' + PROGRAM_TIMELINE_TO_TEST
            ),
          `Expected to be on the store page after navigation, but got: ${page.url()}`
        );
      }
      console.log(`[${salesRep.name}] On store page after navigation.`);

      await page.waitForLoadState('networkidle');
    });

    test(`should validate SPIFF breakdown for ${salesRep.name}`, async ({
      page,
      browserName,
    }) => {
      if (browserName !== 'chromium') test.skip();

      // Error flag array to collect all soft errors for this user
      const errorFlag: any[] = [];
      const userData = salesRep;
      TestHelpers.logTestStart(userData.name, 'Store SPIFF Breakdown');

      // Double-check we are on the app page
      await expect(page).toHaveURL(/app/);
      await page.waitForLoadState('networkidle');

      // Sort the table by Program Compliance (3rd column)
      const header = page.locator(
        `${storeSpiffPage.selectors.spiffStoreTable} th`,
        { hasText: 'Program Compliance' }
      );
      await header.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      console.log(`[${salesRep.name}] Sorted by Program Compliance.`);

      // Fetch all stores from the table (limit to MAX_STORES_TO_TEST)
      const stores = (await storeSpiffPage.getAllStoresData()).filter(Boolean);
      const maxStores =
        stores.length > MAX_STORES_TO_TEST ? MAX_STORES_TO_TEST : stores.length;
      console.log(`[${salesRep.name}] Fetched ${stores.length} stores.`);

      // Loop through each store row for breakdown validation
      for (let i = 0; i < maxStores; i++) {
        const row = stores[i];
        if (!row?.store) continue;
        console.log(`[${salesRep.name}] Testing store: ${row.store}`);
        // Click on the store name to open the detail page
        const storeRow = page.locator(
          `${storeSpiffPage.selectors.spiffStoreTableRow}:nth-child(${i + 1})`
        );
        await storeRow.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        console.log(
          `[${salesRep.name}] Opened detail page for store: ${row.store}`
        );

        // Go to the Store SPIFF page (SPIFFs tab)
        await storeSpiffDetailPage.switchToStoreSpiffPage();
        await page.waitForLoadState('networkidle');
        console.log(`[${salesRep.name}] Navigated to Store SPIFF page.`);

        // Get SPIFF detail metrics for the store
        const mySpiffEarnings = await storeSpiffDetailPage.getMySpiffEarnings();
        const spiffProgramAvailable =
          await storeSpiffDetailPage.getSpiffProgramAvailable();
        console.log(
          `[${salesRep.name}] Detail page metrics - My Spiff Earnings: ${mySpiffEarnings}, Spiff Program Available: ${spiffProgramAvailable}`
        );

        // STORE PROGRAM LIST DOESN'T CONTAIN SPIFF EARNING AND PROGRAM COUNT
        // Compare detail metrics with the store row values
        // if (mySpiffEarnings !== row.myEarningProgramAvailable) {
        //   const screenshot = await TestHelpers.takeScreenshot(
        //     page,
        //     'my-spiff-earnings-mismatch',
        //     `${userData.name}-${row.store}`
        //   );
        //   errorFlag.push({
        //     failed: true,
        //     message: `My Spiff Earnings mismatch for ${userData.name} - ${row.store}\nExpected: ${row.myEarningProgramAvailable}, Actual: ${mySpiffEarnings}\nScreenshot: ${screenshot}\n\n`,
        //   });
        // }
        // expect.soft(mySpiffEarnings).toBe(row.myEarningProgramAvailable);
        // if (spiffProgramAvailable !== row.programAvailable) {
        //   const screenshot = await TestHelpers.takeScreenshot(
        //     page,
        //     'spiff-program-available-mismatch',
        //     `${userData.name}-${row.store}`
        //   );
        //   errorFlag.push({
        //     failed: true,
        //     message: `Spiff Program Available mismatch for ${userData.name} - ${row.store}\nExpected: ${row.programAvailable}, Actual: ${spiffProgramAvailable}\nScreenshot: ${screenshot}\n\n`,
        //   });
        // }
        // expect.soft(spiffProgramAvailable).toBe(row.programAvailable);

        // Get all spiff programs for the store
        const spiffPrograms = (
          await storeSpiffDetailPage.getAllSpiffPrograms()
        ).filter((curr: any) => !!curr);
        console.log(
          `[${salesRep.name}] Found ${spiffPrograms.length} spiff programs for store: ${row.store}`
        );

        // Sum up earnings and available programs for all spiff programs
        const totalMyEarnings = spiffPrograms.reduce(
          (acc: number, curr: any) => acc + (curr?.myEarnings || 0),
          0
        );
        const totalAvailableProgram = spiffPrograms.reduce(
          (acc: number, curr: any) => acc + Number(curr?.availableProgram || 0),
          0
        );

        // Compare the sums with the store row
        if (Math.abs(totalMyEarnings - mySpiffEarnings) > 2) {
          const screenshot = await TestHelpers.takeScreenshot(
            page,
            'total-my-earnings-mismatch',
            `${userData.name}-${row.store}`
          );
          errorFlag.push({
            failed: true,
            message: `Total My Earnings from programs mismatch for ${userData.name} - ${row.store}\nExpected: ${mySpiffEarnings}, Actual: ${totalMyEarnings}\nScreenshot: ${screenshot}\n\n`,
          });
        }

        // Total Available Program mismatch
        if (totalAvailableProgram !== Number(spiffProgramAvailable)) {
          const screenshot = await TestHelpers.takeScreenshot(
            page,
            'total-available-program-mismatch',
            `${userData.name}-${row.store}`
          );
          errorFlag.push({
            failed: true,
            message: `Total Available Program from programs mismatch for ${userData.name} - ${row.store}\nExpected: ${spiffProgramAvailable}, Actual: ${totalAvailableProgram}\nScreenshot: ${screenshot}\n\n`,
          });
        }

        // For each spiff program, check manufacturer programs
        for (let j = 0; j < spiffPrograms.length; j++) {
          const spiffProgram = spiffPrograms[j];
          if (!spiffProgram) continue;
          console.log(
            `[${salesRep.name}] Checking spiff program: ${spiffProgram.manufacturer}`
          );
          // Click on the spiff program row to open manufacturer programs
          const programRow = page.locator(
            `${storeSpiffDetailPage.selectors.spiffProgramTableRow}:nth-child(${
              j + 1
            })`
          );
          console.log('spiffProgram', spiffProgram);
          console.log('programRow', programRow);

          await programRow.click();
          await page.waitForTimeout(500);
          // Get all manufacturer programs for this spiff program
          const manufacturerPrograms = (
            await storeSpiffDetailPage.getManufacturerPrograms(programRow)
          ).filter((mp: any) => !!mp);
          console.log('manufacturerPrograms', manufacturerPrograms);

          console.log(
            `[${salesRep.name}] Found ${manufacturerPrograms.length} manufacturer programs for spiff program: ${spiffProgram.manufacturer}`
          );

          // Compare each manufacturer program's earnings with the parent spiff program
          const totalManufacturerEarning = manufacturerPrograms.reduce(
            (acc: number, curr: any) => acc + (curr?.myEarnings || 0),
            0
          );

          // Manufacturer Program My Earnings mismatch
          if (
            Math.abs(totalManufacturerEarning - spiffProgram.myEarnings) > 2
          ) {
            const screenshot = await TestHelpers.takeScreenshot(
              page,
              'manufacturer-program-my-earnings-mismatch',
              `${userData.name}-${row.store}-${spiffProgram.manufacturer}`
            );
            errorFlag.push({
              failed: true,
              message: `Manufacturer Program My Earnings mismatch for ${userData.name} - ${row.store} - ${spiffProgram.manufacturer}\nExpected: ${spiffProgram.myEarnings}, Actual: ${totalManufacturerEarning}\nScreenshot: ${screenshot}\n\n`,
            });
          }

          // TODO: Manufacturer Program Modal My Earnings mismatch

          await programRow.click();
        }
        // After all checks for this store, go back to the Store SPIFF page
        await storeSpiffDetailPage.goBacktoStoreSpiffPage();
        await page.waitForLoadState('networkidle');
        console.log(
          `[${salesRep.name}] Returned to Store SPIFF page after store: ${row.store}`
        );
      }
      // Log test completion and handle all collected errors
      TestHelpers.logTestComplete(userData.name, 'Store SPIFF Breakdown');
      await TestHelpers.handleErrors(errorFlag, 'Store SPIFF Breakdown');
    });
  });
});

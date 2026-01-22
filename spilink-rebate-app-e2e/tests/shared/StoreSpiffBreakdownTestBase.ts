import { expect, test } from '@playwright/test';
import SuperAdminUsersTable from '../../pages/SuperAdminUsersTable';
import { MAX_STORES_TO_TEST, PROGRAM_TIMELINE_TO_TEST } from '../../utils/constant';
import { expectWithMessage } from '../../utils/helper';
import {
  distributorMap,
  manufacturerMap,
  salesRepManagerMap,
  salesRepMap,
} from '../../utils/userMap';
import { TestConfig } from './types/TestConfig';
import { ErrorFlag, TestHelpers } from './utils/TestHelpers';

export abstract class StoreSpiffBreakdownTestBase {
  protected abstract getTestConfig(): TestConfig;

  protected async setupTest(page: any, browserName: string) {
    const config = this.getTestConfig();

    test.skip(browserName !== 'chromium', 'Runs only on Chrome');

    // Set larger viewport for all browsers
    await page.setViewportSize({ width: 1920, height: 1080 });

    const usersTable = new SuperAdminUsersTable(page);
    const storePage = new config.pageClasses.storePage(page);
    const storeSpiffPage = new config.pageClasses.storeSpiffPage(page);
    const storeSpiffDetailPage = new config.pageClasses.storeSpiffDetailPage(page);

    // Impersonate user
    await usersTable.impersonateUser(config.entityType as any, config.userKey, {
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

    // Change Program Timeline
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
      storeSpiffPage,
      storeSpiffDetailPage,
      config,
    };
  }

  public async runStoreSpiffBreakdownTest(page: any) {
    const { storePage, storeSpiffPage, storeSpiffDetailPage, config } =
      await this.setupTest(page, 'chromium');

    const errorFlag: ErrorFlag[] = [];
    TestHelpers.logTestStart(config.userData.name, 'Store SPIFF Breakdown');

    // Double-check we are on the app page
    await expect(page).toHaveURL('/app/store');
    await page.waitForLoadState('networkidle');

    // Sort the table by Program Compliance
    const header = page.locator(
      `${storeSpiffPage.selectors.spiffStoreTable} th`,
      { hasText: 'Program Compliance' }
    );
    await header.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    console.log(`[${config.userData.name}] Sorted by Program Compliance.`);

    // Fetch all stores from the table (limit to MAX_STORES_TO_TEST)
    const stores = (await storeSpiffPage.getAllStoresData()).filter(Boolean);
    const maxStores =
      stores.length > MAX_STORES_TO_TEST ? MAX_STORES_TO_TEST : stores.length;
    console.log(`[${config.userData.name}] Fetched ${stores.length} stores.`);

    // Loop through each store row for breakdown validation
    for (let i = 0; i < maxStores; i++) {
      const row = stores[i];
      if (!row?.store) continue;
      console.log(`--------[${config.userData.name}] Testing store: ${row.store}--------`);
      
      // Click on the store name to open the detail page
      const storeRow = page.locator(
        `${storeSpiffPage.selectors.spiffStoreTableRow}:nth-child(${i + 1})`
      );
      await storeRow.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      console.log(
        `[${config.userData.name}] Opened detail page for store: ${row.store}`
      );

      // Go to the Store SPIFF page (SPIFFs tab)
      await storeSpiffDetailPage.switchToStoreSpiffPage();
      await page.waitForLoadState('networkidle');
      console.log(`[${config.userData.name}] Navigated to Store SPIFF page.`);

      // Get SPIFF detail metrics for the store
      const mySpiffEarnings = await storeSpiffDetailPage.getMySpiffEarnings();
      const spiffProgramAvailable =
        await storeSpiffDetailPage.getSpiffProgramAvailable();
      console.log(
        `[${config.userData.name}] Detail page metrics - My Spiff Earnings: ${mySpiffEarnings}, Spiff Program Available: ${spiffProgramAvailable}`
      );

      // Get all spiff programs for the store
      const spiffPrograms = (
        await storeSpiffDetailPage.getAllSpiffPrograms()
      ).filter((curr: any) => !!curr);
      console.log(
        `[${config.userData.name}] Found ${spiffPrograms.length} spiff programs for store: ${row.store}`
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
          `${config.userData.name}-${row.store}`
        );
        errorFlag.push({
          failed: true,
          message: `Total My Earnings from programs mismatch for ${config.userData.name} - ${row.store}\nExpected: ${mySpiffEarnings}, Actual: ${totalMyEarnings}\nScreenshot: ${screenshot}\n\n`,
        });
      }

      // Total Available Program mismatch
      if (totalAvailableProgram !== Number(spiffProgramAvailable)) {
        const screenshot = await TestHelpers.takeScreenshot(
          page,
          'total-available-program-mismatch',
          `${config.userData.name}-${row.store}`
        );
        errorFlag.push({
          failed: true,
          message: `Total Available Program from programs mismatch for ${config.userData.name} - ${row.store}\nExpected: ${spiffProgramAvailable}, Actual: ${totalAvailableProgram}\nScreenshot: ${screenshot}\n\n`,
        });
      }

      // For each spiff program, check manufacturer programs
      for (let j = 0; j < spiffPrograms.length; j++) {
        const spiffProgram = spiffPrograms[j];
        if (!spiffProgram) continue;
        console.log(
          `[${config.userData.name}] Checking spiff program: ${spiffProgram.manufacturer}`
        );
        
        // Click on the spiff program row to open manufacturer programs
        const programRow = page.locator(
          `${storeSpiffDetailPage.selectors.spiffProgramTableRow}:nth-child(${
            j + 1
          })`
        );

        await programRow.click();
        await page.waitForTimeout(500);
        
        // Get all manufacturer programs for this spiff program
        const manufacturerPrograms = (
          await storeSpiffDetailPage.getManufacturerPrograms(programRow)
        ).filter((mp: any) => !!mp);

        console.log(
          `[${config.userData.name}] Found ${manufacturerPrograms.length} manufacturer programs for spiff program: ${spiffProgram.manufacturer}`
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
            `${config.userData.name}-${row.store}-${spiffProgram.manufacturer}`
          );
          errorFlag.push({
            failed: true,
            message: `Manufacturer Program My Earnings mismatch for ${config.userData.name} - ${row.store} - ${spiffProgram.manufacturer}\nExpected: ${spiffProgram.myEarnings}, Actual: ${totalManufacturerEarning}\nScreenshot: ${screenshot}\n\n`,
          });
        }

        // For each manufacturer program line item, validate modal
        for (let k = 0; k < manufacturerPrograms.length; k++) {
          const manufacturerProgram = manufacturerPrograms[k];
          if (!manufacturerProgram) continue;

          console.log(
            `[${config.userData.name}] Validating modal for manufacturer program: ${manufacturerProgram.programName}`
          );

          try {
            // Get the expanded table to find the line item row
            const expandedTable = programRow.locator(' + tr table.expandedRowTable');
            await expandedTable.waitFor({ state: 'visible', timeout: 5000 });
            
            // Get all rows and filter out header rows manually
            // Use same logic as getManufacturerPrograms: filter rows with cellCount <= 1
            const allTableRows = await expandedTable.locator('tr').all();
            const dataRows: any[] = [];
            for (const row of allTableRows) {
              const cellCount = await row.locator('td').count();
              // Filter using same logic as getManufacturerPrograms: cellCount > 1
              if (cellCount > 1) {
                dataRows.push(row);
              }
            }
            
            if (k >= dataRows.length) {
              console.error(`[${config.userData.name}] Index ${k} out of bounds for ${dataRows.length} data rows`);
              continue;
            }
            
            const lineItemRow = dataRows[k];
            await lineItemRow.waitFor({ state: 'visible', timeout: 5000 });
            await lineItemRow.click();
            await page.waitForTimeout(1000);

            // Wait for modal to appear
            await storeSpiffDetailPage.waitForModal();
            console.log(
              `[${config.userData.name}] Modal opened for program: ${manufacturerProgram.programName}`
            );

            // Extract modal earnings and compare with line item earnings
            const modalEarnings = await storeSpiffDetailPage.getModalEarnings();
            if (Math.abs(modalEarnings - manufacturerProgram.myEarnings) > 2) {
              const screenshot = await TestHelpers.takeScreenshot(
                page,
                'modal-earnings-mismatch',
                `${config.userData.name}-${row.store}-${spiffProgram.manufacturer}-${manufacturerProgram.programName}`
              );
              errorFlag.push({
                failed: true,
                message: `Modal Earnings mismatch for ${config.userData.name} - ${row.store} - ${spiffProgram.manufacturer} - ${manufacturerProgram.programName}\nExpected: ${manufacturerProgram.myEarnings}, Actual: ${modalEarnings}\nScreenshot: ${screenshot}\n\n`,
              });

              console.log(`Modal Earnings mismatch for ${config.userData.name} - ${row.store} - ${spiffProgram.manufacturer} - ${manufacturerProgram.programName}\nExpected: ${manufacturerProgram.myEarnings}, Actual: ${modalEarnings}`);
            }

            // Extract SKU counts from modalTiers
            const skuCounts = await storeSpiffDetailPage.getModalSkus();
            console.log(
              `[${config.userData.name}] Modal SKU counts - Completed: ${skuCounts.completed}, Total: ${skuCounts.total}`
            );

            // Count non-purchased products (when "Show Purchased" is OFF by default)
            const nonPurchasedProducts = await storeSpiffDetailPage.getModalProductCount();
            console.log(
              `[${config.userData.name}] Non-purchased products in modal: ${nonPurchasedProducts}`
            );

            // Click products checkbox to show purchased products
            const checkbox = page.locator(
              storeSpiffDetailPage.selectors.modalProductsCheckbox
            );
            let purchasedProducts = 0;
            if (await checkbox.isVisible()) {
              await checkbox.click();
              await page.waitForTimeout(500);
              await page.waitForLoadState('networkidle');

              // Count purchased products
              purchasedProducts =
                await storeSpiffDetailPage.getModalPurchasedProductCount();
              console.log(
                `[${config.userData.name}] Purchased products in modal: ${purchasedProducts}`
              );

              // Validate purchased products matches completed SKUs
              if (purchasedProducts !== skuCounts.completed) {
                const screenshot = await TestHelpers.takeScreenshot(
                  page,
                  'modal-purchased-products-mismatch',
                  `${row.store.replace(/[^a-zA-Z0-9]/g, '-')}-${spiffProgram.manufacturer?.replace(/[^a-zA-Z0-9]/g, '-')}`
                );
                errorFlag.push({
                  failed: true,
                  message: `Modal Purchased Products mismatch for ${config.userData.name} - ${row.store} - ${spiffProgram.manufacturer} - ${manufacturerProgram.programName}\nExpected Completed SKUs: ${skuCounts.completed}, Actual Purchased Products: ${purchasedProducts}\nScreenshot: ${screenshot}\n\n`,
                });

                console.log(`Modal Purchased Products mismatch for ${config.userData.name} - ${row.store} - ${spiffProgram.manufacturer} - ${manufacturerProgram.programName}\nExpected Completed SKUs: ${skuCounts.completed}, Actual Purchased Products: ${purchasedProducts}`);
              }
            } else {
              console.log(
                `[${config.userData.name}] Products checkbox not visible, skipping purchased products validation`
              );
            }

            // Validate that non-purchased + purchased = total SKUs
            const totalProducts = nonPurchasedProducts + purchasedProducts;
            if (totalProducts !== skuCounts.total) {
              const screenshot = await TestHelpers.takeScreenshot(
                page,
                'modal-product-count-mismatch',
                `${row.store.replace(/[^a-zA-Z0-9]/g, '-')}-${spiffProgram.manufacturer?.replace(/[^a-zA-Z0-9]/g, '-')}`
              );
              errorFlag.push({
                failed: true,
                message: `Modal Product Count mismatch for ${config.userData.name} - ${row.store} - ${spiffProgram.manufacturer} - ${manufacturerProgram.programName}\nExpected Total SKUs: ${skuCounts.total}, Actual Total Products (non-purchased + purchased): ${totalProducts} (${nonPurchasedProducts} + ${purchasedProducts})\nScreenshot: ${screenshot}\n\n`,
              });

              console.log(`Modal Product Count mismatch for ${config.userData.name} - ${row.store} - ${spiffProgram.manufacturer} - ${manufacturerProgram.programName}\nExpected Total SKUs: ${skuCounts.total}, Actual Total Products: ${totalProducts}`);
            }

            // Close modal
            await storeSpiffDetailPage.closeModal();
            console.log(
              `[${config.userData.name}] Modal closed for program: ${manufacturerProgram.programName}`
            );
          } catch (error) {
            console.error(
              `[${config.userData.name}] Error validating modal for ${manufacturerProgram.programName}: ${error}`
            );
            const screenshot = await TestHelpers.takeScreenshot(
              page,
              'modal-validation-error',
              `${row.store.replace(/[^a-zA-Z0-9]/g, '-')}-${spiffProgram.manufacturer?.replace(/[^a-zA-Z0-9]/g, '-')}`
            );
            errorFlag.push({
              failed: true,
              message: `Error validating modal for ${config.userData.name} - ${row.store} - ${spiffProgram.manufacturer} - ${manufacturerProgram.programName}\nError: ${error}\nScreenshot: ${screenshot}\n\n`,
            });

            console.log(`Error validating modal for ${config.userData.name} - ${row.store} - ${spiffProgram.manufacturer} - ${manufacturerProgram.programName}\nError: ${error}\nScreenshot: ${screenshot}\n\n`);

            // Try to close modal if it's still open
            try {
              await storeSpiffDetailPage.closeModal();
            } catch (closeError) {
              // Modal might already be closed, ignore
            }
          }
        }

        await programRow.click(); // Close the Program Accordion
      }
      
      try {
        // After all checks for this store, go back to the Store SPIFF page
        await storeSpiffDetailPage.goBackToStorePage(PROGRAM_TIMELINE_TO_TEST);
      } catch (error) {
        console.error(`[${config.userData.name}] Error going back to Store page: ${error}`);
        errorFlag.push({
          failed: true,
          message: `Error going back to Store page for ${config.userData.name} - ${row.store}\nError: ${error}\n\n`,
        });
      }
      console.log(
        `[${config.userData.name}] Returned to Store page after store: ${row.store}`
      );
    }
    
    // Ensure all operations are complete before handling errors
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500); // Small delay to ensure all operations complete
    
    // Log test completion and handle all collected errors
    TestHelpers.logTestComplete(config.userData.name, 'Store SPIFF Breakdown');
    await TestHelpers.handleErrors(errorFlag, 'Store SPIFF Breakdown');
  }
}

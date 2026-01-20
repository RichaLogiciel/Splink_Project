const {
  parseCurrency,
  saveScreenshot,
  waitForPageLoad,
  softExpectWithScreenshot,
} = require('../../utils/helper');
import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import ProgramPage from '../../pages/distributor-admin/ProgramPage';
import StoreProgramDetailPage from '../../pages/distributor-admin/StoreProgramDetailPage';
import SuperAdminUsersTable from '../../pages/SuperAdminUsersTable';
import {
  ENTITY_TYPE,
  MANUFACTURER_TO_SKIP,
  MAX_STORES_TO_TEST,
} from '../../utils/constant';
import { distributorMap, manufacturerMap } from '../../utils/userMap';

const ManufacturerToSkip = MANUFACTURER_TO_SKIP;

// Helper to load JSON for a distributor
function loadDistributorJson(jsonPath) {
  const outputJsonPath = path.resolve(__dirname, `../../json/${jsonPath}`);
  return JSON.parse(fs.readFileSync(outputJsonPath, 'utf-8'));
}

distributorMap.forEach((distributor, distributorKey) => {
  // if (distributor.name !== 'Pitco') return;

  test.describe(`Store Program Detail: ${distributor.name}`, () => {
    let programPage;
    let usersTable;
    let detailPage;
    let outputData;

    test.beforeEach(async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Runs only on Chrome');

      // Set larger viewport for all browsers
      await page.setViewportSize({ width: 1920, height: 1080 });

      programPage = new ProgramPage(page);
      usersTable = new SuperAdminUsersTable(page);
      detailPage = new StoreProgramDetailPage(page);

      // Impersonate distributor
      await usersTable.impersonateUser(
        ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        distributorKey,
        {
          manufacturerMap,
          distributorMap,
        }
      );
      await softExpectWithScreenshot(
        page,
        () => expect.soft(page).toHaveURL(/app/),
        `Expected to be on the app page after impersonation, but was not.`
      );
      await page.waitForLoadState('networkidle');
      // Navigate to Programs page
      await programPage.navigateToPrograms();
      await programPage.switchToStorePrograms();
      await page.waitForSelector(programPage.selectors.programCard, {
        state: 'visible',
        timeout: 3000,
      });
      await softExpectWithScreenshot(
        page,
        () => expect.soft(page).toHaveURL('app/programs/store'),
        'Expected to be on the Store Programs page after navigation, but was not.'
      );
      await page.waitForLoadState('networkidle');
      // Load the correct JSON for this distributor
      outputData = loadDistributorJson(distributor.jsonPath);
    });

    // This test verifies the Retailer Program Detail page for each program.
    // It checks:
    // - That the retailer program breakdown table is visible for each program.
    // - That the total number of stores in each retailer row matches the dashboard's total.
    // - That clicking a retailer row opens a modal with correct title (type and rebate), rebate value, and compliance status.
    // - That the modal can be closed and is no longer visible after closing.
    // The test only runs on Chromium (Chrome).
    test('Overview Tab: Retailer Program for each program', async ({
      page,
      browserName,
    }) => {
      test.skip(browserName !== 'chromium', 'Runs only on Chrome');

      programPage = new ProgramPage(page);
      await programPage.switchToStorePrograms();
      await page.waitForSelector(programPage.selectors.programCard, {
        state: 'visible',
        timeout: 30000,
      });
      await page.waitForLoadState('networkidle');
      const allPrograms = await programPage.getProgramCards();

      for (let i = 0; i < allPrograms.length; i++) {
        const program = await programPage.getProgramByIndex(i);
        console.log(
          `================= Page Started for: ${program.manufacturerName} ==================`
        );

        // Click on first program
        await programPage.clickProgram(i);
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        await page.waitForTimeout(3000);

        await softExpectWithScreenshot(
          page,
          () =>
            expect
              .soft(
                page.locator(detailPage.selectors.storeRetailerProgramTable)
              )
              .toBeVisible(),
          'Expected Retailer Program Breakdown table to be visible'
        );

        // Validate retailer program breakdown
        const retailerBreakdown =
          await detailPage.getStoreRetailerProgramBreakdown();
        const storesEnrolled = await detailPage.getStoresEnrolled();
        const salesVolume = await detailPage.getSalesVolume();
        const estEarnings = await detailPage.getEstimateStoreEarnings();

        const [enrolledStores, totalStores] = storesEnrolled
          .split('/')
          .map((el) => Number(el.replace(/[^0-9]/g, '') || 0));
        console.log(
          `Total Stores: ${storesEnrolled}, Enrolled Stores: ${enrolledStores}, Total Stores: ${totalStores}`
        );

        // Compare Estimate Earnning with Program overview
        expect(estEarnings).toBe(
          program.estimatedEarnings,
          `Expected Est Earnings: ${program.estimatedEarnings}, Actual Est Earnings: ${estEarnings} not matching for Distributor: ${distributor.name} and Manufacturer: ${program.manufacturerName}`
        );

        // Compare Sales Volume with Program overview
        expect(salesVolume).toBe(
          program.purchaseVolume,
          `Expected Sales Volume: ${program.purchaseVolume}, Actual Sales Volume: ${salesVolume} not matching for Distributor: ${distributor.name} and Manufacturer: ${program.manufacturerName}`
        );

        for (let i = 0; i < retailerBreakdown.length; i++) {
          const retailer = retailerBreakdown[i];
          if (retailer == null) continue;
          const row = page.locator(
            `${detailPage.selectors.storeRetailerProgramRow}:nth-child(${
              i + 1
            })`,
            { timeout: 1000 }
          );

          const totalStoresInRow = retailer.storesCompliance.total;

          if (totalStoresInRow != totalStores) {
            const screenshot = await saveScreenshot(
              page,
              `total-stores-not-matching-${distributor.name}-${program.manufacturerName}-${retailer.type}`
            );
            await softExpectWithScreenshot(
              page,
              () => expect.soft(totalStoresInRow).toBe(totalStores),
              `Total stores in row should match total stores from dashboard card for ${distributor.name} - ${program.manufacturerName} - ${retailer.type}\nTotal Stores in Row: ${totalStoresInRow} | Total Stores from Dashboard Card: ${totalStores}\nScreenshot: ${screenshot}\n\n`
            );
          }

          console.log(
            `Total Stores for current row: ${totalStoresInRow}, Total Stores from Dashboard Card: ${totalStores} for ${distributor.name} - ${program.manufacturerName} - ${retailer.type}`
          );

          const classAttr = await row.getAttribute('class');
          if (classAttr && classAttr.includes('cursor-pointer')) {
            await row.click();

            await softExpectWithScreenshot(
              page,
              () =>
                expect
                  .soft(page.locator(detailPage.selectors.storeRpm))
                  .toBeVisible(),
              `Expected Retailer Program Modal to be visible after clicking row for ${distributor.name} - ${program.manufacturerName} - ${retailer.type}`
            );

            // Validate title (should contain type and rebate percentage)
            const title = await page
              .locator(detailPage.selectors.storeRpmTitle)
              .textContent();

            // Example: "Core Distribution (5.00%)"
            const expectedRebate = retailer.rebate
              .replace(/[^0-9.]/g, '')
              .trim();
            const expectedTitle = retailer.rebate.includes('%')
              ? `${retailer.type} (${expectedRebate}%)`
              : `${retailer.type} ($${expectedRebate})`;

            console.log(
              `Retailer Modal Title: ${title}, Expected: ${expectedTitle}`
            );

            await softExpectWithScreenshot(
              page,
              () => expect.soft(title).toContain(retailer.type),
              'Retailer type should match in modal title'
            );

            await softExpectWithScreenshot(
              page,
              () => expect.soft(title).toContain(expectedRebate),
              'Retailer rebate should match in modal title'
            );

            const rebate = await page
              .locator(detailPage.selectors.storeRpmRebate)
              .textContent();

            await softExpectWithScreenshot(
              page,
              () => expect.soft(rebate).toBe(retailer.rebate),
              'Expected rebate to match retailer rebate'
            );

            console.log(
              `Modal Rebate: ${rebate}, Expected Rebate: ${retailer.rebate}`
            );

            const complianceStatus = (
              await page
                .locator(detailPage.selectors.storeRpmComplianceStatus)
                .textContent()
            )?.replaceAll(',', '');

            await softExpectWithScreenshot(
              page,
              () =>
                expect
                  .soft(complianceStatus)
                  .toBe(
                    `${retailer.storesCompliance.enrolled}/${retailer.storesCompliance.total}`
                  ),
              'Expected compliance status to match enrolled/total stores'
            );
            console.log(`Modal Compliance Status: ${complianceStatus}`);

            await page.locator(detailPage.selectors.storeRpmClose).click();
            await softExpectWithScreenshot(
              page,
              () =>
                expect
                  .soft(page.locator(detailPage.selectors.storeRpm))
                  .not.toBeVisible(),
              'Expected Retailer Program Modal to be closed after clicking close button'
            );
          }
        }

        console.log('================= Page Completed ==================');
        await page
          .locator(detailPage.selectors.backButton, { timeout: 1000 })
          .click();
      }
    });

    // This test (currently skipped) verifies that the enrolled stores for each store program are displayed correctly,
    // including pagination and tier information. It navigates through all available store programs, enters each program's
    // detail page, switches to the "Stores" tab, and checks that the enrolled stores table is visible. It then logs all
    // store rows data for further inspection. The test ensures that the UI correctly loads and displays enrolled stores
    // and their associated tiers for each program, validating both navigation and data presentation aspects.
    test('Enrolled Stores and Stores Not Enrolled Tab: Test and verify each store modal and its tier', async ({
      page,
      browserName,
    }) => {
      test.skip(browserName !== 'chromium', 'Runs only on Chrome');

      test.setTimeout(4000000); // 66 minutes timeout

      programPage = new ProgramPage(page);
      await programPage.switchToStorePrograms();
      await page.waitForSelector(programPage.selectors.programCard, {
        state: 'visible',
        timeout: 30000,
      });
      await page.waitForLoadState('networkidle');
      const allPrograms = await programPage.getProgramCards();

      // Store Programs by Manufacturer
      for (let i = 0; i < allPrograms.length; i++) {
        const program = await programPage.getProgramByIndex(i);
        if (
          ManufacturerToSkip.some((skipName) =>
            program.manufacturerName
              .toLowerCase()
              .includes(skipName.toLowerCase())
          )
        ) {
          console.log(
            `Skipping ${distributor.name} - ${program.manufacturerName} as it is in the skip list`
          );
          continue;
        }
        console.log(
          `================= Page Started for: ${distributor.name} - ${program.manufacturerName} ==================`
        );

        // Click on first program
        await programPage.clickProgram(i);
        // Wait up to 30 seconds for network to be idle
        try {
          await page.waitForLoadState('networkidle', {
            timeout: 30000,
          });
          await page.waitForSelector(detailPage.selectors.allTabs, {
            state: 'visible',
            timeout: 30000,
          });
        } catch (error) {
          console.log(
            '////////////////// Store Detail Page Response timeout - continuing with test ////////////////// '
          );
        }

        // Move to Enrolled and Not Enrolled Stores Tab
        const tabs = await page.locator(detailPage.selectors.allTabs).all();
        for (const tab of tabs) {
          let isTabEnabled = false;
          const tabText = await tab.textContent();
          if (tabText.includes('Overview')) continue;
          if (tabText.includes('Stores')) {
            await tab.click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(300);
            isTabEnabled = true;
            console.log(
              `---------------- Switched to Stores tab for ${distributor.name} - ${program.manufacturerName} ----------------`
            );
          }

          if (tabText.includes('Stores Not Enrolled')) {
            await tab.click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(300);
            isTabEnabled = true;
            console.log(
              `---------------- Switched to Stores Not Enrolled tab for ${distributor.name} - ${program.manufacturerName} ----------------`
            );
          }

          if (!isTabEnabled) {
            await saveScreenshot(page, 'stores-tab-not-found');
            console.error(
              `Stores or Stores Not Enrolled tab not found for ${distributor.name} - ${program.manufacturerName}`
            );
            expect
              .soft(page.locator(detailPage.selectors.allTabs))
              .toBeVisible();
            // throw new Error('Stores tab not found');
          }

          // Check that the store table is visible

          await softExpectWithScreenshot(
            page,
            () =>
              expect
                .soft(page.locator(detailPage.selectors.storeTable))
                .toBeVisible(),
            'Expected Store Table to be visible'
          );
          await page.waitForTimeout(500);

          // Click on the "Estimated Earnings" heading to sort the table
          const heading = page.locator(
            `${detailPage.selectors.storeTable} th`,
            {
              hasText: 'Store Earnings',
              timeout: 200,
            }
          );
          await heading.click();
          try {
            await page.waitForLoadState('networkidle', {
              timeout: 5000,
            });
          } catch (error) {
            console.log(
              'Store Details Modal Response timeout - continuing with test'
            );
          }
          await page.waitForTimeout(2000);

          // Get all Sorted Stores as an Array
          const rows = await detailPage.getAllStoresData();
          const maxStores =
            rows.length > MAX_STORES_TO_TEST ? MAX_STORES_TO_TEST : rows.length;
          console.log(
            `For ${distributor.name} - ${program.manufacturerName} | Max Stores to Test: ${maxStores} | Total Stores: ${rows.length}`
          );
          for (let i = 0; i < maxStores; i++) {
            const row = rows[i];

            // Run for Maximum 5 Stores
            // if (i >= 5) break;

            // Skip if the row is null
            if (
              row == null ||
              row.store?.includes(
                'There are no stores currently signed up for this program'
              )
            ) {
              continue;
            }
            console.log(
              `---------------- Working on ${distributor.name} - ${program.manufacturerName} Store: ${row.store} ----------------`
            );
            // Get the current Store Row
            const currentRow = page.locator(
              `${detailPage.selectors.storeRow}:nth-child(${i + 1})`
            );
            await currentRow.click();
            try {
              await page.waitForLoadState('networkidle', {
                timeout: 5000,
              });
            } catch (error) {
              console.log('Response timeout - continuing with test');
            }
            // Wait till animation is complete
            await page.waitForTimeout(1200);

            // Verify Estimated Earnings
            const estEarnings =
              await detailPage.getStoreDetailsModalEstEarnings();
            const expectedEstEarnings = parseCurrency(row.earnedEarnings);
            console.log(
              `Estimated Earnings: $${estEarnings} | Expected: $${expectedEstEarnings}`
            );
            await softExpectWithScreenshot(
              page,
              () => expect.soft(estEarnings).toBe(expectedEstEarnings),
              'Expected Estimated Earnings to match the row value'
            );

            // Verify Completed Skus in Store Details Modal
            const isCompletedSkus =
              await detailPage.matchCompletedSkusTiersInStoreDetailsModal();
            if (
              isCompletedSkus === false ||
              isCompletedSkus != row.programCompliance.completed
            ) {
              console.log(
                `Completed Skus: ${isCompletedSkus} | Expected: ${row.programCompliance.completed}`
              );
              const screenshot = await saveScreenshot(
                page,
                `completed-skus-not-matching-${row.store}`
              );
              await softExpectWithScreenshot(
                page,
                () =>
                  expect
                    .soft(isCompletedSkus)
                    .toBe(row.programCompliance.completed),
                `Completed Skus are not matching for ${distributor.name} - ${program.manufacturerName} Store: ${row.store} tier: ${row.tier} | Completed Skus: ${isCompletedSkus} | Expected: ${row.programCompliance.completed}\nScreenshot: ${screenshot}`
              );
            }

            // Verify Completed Tiers
            const allTiersNumbs =
              await detailPage.getStoreDetailsModalAllTiers();
            console.log(
              `[From Table Row] All Tiers: ${row.programCompliance.total} | Compliances Tiers: ${row.programCompliance.completed}`
            );
            console.log(
              `[From Store Details Modal] All Tiers: ${allTiersNumbs.all} | Modal Passed Compliances: ${allTiersNumbs.completed}`
            );

            await softExpectWithScreenshot(
              page,
              () =>
                expect
                  .soft(allTiersNumbs.all)
                  .toBe(row.programCompliance.total),
              'Expected total tiers in the modal to match the total tiers in the row'
            );

            await softExpectWithScreenshot(
              page,
              () =>
                expect
                  .soft(allTiersNumbs.completed)
                  .toBe(row.programCompliance.completed),
              'Expected completed tiers in the modal to match the completed tiers in the row'
            );

            await softExpectWithScreenshot(
              page,
              () =>
                expect
                  .soft(allTiersNumbs.all - allTiersNumbs.completed)
                  .toBe(
                    row.programCompliance.total -
                      row.programCompliance.completed
                  ),
              'Expected pending tiers in the modal to match the pending tiers in the row'
            );

            // Verify Tier SKU
            const tierElements = await page
              .locator(detailPage.selectors.SD_Tiers)
              .all();
            let crossVerifyingCompletedTiers = 0;
            let crossVerifyingPendingTiers = 0;
            for (const tier of tierElements) {
              const tierTitle = await tier
                .locator(
                  'span.font-medium.text-sm.text-highlighted-color.min-h-7'
                )
                .textContent();
              await tier.locator(detailPage.selectors.SD_TierSKU).waitFor({
                state: 'visible',
                timeout: 2000,
              });
              const tierElement = tier.locator(detailPage.selectors.SD_TierSKU);
              if (!(await tierElement.isVisible())) {
                console.log(
                  'Skipping Tier as it does not have SKU Category Type:',
                  tierTitle
                );
                crossVerifyingPendingTiers++;
                continue;
              }

              const tierText = await tierElement.textContent();
              const [completedSKU, totalSKU] = tierText
                .split('/')
                .map((el) => Number(el.replace(/[^0-9]/g, '') || 0));
              completedSKU === totalSKU
                ? crossVerifyingCompletedTiers++
                : crossVerifyingPendingTiers++;

              console.log(
                `Tier: ${tierTitle} | Tier Progress Track: ${completedSKU}/${totalSKU}`
              );

              // Open the Tier Details Modal
              await tier.click();
              console.log('Clicked on Tier:', tierTitle);
              await page.waitForLoadState('networkidle', {
                timeout: 7000,
              });

              /*
               * Start Verifying the Tier Details Modal
               */
              // Click on the "Purchased" checkbox
              await waitForPageLoad({
                page: page,
                timeout: 7000,
                errorMessage: 'Purchased Checkbox not found, skipping...',
              });
              try {
                await page.waitForSelector(
                  detailPage.selectors.TD_PurchasedCheckbox,
                  { timeout: 7000 }
                );
              } catch (error) {
                console.log('Purchased Checkbox not found, skipping...');
              }
              await page.waitForTimeout(750);

              const isPurchasedCheckboxVisible = await page
                .locator(detailPage.selectors.TD_PurchasedCheckbox)
                .isVisible();
              console.log(
                'Purchased Checkbox is visible:',
                isPurchasedCheckboxVisible
              );
              if (isPurchasedCheckboxVisible) {
                await page
                  .locator(detailPage.selectors.TD_PurchasedCheckbox)
                  .click();
                await page.waitForTimeout(100);
              }

              // Verify that the current tier title matches the tier title
              const currentTierTitle = await page
                .locator(
                  '.flex.flex-col.gap-1.text-medium.text-highlighted-color.mb-6 p.font-semibold.text-lg'
                )
                .textContent();

              await softExpectWithScreenshot(
                page,
                () => expect.soft(currentTierTitle).toBe(tierTitle),
                'Expected Tier Title to match the current tier title'
              );

              // Get All The SKU Category
              const skuCategory = await page
                .locator(detailPage.selectors.TD_TierSKU)
                .all();
              console.log(
                'Number of SKU Category in a Tier:',
                skuCategory.length
              );

              // Verify the SKU Category
              for (const category of skuCategory) {
                const categoryText = await category.textContent();
                const [completed, total] = categoryText
                  .split(' ')[0]
                  .split('/')
                  .map((el) => Number(el.replace(/[^0-9]/g, '') || 0));
                let categoryName = categoryText.split(' ').slice(1).join(' ');
                // SKipping Flex category Name change because it's already flex
                // categoryName =
                //   categoryName == 'Flex' ? 'Recommended Flex' : categoryName;

                // Click on the category
                const categoryTabBtn = page.getByRole('button', {
                  name: categoryName,
                  exact: true,
                });
                if (await categoryTabBtn.isVisible()) {
                  await categoryTabBtn.click();
                } else {
                  console.error(
                    `Category Tab Button is not visible for ${distributor.name} - ${program.manufacturerName} Store: ${row.store} - ${categoryName}`
                  );
                  if (isPurchasedCheckboxVisible) {
                    // If the category tab button is not visible, log the error and take a screenshot
                    await saveScreenshot(
                      page,
                      `category-tab-button-not-visible-${categoryName}`
                    );
                    await softExpectWithScreenshot(
                      page,
                      () =>
                        expect
                          .soft(
                            categoryTabBtn,
                            `Category Tab Button for ${categoryName} is not visible`
                          )
                          .toBeVisible(),
                      'Expected Tier Title to match the current tier title'
                    );
                  }
                }
                await page.waitForTimeout(100); // Wait for table to load (adjust as needed)

                if (isPurchasedCheckboxVisible) {
                  const purchasedSkus = await page
                    .locator(
                      '#tier-detail-modal .customTabs .tab-panel:visible table.w-full.border-collapse.table-fixed tbody tr.border-b.border-border-gray'
                    )
                    .count();

                  console.log(
                    `Category: ${categoryName} | Tier Progress Track: ${completed}/${total} | Purchased Products: ${purchasedSkus}`
                  );
                  await softExpectWithScreenshot(
                    page,
                    () =>
                      expect
                        .soft(purchasedSkus)
                        .toBeGreaterThanOrEqual(completed),
                    `Expected number of purchased products to be greater than or equal to completed SKUs for Category: ${categoryName} | Tier Progress Track: ${completed}/${total} | Purchased Products: ${purchasedSkus} for Distributor: ${distributor.name} - ${program.manufacturerName} Store: ${row.store}`
                  );
                } else {
                  console.error(
                    `Purchased Checkbox is not visible, Category: ${categoryName} | Tier Progress Track: ${completed}/${total} for Distributor: ${distributor.name} - ${program.manufacturerName} Store: ${row.store}`
                  );
                }
              }

              // Back to the Store Details Modal
              await page
                .locator(detailPage.selectors.TD_ModalBackButton)
                .click();
              console.log(`Tier Finished: ${tierTitle}`);
            }

            // Verify that the number of completed tiers matches the number of completed tiers in the row
            await softExpectWithScreenshot(
              page,
              () =>
                expect
                  .soft(crossVerifyingCompletedTiers)
                  .toBe(row.programCompliance.completed),
              `Completed Tiers should match the completed tiers in the row for Distributor: ${distributor.name} - ${program.manufacturerName} Store: ${row.store}`
            );

            // Verify that the number of pending tiers matches the number of total tiers minus the number of completed tiers
            await softExpectWithScreenshot(
              page,
              () =>
                expect
                  .soft(crossVerifyingPendingTiers)
                  .toBe(
                    row.programCompliance.total -
                      row.programCompliance.completed
                  ),
              `Pending Tiers should match the total tiers minus completed tiers for Distributor: ${distributor.name} - ${program.manufacturerName} Store: ${row.store}`
            );

            // Close the Store Details Modal
            await page.locator(detailPage.selectors.SD_ModalClose).click();
          }
          console.log(
            `================= Page Completed for: ${distributor.name} - ${program.manufacturerName} ==================`
          );
        }

        await page.locator(detailPage.selectors.backButton).click();
      }
    });
  });
});

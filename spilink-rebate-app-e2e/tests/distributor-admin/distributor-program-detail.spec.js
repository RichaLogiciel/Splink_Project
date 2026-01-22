import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import DistributorProgramDetailPage from '../../pages/distributor-admin/DistributorProgramDetailPage';
import ProgramPage from '../../pages/distributor-admin/ProgramPage';
import SuperAdminUsersTable from '../../pages/SuperAdminUsersTable';
import { ENTITY_TYPE } from '../../utils/constant';
import { saveScreenshot } from '../../utils/helper';
import { distributorMap, manufacturerMap } from '../../utils/userMap';
import { TestHelpers } from '../shared/utils/TestHelpers';

// Helper to load JSON for a distributor
function loadDistributorJson(jsonPath) {
  const outputJsonPath = path.resolve(__dirname, `../../json/${jsonPath}`);
  return JSON.parse(fs.readFileSync(outputJsonPath, 'utf-8'));
}

distributorMap.forEach((distributor, distributorKey) => {
  test.describe(`Distributor Program Detail: ${distributor.name}`, () => {
    let programPage;
    let usersTable;
    let detailPage;
    let outputData;

    test.beforeEach(async ({ page }) => {
      programPage = new ProgramPage(page);
      usersTable = new SuperAdminUsersTable(page);
      detailPage = new DistributorProgramDetailPage(page);

      // Impersonate distributor
      await usersTable.impersonateUser(
        ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        distributorKey,
        {
          manufacturerMap,
          distributorMap,
        }
      );
      await expect(page).toHaveURL(/app/);
      await page.waitForLoadState('networkidle');
      // Navigate to Programs page
      await programPage.navigateToPrograms();
      await expect(page).toHaveURL(/programs/);

      // Load the correct JSON for this distributor
      outputData = loadDistributorJson(distributor.jsonPath);
    });

    test('Verify Purchase Volume & Estimated Earnings along with Category SKUs purchases', async ({
      page,
    }) => {
      const errorFlag = [];
      TestHelpers.logTestStart(
        distributor.name,
        'Distributor Program Detail Test'
      );

      programPage = new ProgramPage(page);
      await programPage.switchToDistributorPrograms();
      await programPage.changeProgramTimeline();

      const allPrograms = await programPage.getProgramCards();

      for (let i = 0; i < allPrograms.length; i++) {
        const program = await programPage.getProgramByIndex(i);
        // Click on first program
        await programPage.clickProgram(i);

        let estimatedEarnings = 0;
        let purchaseVolume = 0;

        // Check if purchase volume is visible
        const isPurchaseVolumeVisible = page
          .locator(detailPage.selectors.purchaseVolume)
          .isVisible();
        // Check if estimated earnings is visible
        const isEstimatedEarningsVisible = page
          .locator(detailPage.selectors.estimatedEarnings)
          .isVisible();

        if (isEstimatedEarningsVisible) {
          console.log('Estimated Earnings is visible');
          estimatedEarnings = await detailPage.getEstimatedEarnings();
        }
        if (isPurchaseVolumeVisible) {
          purchaseVolume = await detailPage.getPurchaseVolume();
        }
        // Compare purchase volume and estimated earnings from Program List
        console.log(
          `For ${distributor.name} and Manufacturer: ${program.manufacturerName}\nPurchase Volume Validation - Expected: ${program.purchaseVolume}, Actual: ${purchaseVolume}`
        );
        if (purchaseVolume !== program.purchaseVolume) {
          const screenshot = await TestHelpers.takeScreenshot(
            page,
            `purchase-volume-not-matching`,
            `${distributor.name?.replace(
              / /g,
              '-'
            )}-${program.manufacturerName?.replace(/ /g, '-')}`
          );
          errorFlag.push({
            failed: true,
            message: `For ${distributor.name} and Manufacturer: ${program.manufacturerName}\nExpected Purchase Volume: ${program.purchaseVolume}, Actual Purchase Volume: ${purchaseVolume} not matching\nScreenshot: ${screenshot}\n\n`,
          });
        }

        console.log(
          `For ${distributor.name} and Manufacturer: ${program.manufacturerName}\nEstimated Earnings Validation - Expected: ${program.estimatedEarnings}, Actual: ${estimatedEarnings}`
        );
        if (estimatedEarnings !== program.estimatedEarnings) {
          const screenshot = await TestHelpers.takeScreenshot(
            page,
            `estimated-earnings-not-matching`,
            `${distributor.name?.replace(
              / /g,
              '-'
            )}-${program.manufacturerName?.replace(/ /g, '-')}`
          );
          errorFlag.push({
            failed: true,
            message: `For ${distributor.name} and Manufacturer: ${program.manufacturerName}\nExpected Estimated Earnings: ${program.estimatedEarnings}, Actual Estimated Earnings: ${estimatedEarnings} not matching\nScreenshot: ${screenshot}\n\n`,
          });
        }

        // Validate distributor program details table
        const details = await detailPage.getDistributorProgramDetails();
        if (details.length === 0) {
          const screenshot = await TestHelpers.takeScreenshot(
            page,
            `distributor-program-details-empty`,
            `${distributor.name?.replace(
              / /g,
              '-'
            )}-${program.manufacturerName?.replace(/ /g, '-')}`
          );
          errorFlag.push({
            failed: true,
            message: `For ${distributor.name} and Manufacturer: ${program.manufacturerName}\nExpected distributor program details to have at least one entry, but found ${details.length}\nScreenshot: ${screenshot}\n\n`,
          });
        }

        // Validate distributor program details table
        for (const detail of details) {
          if (detail == null) continue;
          const row = page.locator(
            `${detailPage.selectors.distributorProgramRow}:has-text("${detail.type}")`
          );
          const classAttr = await row.getAttribute('class');
          // TEMPORARY DISABLED UNTIL WE CREATE TEST FOR OUTGROWTH
          // if (classAttr && classAttr.includes('cursor-pointer')) {
          //   await row.click();
          //   await expect(page.locator(detailPage.selectors.dpm)).toBeVisible();

          //   // Validate title
          //   const title = await page
          //     .locator(detailPage.selectors.dpmTitle)
          //     .textContent();

          //   // Validate purchase volume and estimated earnings
          //   const purchaseVolume = parseCurrency(
          //     await page
          //       .locator(detailPage.selectors.dpmPurchaseVolume)
          //       .textContent()
          //   );
          //   const estimatedEarnings = parseCurrency(
          //     await page
          //       .locator(detailPage.selectors.dpmEstimateSavings)
          //       .textContent()
          //   );
          //   console.log(
          //     `Modal Title: ${title}, Modal Purchase Volume: ${purchaseVolume}, Expected Purchase Volume: ${program.purchaseVolume}`
          //   );
          //   expect(purchaseVolume).toBeGreaterThanOrEqual(
          //     program.purchaseVolume
          //   );

          //   const showPurchasedCheckbox = page.locator(
          //     detailPage.selectors.dpmCheckbox
          //   );
          //   if (!(await showPurchasedCheckbox.isVisible())) {
          //     const screenshot = await saveScreenshot(
          //       page,
          //       `show-purchased-checkbox-not-visible-${distributor.name}-${program.manufacturerName}-${title}`
          //     );
          //     console.error(
          //       `Distributor: ${distributor.name} - Manufacturer: ${program.manufacturerName} - Program: ${title} - Purchased checkbox is not visible\nScreenshot: ${screenshot}\n\n`
          //     );
          //     await page.locator(detailPage.selectors.dpmClose).click();
          //     continue;
          //   }

          //   // Click on Show Purchased checkbox
          //   await showPurchasedCheckbox.click();
          //   // Verify Progress Track, Earnings, and Product Count dynamically
          //   const progressCategories = await detailPage.getProgressTrack();
          //   console.log(
          //     `Distributor: ${distributor.name} Manufacturer: ${program.manufacturerName} Program: ${title}`
          //   );

          //   // Progress Track Categories Loop
          //   let totalCompleted = 0;
          //   for (let i = 0; i < progressCategories.length; i++) {
          //     const category = progressCategories[i];
          //     const categoryText = await category.textContent();
          //     console.log(`Current Category: ${categoryText}`);
          //     const [completed, total] = categoryText
          //       .split(' ')[0]
          //       .split('/')
          //       .map((el) => Number(el.replace(/[^0-9]/g, '') || 0));
          //     let categoryName = await category.locator('span').textContent();
          //     categoryName = getCategoryDisplayName(categoryName);

          //     // Try to click the category tab button
          //     try {
          //       // First attempt: Find by role with exact name
          //       let categoryTabBtn = page.getByRole('button', {
          //         name: categoryName,
          //       });

          //       // If multiple buttons found, use the specific selector
          //       if ((await categoryTabBtn.count()) > 1) {
          //         categoryTabBtn = page.locator(
          //           `${detailPage.selectors.dpmProductTab}:nth-child(${i + 1})`
          //         );
          //       }

          //       // Validate button visibility
          //       if (!(await categoryTabBtn.isVisible())) {
          //         throw new Error(
          //           `Category Tab Button not visible for ${distributor.name} - ${program.manufacturerName} - ${title}\nCategory: ${categoryName}`
          //         );
          //       }

          //       // Validate button text content
          //       const buttonText = await categoryTabBtn.textContent();
          //       if (!buttonText?.includes(categoryName)) {
          //         throw new Error(
          //           `Category Tab Button text mismatch: "${buttonText}" does not contain "${categoryName}"`
          //         );
          //       }

          //       // Click the button
          //       await categoryTabBtn.click();
          //       totalCompleted += completed;
          //     } catch (error) {
          //       const screenshot = await saveScreenshot(
          //         page,
          //         `error-clicking-category-tab-${categoryName}`
          //       );
          //       await softExpectWithScreenshot(
          //         page,
          //         () => expect.soft(categoryTabBtn).toBeVisible(),
          //         `Error clicking category tab "${categoryName}": ${error.message}\nScreenshot: ${screenshot}\n\n`
          //       );
          //       continue;
          //     }
          //   }

          //   // If no categories are completed but estimated earnings is greater than 0, then it is an error
          //   if (totalCompleted == 0 && estimatedEarnings > 0) {
          //     const screenshot = await saveScreenshot(
          //       page,
          //       `estimated-earnings-not-zero-${distributor.name}-${program.manufacturerName}`
          //     );
          //     await softExpectWithScreenshot(
          //       page,
          //       () => expect.soft(totalCompleted).toBeGreaterThan(0),
          //       `Distributor: ${distributor.name} Manufacturer: ${program.manufacturerName} Program: ${title} - Estimated Earnings: ${estimatedEarnings} > 0 but no categories are completed\nScreenshot: ${screenshot}\n\n`
          //     );
          //   }

          //   // Close the modal
          //   await page.locator(detailPage.selectors.dpmClose).click();

          //   await expect(
          //     page.locator(detailPage.selectors.dpm)
          //   ).not.toBeVisible();
          // }
        }

        await programPage.navigateToPrograms();
      }

      TestHelpers.logTestComplete(
        distributor.name,
        'Distributor Program Detail Test'
      );
      await TestHelpers.handleErrors(
        errorFlag,
        'Distributor Program Detail Test'
      );
    });

    test('Retailer Program - Product Breakdown: Verify each retailer program detail', async ({
      page,
    }) => {
      programPage = new ProgramPage(page);
      await programPage.switchToDistributorPrograms();
      await programPage.changeProgramTimeline();

      const allPrograms = await programPage.getProgramCards();

      for (let i = 0; i < allPrograms.length; i++) {
        if (allPrograms[i] == null) continue;
        // Click on first program
        await programPage.clickProgram(i);

        // Validate retailer program breakdown
        const retailerBreakdown =
          await detailPage.getRetailerProgramBreakdown();

        for (let i = 0; i < retailerBreakdown.length; i++) {
          const retailer = retailerBreakdown[i];
          if (retailer == null) continue;
          const row = page.locator(
            `${detailPage.selectors.retailerProgramRow}:nth-child(${i + 1})`
          );
          const classAttr = await row.getAttribute('class');
          if (classAttr && classAttr.includes('cursor-pointer')) {
            await row.click();
            await expect(page.locator(detailPage.selectors.rpm)).toBeVisible();

            // Get Manufacturer Name
            const ManufacturerName = await page
              .locator(detailPage.selectors.rpmManufacturer)
              .textContent();

            // Validate title (should contain type and rebate percentage)
            const title = await page
              .locator(detailPage.selectors.rpmTitle)
              .textContent();

            // Example: "Core Distribution (5.00%)"
            const expectedRebate = retailer.rebate.replace('%', '').trim();
            const expectedTitle = `${retailer.type} (${expectedRebate}%)`;

            console.log(
              `Retailer Modal Title: ${title}, Expected: ${expectedTitle}`
            );
            expect(title).toContain(retailer.type);
            expect(title).toContain(expectedRebate);

            // Initialize Total Purchased and Not Purchased Products
            let totalPurchasedProducts = 0;
            let totalNotPurchasedProducts = 0;

            // Total Products Can't be less than Purchased Products
            if (
              retailer.productsInWarehouse.total <
              retailer.productsInWarehouse.completed
            ) {
              const screenshot = await saveScreenshot(
                page,
                `total-products-less-than-completed-${distributor.name}-${ManufacturerName}-${title}`
              );
              console.error(
                `Distributor: ${distributor.name} - Manufacturer: ${ManufacturerName} - Program: ${title}\nTotal Products Can't be less than Purchased Products\nScreenshot: ${screenshot}\n\n`
              );
            }

            // Get Purchase Checkbox
            const purchaseCheckbox = page.locator(
              detailPage.selectors.rpmCheckbox
            );
            if (await purchaseCheckbox.isVisible()) {
              // Get All The Category Tab Button
              const categoryTabBtn = await page
                .locator(
                  detailPage.selectors.rpmProductTab +
                    ':not(:has-text("All Products"))'
                )
                .all();
              for (let i = 0; i < categoryTabBtn.length; i++) {
                const category = categoryTabBtn[i];
                await category.click();

                const categoryText = await category.textContent();
                console.log(`Category Text: ${categoryText}`);
                // Non Purchased Products
                const tableRow =
                  await detailPage.getRetailerProgramProductRows();

                totalNotPurchasedProducts += tableRow;

                // Now get Purchased products count
                await purchaseCheckbox.click();
                await category.click();
                const tableRowPurchased =
                  await detailPage.getRetailerProgramProductRows();
                totalPurchasedProducts += tableRowPurchased;

                console.log(
                  `Total Not Purchased Products: ${totalNotPurchasedProducts}, Total Purchased Products: ${totalPurchasedProducts}`
                );
              }
            } else {
              const screenshot = await saveScreenshot(
                page,
                `purchase-checkbox-not-visible-${distributor.name}-${ManufacturerName}-${title}`
              );
              console.error(
                `Distributor: ${distributor.name} - Manufacturer: ${ManufacturerName} - Program: ${title} - Purchase checkbox is not visible\nScreenshot: ${screenshot}\n\n`
              );
            }

            // Total Purchased Products Can't be less than Completed Products
            if (
              totalPurchasedProducts < retailer.productsInWarehouse.completed
            ) {
              const screenshot = await saveScreenshot(
                page,
                `total-purchased-products-less-than-completed-${distributor.name}-${ManufacturerName}-${title}`
              );
              console.error(
                `Distributor: ${distributor.name} - Manufacturer: ${ManufacturerName} - Program: ${title}\nTotal Purchased Products: ${totalPurchasedProducts} < Completed: ${retailer.productsInWarehouse.completed}\nScreenshot: ${screenshot}\n\n`
              );
            }

            // If Total Products is not equal to Completed Products, then Total Not Purchased Products Can't be greater than 0
            if (
              retailer.productsInWarehouse.completed !=
                retailer.productsInWarehouse.total &&
              totalNotPurchasedProducts > 0
            ) {
              const screenshot = await saveScreenshot(
                page,
                `total-not-purchased-products-greater-than-total-${distributor.name}-${ManufacturerName}-${title}`
              );
              console.error(
                `Distributor: ${distributor.name} - Manufacturer: ${ManufacturerName} - Program: ${title}\nTotal Not Purchased Products: ${totalNotPurchasedProducts} > Total: ${retailer.productsInWarehouse.total}\nScreenshot: ${screenshot}\n\n`
              );
            }

            console.log(
              `Total Purchased Products: ${totalPurchasedProducts}, Row Purchased: ${retailer.productsInWarehouse.completed}\nTotal Not Purchased Products: ${totalNotPurchasedProducts}, Row Not Purchased: ${retailer.productsInWarehouse.total}\nTotal Products: ${retailer.productsInWarehouse.total}, Completed Products: ${retailer.productsInWarehouse.completed}`
            );

            await page.locator(detailPage.selectors.rpmClose).click();
            await expect(
              page.locator(detailPage.selectors.rpm)
            ).not.toBeVisible();
          }
        }

        await programPage.navigateToPrograms();
      }
    });
  });
});

import { saveScreenshot, waitForPageLoad } from '../../../utils/helper';

export interface ErrorFlag {
  failed: boolean;
  message: string;
}

export class TestHelpers {
  static async handleErrors(errorFlag: ErrorFlag[], testName: string) {
    const failedCases = errorFlag.filter((error) => error.failed);
    if (failedCases.length > 0) {
      failedCases.forEach((error) => {
        console.error(`[${testName}] ${error.message}`);
      });
      throw new Error(
        `[${testName}] There are one or more failed cases. Check the console error for more details.`
      );
    } else {
      console.log(`[${testName}] No failed cases:`, errorFlag);
    }
  }

  static async takeScreenshot(
    page: any,
    name: string,
    userContext: string = ''
  ) {
    const screenshotName = userContext ? `${name}-${userContext}` : name;
    try {
      // Check if page is still open before taking screenshot
      // page.isClosed() is a method in Playwright
      if (page.isClosed && page.isClosed()) {
        console.log(
          `Warning: Page is closed, cannot take screenshot: ${screenshotName}`
        );
        return '';
      }
      return await saveScreenshot(page, screenshotName);
    } catch (error) {
      console.error(`Error taking screenshot ${screenshotName}: ${error}`);
      // Return empty string instead of throwing to prevent test from hanging
      return '';
    }
  }

  static async waitForPageLoad(
    page: any,
    errorMessage: string = 'Page load timeout'
  ) {
    await waitForPageLoad({
      page,
      errorMessage,
    });
  }

  static logTestStart(userName: string, testType: string) {
    console.log(`========= ${testType} Started for: ${userName} =========`);
  }

  static logTestComplete(userName: string, testType: string) {
    console.log(`========= ${testType} Completed for: ${userName} =========`);
  }

  static logStoreTest(storeName: string, userName: string) {
    console.log(
      `--------- Testing Store: ${storeName} for: ${userName} ---------`
    );
  }

  static logProgramTest(programName: string, userName: string) {
    console.log(
      `--------- Testing Program: ${programName} for: ${userName} ---------`
    );
  }

  // Open all closed accordions in the page
  static async openAllClosedAccordions(page: any) {
    const closedButtons = await page
      .locator(
        'button[id^="headlessui-disclosure-button-"][aria-expanded="false"]'
      )
      .elementHandles();
    for (const btn of closedButtons) {
      console.log('Accordion Button: ', await btn.textContent());
      console.log('Accordion Is Visible: ', await btn.isVisible());
      if (await btn.isVisible()) {
        console.log('Accordion Is Enabled: ', await btn.isEnabled());
        console.log('Clicking Accordion...');
        await btn.click();
        console.log(
          'Accordion Is Enabled After Click: ',
          await btn.isEnabled()
        );
      }
    }
    await page.waitForTimeout(250);
  }

  static async verifyStoreOrProgramTiers({
    page,
    row,
    program,
    config,
    storeDetailsPage,
    storeDetailModal,
    errorFlag,
    tierModalSelector,
    tierModalCloseSelector,
    tiersSelector,
    completedSkusCheck,
    tierChecks,
  }) {
    // Get manufacturer name with fallback
    const manufacturerName =
      program.manufacturerName ||
      program.manufacturer ||
      'Unknown Manufacturer';
    // Wait for loading icon to disappear, then for tiers to appear
    try {
      await page.waitForSelector(
        '.flex.justify-center.items-center.bg-gray-100.pointer-events-none',
        { state: 'detached', timeout: 10000 }
      );
    } catch {}
    await page.waitForSelector(tiersSelector, {
      state: 'visible',
      timeout: 10000,
    });
    await page.waitForTimeout(700); // Animation buffer

    // Work around for Store Breakdown and Store Detail Page
    // let programCompliance = { completed: 0, total: 0 };
    // const isStoreTableVisible = await page.locator('#store-table').isVisible();
    // if (isStoreTableVisible) {
    //   programCompliance = row.programCompliance;
    // } else {
    //   programCompliance = program.programCompliance;
    // }

    // Match Visual and Text Completed Skus if provided
    if (completedSkusCheck) {
      const { status: isCompletedSkus, message } = await completedSkusCheck();
      console.log(`program: ${JSON.stringify(program)}`);
      console.log(`row: ${JSON.stringify(row)}`);
      console.log(
        `Completed Skus Check: ${isCompletedSkus} for ${config.userData.name} - Manufacturer: ${manufacturerName} Store: ${row.store}`
      );
      console.log(`isCompletedSkus: ${isCompletedSkus}`);
      if (isCompletedSkus === false) {
        const screenshot = await TestHelpers.takeScreenshot(
          page,
          `issue-in-sku-matching`,
          `${config.userData.name}-${manufacturerName}-${row.store}-${row.tier}`
        );
        errorFlag.push({
          failed: true,
          message: `Message from completedSkusCheck: ${message}\nScreenshot: ${screenshot}\n\n`,
        });
      }
    }

    // For each tier, click and wait for Tier Detail Modal (API complete)
    const tierElements = await page.locator(tiersSelector).all();
    for (const tier of tierElements) {
      // Open all closed accordions after each tier
      console.log('Opening all closed accordions...');
      await TestHelpers.openAllClosedAccordions(page);
      console.log('All closed accordions opened...');
      // Tier title and progress
      const tierTitle = await tier
        .locator('span.font-medium.text-sm.text-highlighted-color.min-h-7')
        .textContent();
      await tier
        .locator('.recharts-wrapper svg text:first-of-type')
        .waitFor({ state: 'visible', timeout: 2000 });
      const tierProgress = await tier
        .locator('.recharts-wrapper svg text:first-of-type')
        .textContent();
      console.log(`Tier: ${tierTitle} | Tier Progress Track: ${tierProgress}`);
      // Try clicking and waiting for modal with retries
      let modalVisible = false;
      let attempts = 0;
      const maxAttempts = 1;

      while (!modalVisible && attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`Attempt ${attempts} - Clicking on Tier: ${tierTitle}`);

          // Ensure tier is visible and clickable
          await tier.waitFor({ state: 'visible', timeout: 5000 });
          await tier.click();

          // Wait for modal with a shorter timeout per attempt
          await page.waitForSelector(tierModalSelector, {
            state: 'visible',
            timeout: 15000,
          });

          modalVisible = true;
          console.log(`Successfully opened modal for Tier: ${tierTitle}`);
        } catch (error) {
          console.log(
            `Attempt ${attempts} failed for Tier: ${tierTitle} - ${error.message}`
          );
          if (attempts === maxAttempts) {
            // Take screenshot before throwing error
            const screenshot = await TestHelpers.takeScreenshot(
              page,
              `tier-modal-timeout`,
              `${config.userData.name}-${tierTitle}`
            );
            throw new Error(
              `Failed to open tier modal after ${maxAttempts} attempts for Tier: ${tierTitle}. Screenshot: ${screenshot}`
            );
          }
          // Wait before retry
          await page.waitForTimeout(350);
        }
      }

      // await page.waitForTimeout(700); // Animation buffer for modal

      // Purchased Checkbox
      let isPurchasedCheckboxVisible = false;
      try {
        isPurchasedCheckboxVisible = await page
          .locator('#tier-detail-modal .display-products-only-container')
          .isVisible();
      } catch {}
      console.log(
        `Purchased Checkbox is visible: ${isPurchasedCheckboxVisible}`
      );
      if (isPurchasedCheckboxVisible) {
        await page
          .locator('#tier-detail-modal .display-products-only-container')
          .click();
        await page.waitForTimeout(100);
        // CATEGORY-LEVEL CHECKS (only if checkbox is visible)
        const skuCategories = await page
          .locator('#tier-detail-modal #sku-title-card p.text-lg')
          .all();
        console.log(
          `Number of SKU Category in a Tier: ${skuCategories.length}`
        );
        for (const category of skuCategories) {
          const categoryText = await category.textContent();
          const [progress, ...catNameParts] = categoryText.split(' ');
          const [completed, total] = progress
            .split('/')
            .map((x) => Number(x.replace(/[^0-9]/g, '')));
          const categoryName = catNameParts.join(' ');
          let translatedCategoryName = categoryName;
          // SKipping Flex category Name change because it's already flex
          // if (categoryName === 'Flex')
          //   translatedCategoryName = 'Recommended Flex';
          if (categoryName === 'Core')
            translatedCategoryName = 'Core Wholesale';
          const categoryTabBtn = page.getByRole('button', {
            name: translatedCategoryName,
            exact: true,
          });
          if (await categoryTabBtn.isVisible()) {
            await categoryTabBtn.click();
            // Wait for the product table to update (wait for first row to be visible)
            await page.waitForSelector(
              '#tier-detail-modal .customTabs .tab-panel:visible table.w-full.border-collapse.table-fixed tbody tr',
              { state: 'visible', timeout: 2000 }
            );
          }
          await page.waitForTimeout(100);
          let purchasedSkus = 0;
          const purchasedSkusSelector = page.locator(
            '#tier-detail-modal .customTabs .tab-panel:visible table.w-full.border-collapse.table-fixed tbody tr.border-b.border-border-gray'
          );
          if ((await purchasedSkusSelector.count()) > 0) {
            purchasedSkus = await purchasedSkusSelector.count();
          } else {
            console.log(
              `Purchased skus selector is not visible for ${translatedCategoryName}`
            );
          }
          console.log(
            `Category: ${translatedCategoryName} | Tier Progress Track: ${completed}/${total} | Purchased Products: ${purchasedSkus}`
          );
          if (purchasedSkus < completed) {
            // Take screenshot for debugging
            const screenshot = await TestHelpers.takeScreenshot(
              page,
              `purchased-products-mismatch`,
              `${config.userData.name}-${manufacturerName}-${row.store}-${tierTitle}-${translatedCategoryName}`
            );
            errorFlag.push({
              failed: true,
              message: `Purchased products mismatch for ${config.userData.name} - ${manufacturerName} Store: ${row.store} Tier: ${tierTitle} Category: ${translatedCategoryName}. Expected at least: ${completed}, Actual: ${purchasedSkus}\nScreenshot: ${screenshot}\n\n`,
            });
          }
        }
      } else {
        // Handle Spend/Quantity Check
        const progressTrackEl = page.locator(
          '#tier-detail-modal #sku-title-card p.text-lg'
        );

        if (await progressTrackEl.isVisible()) {
          const progressTrack = await progressTrackEl.textContent();
          const [completed, total] = progressTrack
            .split('/')
            .map((x) => Number(x.replace(/[^0-9]/g, '')));
          console.log(`Progress Track: ${progressTrack}`);
          const [tierCompliance, tierTotal] = tierProgress
            .split('/')
            .map((x) => Number(x.replace(/[^0-9]/g, '')));

          if (completed != tierCompliance || total != tierTotal) {
            const screenshot = await TestHelpers.takeScreenshot(
              page,
              `progress-track-mismatch`,
              `${config.userData.name}-${manufacturerName}-${row.store}-${tierTitle}`
            );
            errorFlag.push({
              failed: true,
              message: `Progress Track mismatch for ${config.userData.name} - ${manufacturerName} Store: ${row.store} Tier: ${tierTitle}. Expected: ${tierCompliance}/${tierTotal}, Actual: ${completed}/${total}\nScreenshot: ${screenshot}\n\n`,
            });
          }
        } else {
          console.log(
            'Show Purchased Checkbox is not visible with no progress track, skipping category SKU purchased product checks for this tier.'
          );
        }
      }
      console.log(`Tier Finished: ${tierTitle}`);
      if (tierChecks) {
        await tierChecks(tier);
      }
      await page.locator(tierModalCloseSelector).click();
      await page.waitForTimeout(200);
    }
  }
}

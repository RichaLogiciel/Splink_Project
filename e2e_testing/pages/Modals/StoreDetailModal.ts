import { expect } from '@playwright/test';
import {
  parseCurrency,
  saveScreenshot,
  softExpectWithScreenshot,
  waitForPageLoad,
} from '../../utils/helper';
import { ProgramRow } from '../shared/StoreDetailsPageBase';

const BasePage = require('../BasePage');

class StoreDetailModal extends BasePage {
  constructor(page) {
    super(page);
    this.selectors = {
      // Store Details Modal
      storeModal: '#store-details-modal',
      storeTiers: '#store-tiers',

      // Price Selectors
      estimatedEarnings: '#estimated-earnings span > p.font-bold.text-lg',
      incrementalEarnings: '#incremental-earnings span > p.font-bold.text-lg',

      // Tier Selectors
      allTiers: '#store-tiers .cat-sku-card',
      completedTiers: 'path.recharts-sector.outline-none[fill="#106210"]',
      tierSKU: '.recharts-wrapper svg text:first-of-type',

      // Store Details Modal
      modalClose: '#store-details-modal img[alt="popupCloseIcon"]',

      // Tier Details Modal
      tierDetailModal: '#tier-detail-modal',
      tierDetailModalBackButton:
        '#tier-detail-modal img[alt="leftGreyArrowIcon"]',
      tierDetailModalSKU: '#tier-detail-modal #sku-title-card p.text-lg',
      tierDetailModalPurchasedCheckbox:
        '#tier-detail-modal .display-products-only-container',

      TD_Modal: '#tier-detail-modal',
      TD_ModalBackButton: '#tier-detail-modal img[alt="leftGreyArrowIcon"]',
      TD_TierSKU: '#tier-detail-modal #sku-title-card p.text-lg',
      TD_PurchasedCheckbox:
        '#tier-detail-modal .display-products-only-container',
    };
  }

  async getEstimatedEarnings() {
    return parseCurrency(
      await this.page.locator(this.selectors.estimatedEarnings).textContent()
    );
  }

  async getIncrementalEarnings() {
    const locator = this.page.locator(this.selectors.incrementalEarnings);
    if (!(await locator.isVisible())) {
      return 0;
    }
    const text = await locator.textContent();
    console.log(`Incremental Earnings Text: ${text}`);
    // Check if text is a negative value; if so, return negative, otherwise parse as currency
    if (
      typeof text === 'string' &&
      text.replace('$', '').trim().startsWith('-')
    ) {
      return -parseCurrency(text);
    }
    return parseCurrency(text);
  }

  async matchCompletedSkusTiersInStoreDetailsModal({
    loggedInUser = '',
    manufacturer = '',
    store = '',
  } = {}) {
    try {
      const allTiers = await this.page
        .locator(this.selectors.allTiers + ' .chart.cursor-pointer')
        .all();

      const estimatedEarnings = await this.getEstimatedEarnings();
      const incrementalEarnings = await this.getIncrementalEarnings();
      console.log(
        `Estimated Earnings: ${estimatedEarnings} for ${loggedInUser} - ${manufacturer} - ${store}`
      );
      console.log(
        `Incremental Earnings: ${incrementalEarnings} for ${loggedInUser} - ${manufacturer} - ${store}`
      );

      let actualCompletedCount = 0;
      let mismatchFound = false;
      let message = '';

      for (const tier of allTiers) {
        // Extract SKU text values
        const tierText = await tier
          .locator(this.selectors.tierSKU)
          .textContent();
        const [completed, total] = tierText.split('/').map((el) => {
          return Number(el?.replace(/[^0-9]/g, '') || 0);
        });
        console.log(
          `Tier: ${tierText} | Completed: ${completed} | Total: ${total} for ${loggedInUser} - ${manufacturer} - ${store}`
        );
        const isTextCompleted = completed === total;

        await waitForPageLoad({
          page: this.page,
          timeout: 6000,
          errorMessage:
            'Response timeout while loading the tier - continuing with test',
        });
        await this.page.waitForTimeout(750);

        // Check visual completion (green chart)
        const isVisuallyCompleted = await tier
          .locator(this.selectors.completedTiers)
          .isVisible();

        // Debug output for troubleshooting
        console.log(
          `Tier: ${tierText} | Text: ${isTextCompleted} | Visual: ${isVisuallyCompleted} for ${loggedInUser} - ${manufacturer} - ${store}`
        );

        // Case 1: False positive (green but not completed)
        if (isVisuallyCompleted && !isTextCompleted) {
          console.error(
            `False positive: ${tierText} is green but not complete for ${loggedInUser} - ${manufacturer} - ${store}`
          );
          message = `False positive: ${tierText} is green but not complete for ${loggedInUser} - ${manufacturer} - ${store}`;
          mismatchFound = true;
        }
        // Case 2: False negative (completed but not green)
        else if (isTextCompleted && !isVisuallyCompleted) {
          console.error(
            `False negative: ${tierText} is complete but not green for ${loggedInUser} - ${manufacturer} - ${store}`
          );
          message = `False negative: ${tierText} is complete but not green for ${loggedInUser} - ${manufacturer} - ${store}`;
          mismatchFound = true;
        }

        // Count only consistently completed tiers
        if (isTextCompleted && isVisuallyCompleted) {
          actualCompletedCount++;
        }
      }

      if (actualCompletedCount > 0 && estimatedEarnings <= 0) {
        console.error(
          `Estimated earnings is not showing for completed skus for ${loggedInUser} - ${manufacturer} - ${store}`
        );
        message = `Estimated earnings is not showing for completed skus for ${loggedInUser} - ${manufacturer} - ${store}`;
        mismatchFound = true;
      }

      if (incrementalEarnings < 0) {
        console.error(
          `Incremental Earnings can't be negative for completed skus for ${loggedInUser} - ${manufacturer} - ${store}`
        );
        mismatchFound = true;
        message = `Incremental Earnings can't be negative for completed skus for ${loggedInUser} - ${manufacturer} - ${store}`;
      }

      return mismatchFound
        ? { status: false, message }
        : { status: actualCompletedCount, message };
    } catch (error) {
      console.error('Error matching completed SKUs:', error.message);
      return { status: false, message: error.message };
    }
  }

  async verifyAllTiers(programRow: ProgramRow, page: any, storeName: string) {
    // Verify Tier SKU
    const tierElements = await this.page.locator(this.selectors.allTiers).all();
    let crossVerifyingCompletedTiers = 0;
    let crossVerifyingPendingTiers = 0;
    for (const tier of tierElements) {
      const tierTitle = await tier
        .locator('span.font-medium.text-sm.text-highlighted-color.min-h-7')
        .textContent();
      await tier.locator(this.selectors.tierSKU).waitFor({
        state: 'visible',
        timeout: 2000,
      });
      const tierElement = tier.locator(this.selectors.tierSKU);
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

      if (completedSKU === totalSKU) {
        crossVerifyingCompletedTiers++;
      } else {
        crossVerifyingPendingTiers++;
      }

      console.log(
        `Tier: ${tierTitle} | Tier Progress Track: ${completedSKU}/${totalSKU}`
      );

      // Open the Tier Details Modal
      await tier.click();
      console.log('Clicked on Tier:', tierTitle);
      await this.page.waitForLoadState('networkidle', {
        timeout: 7000,
      });

      /*
       * Start Verifying the Tier Details Modal
       */
      // Click on the "Purchased" checkbox
      await waitForPageLoad({
        page: this.page,
        timeout: 7000,
        errorMessage: 'Purchased Checkbox not found, skipping...',
      });
      try {
        await this.page.waitForSelector(
          this.selectors.tierDetailModalPurchasedCheckbox,
          { timeout: 7000 }
        );
      } catch (error) {
        console.log('Purchased Checkbox not found, skipping...');
      }
      await this.page.waitForTimeout(750);

      const isPurchasedCheckboxVisible = await this.page
        .locator(this.selectors.tierDetailModalPurchasedCheckbox)
        .isVisible();
      console.log('Purchased Checkbox is visible:', isPurchasedCheckboxVisible);
      if (isPurchasedCheckboxVisible) {
        await this.page
          .locator(this.selectors.tierDetailModalPurchasedCheckbox)
          .click();
        await this.page.waitForTimeout(100);
      }

      // Verify that the current tier title matches the tier title
      const currentTierTitle = await this.page
        .locator(
          '.flex.flex-col.gap-1.text-medium.text-highlighted-color.mb-6 p.font-semibold.text-lg'
        )
        .textContent();

      if (currentTierTitle !== tierTitle) {
        throw new Error(
          `Tier title mismatch: Expected "${tierTitle}", but got "${currentTierTitle}"`
        );
      }

      // Get All The SKU Category
      const skuCategory = await this.page
        .locator(this.selectors.tierDetailModalSKU)
        .all();
      console.log('Number of SKU Category in a Tier:', skuCategory.length);

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
            `Category Tab Button is not visible for Store: ${storeName} - ${programRow.manufacturer} - ${categoryName}`
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
          console.log(
            `Category: ${categoryName} | Tier Progress Track: ${completed}/${total} | Purchased Products: ${purchasedSkus}`
          );
          // If the number of purchased SKUs is less than the completed SKUs, take a screenshot
          if (purchasedSkus < completed) {
            const screenshot = await saveScreenshot(
              page,
              `purchased-skus-less-than-completed-${categoryName}`
            );
            softExpectWithScreenshot(
              page,
              () =>
                expect.soft(purchasedSkus).toBeGreaterThanOrEqual(completed),
              `Expected number of purchased products to be greater than or equal to completed SKUs for Category: ${categoryName} | Tier Progress Track: ${completed}/${total} | Purchased Products: ${purchasedSkus} for Store: ${storeName} - ${programRow.manufacturer}\nScreenshot: ${screenshot}`
            );
          }
        } else {
          const screenshot = await saveScreenshot(
            page,
            `purchased-checkbox-not-visible-${categoryName}`
          );
          console.error(
            `Purchased Checkbox is not visible, Category: ${categoryName} | Tier Progress Track: ${completed}/${total} for Store: ${storeName} - ${programRow.manufacturer}\nScreenshot: ${screenshot}`
          );
        }
      }

      // Back to the Store Details Modal
      await this.page.locator(this.selectors.tierDetailModalBackButton).click();
      console.log(`Tier Finished: ${tierTitle}`);
    }

    // Verify that the number of completed tiers matches the number of completed tiers in the row
    // if (
    //   crossVerifyingCompletedTiers !== programRow.programCompliance.completed
    // ) {
    //   throw new Error(
    //     `Completed Tiers count mismatch: Expected ${programRow.programCompliance.completed}, but got ${crossVerifyingCompletedTiers}`
    //   );
    // }
  }
}

export default StoreDetailModal;

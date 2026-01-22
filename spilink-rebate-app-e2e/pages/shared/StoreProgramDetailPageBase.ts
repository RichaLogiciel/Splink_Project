const BasePage = require('../BasePage');
const { parseCurrency, waitForPageLoad } = require('../../utils/helper');
const { MESSAGE } = require('../../utils/message');

class StoreProgramDetailPageBase extends BasePage {
  constructor(page) {
    super(page);
    this.selectors = {
      backButton: '#store-program-detail a[href^="/app/programs/store"]',
      salesVolume:
        '#sales-volume-card .flex.justify-start.gap-2.items-center.mb-0 .text-2xl.font-semibold',
      estimateStoreEarnings:
        '#estimated-store-earnings-card  .flex.justify-start.gap-2.items-center.mb-0 .text-2xl.font-semibold',
      storesEnrolled:
        '#stores-enrolled-card .flex.justify-start.gap-2.items-center.mb-0 .text-2xl.font-semibold',
      programsCompliant: '#programs-compliant-card-value',

      // Store Tabs
      allTabs: '#store-program-detail .store-detail-tabs',

      // Store Retailer Program Details Table
      storeRetailerProgramTable: '#retailer-program-table table',
      storeRetailerProgramRow: '#retailer-program-table tbody tr',
      storeRpm: '#tier-detail-modal',
      storeRpmTitle: '#tier-detail-modal h2+ div p.font-semibold.text-lg',
      storeRpmClose: '#tier-detail-modal img[alt="popupCloseIcon"]',
      storeRpmComplianceStatus:
        '#tier-detail-modal #sku-title-card p.text-lg.mt-3',
      storeRpmRebate: '#tier-detail-modal #rebate-card p.font-bold.text-lg',

      // Store Table
      storeTable: '#store-table table',
      storeRow: '#store-table tbody tr',
      unenrolledStoreTable: '#unenrolled-stores-table table',
      unenrolledStoreTableRow: '#unenrolled-stores-table tbody tr',

      // Store Details Modal
      SD_Modal: '#store-details-modal',
      SD_ModalClose: '#store-details-modal img[alt="popupCloseIcon"]',
      SD_ModalEstEarnings: '#store-details-modal span > p.font-bold.text-lg',
      SD_Tiers: '#store-details-modal #store-tiers .cat-sku-card',
      SD_CompletedTiers: 'path.recharts-sector.outline-none[fill="#106210"]',
      SD_TierSKU: '.recharts-wrapper svg text:first-of-type',

      // Tier Details Modal
      TD_Modal: '#tier-detail-modal',
      TD_ModalBackButton: '#tier-detail-modal img[alt="leftGreyArrowIcon"]',
      TD_TierSKU: '#tier-detail-modal #sku-title-card p.text-lg',
      TD_PurchasedCheckbox:
        '#tier-detail-modal .display-products-only-container',
      // Accordion
      ClosedAccordion: '.accordion-button[aria-expanded="false"]',
    };
  }

  async getSalesVolume() {
    return parseCurrency(
      await this.page.locator(this.selectors.salesVolume).textContent()
    );
  }

  async getEstimateStoreEarnings() {
    return parseCurrency(
      await this.page
        .locator(this.selectors.estimateStoreEarnings)
        .textContent()
    );
  }

  async getStoreDetailsModalEstEarnings() {
    return parseCurrency(
      await this.page
        .locator(this.selectors.SD_ModalEstEarnings)
        .first()
        .textContent()
    );
  }

  async matchCompletedSkusTiersInStoreDetailsModal() {
    try {
      const allTiers = await this.page
        .locator(this.selectors.SD_Tiers + ' .chart.cursor-pointer')
        .all();

      let actualCompletedCount = 0;
      let mismatchFound = false;

      for (const tier of allTiers) {
        // Extract SKU text values
        const tierText = await tier
          .locator(this.selectors.SD_TierSKU)
          .textContent();
        const [completed, total] = tierText.split('/').map((el) => {
          return Number(el?.replace(/[^0-9]/g, '') || 0);
        });
        const isTextCompleted = completed === total;

        await waitForPageLoad({
          page: this.page,
          timeout: 10000,
          errorMessage:
            'Response timeout while loading the tier - continuing with test',
        });
        await this.page.waitForTimeout(750);

        // Check visual completion (green chart)
        const isVisuallyCompleted = await tier
          .locator(this.selectors.SD_CompletedTiers)
          .isVisible();

        // Case 1: False positive (green but not completed)
        if (isVisuallyCompleted && !isTextCompleted) {
          console.error(
            `False positive: ${tierText} is green but not complete`
          );
          mismatchFound = true;
        }
        // Case 2: False negative (completed but not green)
        else if (isTextCompleted && !isVisuallyCompleted) {
          console.error(
            `False negative: ${tierText} is complete but not green`
          );
          mismatchFound = true;
        }

        // Count only consistently completed tiers
        if (isTextCompleted && isVisuallyCompleted) {
          actualCompletedCount++;
        }
      }

      return mismatchFound ? false : actualCompletedCount;
    } catch (error) {
      console.error('Error matching completed SKUs:', error.message);
      return false;
    }
  }

  async getStoreDetailsModalAllTiers() {
    const allTiers = await this.page.locator(this.selectors.SD_Tiers).all();
    const completedTiers = await Promise.all(
      allTiers.map(async (tier) => {
        await waitForPageLoad({
          page: this.page,
          timeout: 6000,
          errorMessage:
            'Response timeout while loading the tier - continuing with test',
        });
        await this.page.waitForTimeout(750);
        const completedTier = await tier
          .locator(this.selectors.SD_CompletedTiers)
          .count();
        return completedTier;
      })
    );
    return {
      all: allTiers.length,
      completed: completedTiers.reduce((acc, curr) => acc + curr, 0),
    };
  }

  async getStoreDetailsModalTierSKU() {
    return await this.page.locator(this.selectors.SD_TierSKU).textContent();
  }

  async getStoresEnrolled() {
    return await this.page.locator(this.selectors.storesEnrolled).textContent();
  }

  async getProgramsCompliant() {
    const programsCompliant = await this.page
      .locator(this.selectors.programsCompliant)
      .textContent();
    const [completed, total] = programsCompliant?.split('/').map((el) => {
      return Number(el?.replace(/[^0-9]/g, '') || 0);
    });
    return {
      completed,
      total,
    };
  }

  async getStoreRetailerProgramBreakdown() {
    // Wait for the retailer program table to be visible before extracting rows
    await this.page.waitForSelector(this.selectors.storeRetailerProgramTable, {
      state: 'visible',
      timeout: 3000,
    });
    const rows = await this.page
      .locator(this.selectors.storeRetailerProgramRow)
      .all();

    return Promise.all(
      rows.map(async (row) => {
        const cells = await row.locator('td').allTextContents();
        return cells[0]?.trim() != MESSAGE.NOT_FOUND.DISTRIBUTOR_PROGRAM_DETAIL
          ? {
              type: cells[0]?.trim(),
              rebate: cells[1]?.trim(),
              overview: cells[2]?.trim(),
              storesCompliance: {
                enrolled: parseInt(
                  cells[4]?.split('/')[0]?.replace(/[^0-9]/g, '') || '0'
                ),
                total: parseInt(
                  cells[4]?.split('/')[1]?.replace(/[^0-9]/g, '') || '0'
                ),
              },
            }
          : null;
      })
    );
  }

  // Returns all store data from the store table (see screenshot columns)
  async getAllStoresData(forEnrolled = true) {
    const StoreTable = forEnrolled
      ? this.selectors.storeTable
      : this.selectors.unenrolledStoreTable;

    const storeRow = forEnrolled
      ? this.selectors.storeRow
      : this.selectors.unenrolledStoreTableRow;
    // Wait for the store table to be visible before extracting rows
    await this.page.waitForSelector(StoreTable, {
      state: 'visible',
      timeout: 3000,
    });
    const rows = await this.page.locator(storeRow).all();

    return Promise.all(
      rows.map(async (row: any) => {
        const cellCount = await row.locator('td:not(:first-child)').count();
        if (cellCount <= 1) return null; // If the row has no data, return null

        const cells = await row
          .locator('td:not(:first-child)')
          .allTextContents();
        const storeName = await row.locator('td:nth-child(2) p').textContent();

        // const programCompliance = await row.locator('td.programCompliance');
        // const programComplianceText = await programCompliance.textContent();

        // Columns: Store, Chain, Purchase Volume, Earned Earnings, Earnings YTD, Program Compliance, Sales Rep
        return {
          store: storeName || cells[0]?.trim() || '',
          chain: '', // Chain is not available in this table
          purchaseVolume: parseCurrency(cells[1]?.trim() || '0'),
          earnedEarnings: parseCurrency(cells[2]?.trim() || '0'),
          // programCompliance: {
          //   completed: parseInt(
          //     programComplianceText?.trim()?.split('/')?.[0] || '0'
          //   ),
          //   total: parseInt(
          //     programComplianceText?.trim()?.split('/')?.[1] || '0'
          //   ),
          // },
        };
      })
    );
  }

  /**
   * Returns all store data with Program Compliance for Earnings Cap validation test
   * This function extracts data by matching column headers to ensure correct order
   * Columns expected: Store, Chain, Purchase Volume, Store Earnings, Earnings Opp., % Compliance to Next Tier, Program Compliance, Action
   */
  async getAllStoresDataWithCompliance(forEnrolled = true) {
    const StoreTable = forEnrolled
      ? this.selectors.storeTable
      : this.selectors.unenrolledStoreTable;

    const storeRow = forEnrolled
      ? this.selectors.storeRow
      : this.selectors.unenrolledStoreTableRow;
    // Wait for the store table to be visible before extracting rows
    await this.page.waitForSelector(StoreTable, {
      state: 'visible',
      timeout: 3000,
    });

    // Get column headers to map columns correctly
    const headerRow = await this.page.locator(`${StoreTable} thead tr`).first();
    const headerCells = await headerRow.locator('th').allTextContents();

    // Find column indices by matching header labels
    const findColumnIndex = (searchLabels: string[]) => {
      for (let i = 0; i < headerCells.length; i++) {
        const headerText = (headerCells[i] || '').trim().toLowerCase();
        for (const label of searchLabels) {
          if (headerText.includes(label.toLowerCase())) {
            return i;
          }
        }
      }
      return -1;
    };

    const purchaseVolumeIndex = findColumnIndex(['purchase volume']);
    const storeEarningsIndex = findColumnIndex([
      'store earnings',
      'earned earnings',
    ]);
    const programComplianceIndex = findColumnIndex(['program compliance']);
    const complianceToNextTierIndex = findColumnIndex([
      '% compliance to next tier',
      'compliance to next tier',
    ]);

    console.log(
      `Column mapping - Purchase Volume: ${purchaseVolumeIndex}, Store Earnings: ${storeEarningsIndex}, Program Compliance: ${programComplianceIndex}, % Compliance to Next Tier: ${complianceToNextTierIndex}`
    );

    const rows = await this.page.locator(storeRow).all();
    return Promise.all(
      rows.map(async (row: any) => {
        const cellCount = await row.locator('td').count();
        if (cellCount <= 1) return null; // If the row has no data, return null

        const cells = await row.locator('td').allTextContents();
        const storeName = await row.locator('td:nth-child(2) p').textContent();

        // Extract values using mapped column indices
        const purchaseVolume =
          purchaseVolumeIndex >= 0 && purchaseVolumeIndex < cells.length
            ? parseCurrency(cells[purchaseVolumeIndex]?.trim() || '0')
            : 0;

        const earnedEarnings =
          storeEarningsIndex >= 0 && storeEarningsIndex < cells.length
            ? parseCurrency(cells[storeEarningsIndex]?.trim() || '0')
            : 0;

        // Extract Program Compliance
        let completed = 0;
        let total = 0;

        if (
          programComplianceIndex >= 0 &&
          programComplianceIndex < cells.length
        ) {
          const complianceText = cells[programComplianceIndex]?.trim() || '';

          if (complianceText && complianceText.includes('/')) {
            const parts = complianceText.split('/');
            const completedStr = (parts[0] || '').trim();
            const totalStr = (parts[1] || '').trim();

            if (completedStr) {
              const completedNum = parseInt(
                completedStr.replace(/[^0-9]/g, '') || '0',
                10
              );
              if (!isNaN(completedNum)) {
                completed = completedNum;
              }
            }

            if (totalStr) {
              const totalNum = parseInt(
                totalStr.replace(/[^0-9]/g, '') || '0',
                10
              );
              if (!isNaN(totalNum)) {
                total = totalNum;
              }
            }
          }
        } else {
          // Fallback: search all cells for "X/Y" pattern if column not found
          for (let i = 0; i < cells.length; i++) {
            const cellText = cells[i]?.trim() || '';
            if (
              cellText.includes('/') &&
              /^\d+\/\d+/.test(cellText.replace(/\s/g, ''))
            ) {
              const parts = cellText.split('/');
              const completedStr = (parts[0] || '').trim();
              const totalStr = (parts[1] || '').trim();

              if (completedStr) {
                const completedNum = parseInt(
                  completedStr.replace(/[^0-9]/g, '') || '0',
                  10
                );
                if (!isNaN(completedNum)) {
                  completed = completedNum;
                }
              }

              if (totalStr) {
                const totalNum = parseInt(
                  totalStr.replace(/[^0-9]/g, '') || '0',
                  10
                );
                if (!isNaN(totalNum)) {
                  total = totalNum;
                }
              }
              break;
            }
          }
        }

        // Ensure we always have valid numbers (default to 0, never undefined)
        completed = isNaN(completed) || completed < 0 ? 0 : completed;
        total = isNaN(total) || total < 0 ? 0 : total;

        // Extract % Compliance to Next Tier
        let complianceToNextTier = 0;
        if (
          complianceToNextTierIndex >= 0 &&
          complianceToNextTierIndex < cells.length
        ) {
          const complianceText = cells[complianceToNextTierIndex]?.trim() || '';
          // Extract percentage (e.g., "92%" or "83%")
          const percentageMatch = complianceText.match(/(\d+(?:\.\d+)?)/);
          if (percentageMatch) {
            complianceToNextTier = parseFloat(percentageMatch[1]) || 0;
          }
        }

        return {
          store: storeName || cells[0]?.trim() || '',
          chain: '', // Chain is not available in this table
          purchaseVolume,
          earnedEarnings,
          programCompliance: {
            completed,
            total,
          },
          complianceToNextTier,
        };
      })
    );
  }
}

export default StoreProgramDetailPageBase;

const BasePage = require('../BasePage');
const { parseCurrency } = require('../../utils/helper');
const { MESSAGE } = require('../../utils/message');

class DistributorProgramDetailPage extends BasePage {
  constructor(page) {
    super(page);
    this.selectors = {
      purchaseVolume: '#purchase-volume-card',
      estimatedEarnings: '#estimated-earnings-card',
      salesRepSpiffs: '#sales-rep-spiffs-card',
      // Distributor Program Details Table
      distributorProgramTable: '.DistributorProgram table',
      distributorProgramRow: '.DistributorProgram table tbody tr',
      dpm: '#distributor-program-details-modal',
      dpmTitle: '#distributor-program-details-modal h2 p.font-semibold.text-lg',
      dpmClose: '#distributor-program-details-modal img[alt="popupCloseIcon"]',
      dpmPurchaseVolume:
        '#distributor-program-details-modal .PurchaseVolume p.font-bold.text-lg.mt-3',
      dpmEstimateSavings:
        '#distributor-program-details-modal .EstimatedEarnings p.font-bold.text-lg.mt-3',
      dpmCheckbox:
        '#distributor-program-details-modal .display-products-only-container label',
      dpmProgressTrack: '#sku-title-card p.font-normal.text-lg',
      dpmProductRows: '#distributor-program-details-modal table tbody tr',
      dpmClose: '#distributor-program-details-modal img[alt="popupCloseIcon"]',
      dpmProductTab: '.tab-label-container .relative',

      // Retailer Program Breakdown Table
      retailerProgramTable: '#retailer-program-table table',
      retailerProgramRow: '#retailer-program-table tbody tr',
      rpm: '#tier-detail-modal',
      rpmTitle: '#tier-detail-modal h2+ div p.font-semibold.text-lg',
      rpmClose: '#tier-detail-modal img[alt="popupCloseIcon"]',
      rpmCheckbox: '#tier-detail-modal .display-products-only-container label',
      rpmProductTab: '.tab-label-container .relative',
      rpmManufacturer:
        '#tier-detail-modal h2 span.flex-1.font-semibold.text-lg',
    };
  }

  async getPurchaseVolume() {
    return parseCurrency(
      await this.page.locator(this.selectors.purchaseVolume).textContent()
    );
  }

  async getEstimatedEarnings() {
    return parseCurrency(
      await this.page.locator(this.selectors.estimatedEarnings).textContent()
    );
  }

  async getSalesRepSpiffs() {
    return parseCurrency(
      await this.page.locator(this.selectors.salesRepSpiffs).textContent()
    );
  }

  async getDpmProductRowCount() {
    await this.page.waitForSelector(this.selectors.dpmProductRows);
    const rows = await this.page.locator(this.selectors.dpmProductRows).all();
    if (rows?.length > 0) {
      const cellTitle = await rows[0].locator('td').first().textContent();
      console.log(`Cell Title: ${cellTitle}`);
      return cellTitle?.trim() ==
        MESSAGE.NOT_FOUND.DISTRIBUTOR_PROGRAM_DETAIL_PRODUCT_ROW
        ? 0
        : rows.length;
    }
    return 0;
  }

  async getProgressTrack() {
    return await this.page.locator(this.selectors.dpmProgressTrack).all();
  }

  async getDistributorProgramDetails() {
    const rows = await this.page
      .locator(this.selectors.distributorProgramRow)
      .all();
    return Promise.all(
      rows.map(async (row) => {
        const cells = await row.locator('td').allTextContents();
        return cells[0]?.trim() != MESSAGE.NOT_FOUND.DISTRIBUTOR_PROGRAM_DETAIL
          ? {
              type: cells[0]?.trim(),
              rebate: cells[1]?.trim(),
              overview: cells[2]?.trim(),
              paymentTerm: cells[3]?.trim(),
              complianceStatus: cells[4]?.trim(),
            }
          : null;
      })
    );
  }

  async getRetailerProgramBreakdown() {
    const rows = await this.page
      .locator(this.selectors.retailerProgramRow)
      .all();
    return Promise.all(
      rows.map(async (row) => {
        const cells = await row.locator('td').allTextContents();
        return cells[0]?.trim() != MESSAGE.NOT_FOUND.DISTRIBUTOR_PROGRAM_DETAIL
          ? {
              type: cells[0]?.trim(),
              rebate: cells[1]?.trim(),
              overview: cells[2]?.trim(),
              productsInWarehouse: {
                completed: cells[3]?.trim()?.split('/')[0],
                total: cells[3]?.trim()?.split('/')[1],
              },
            }
          : null;
      })
    );
  }

  async getRetailerProgramProductRows() {
    const table = await this.page
      .locator('table.w-full.border-collapse.table-fixed tbody tr')
      .all();
    if (table.length == 0) {
      return 0;
    }
    if (table.length == 1) {
      const cellTitle = await table[0].locator('td').first().textContent();
      return cellTitle?.trim().includes('It looks like you have') ? 0 : 1;
    }
    return table.length;
  }
}

module.exports = DistributorProgramDetailPage;

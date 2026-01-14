const StorePageBase = require('../shared/StorePageBase');

class StorePage extends StorePageBase {
  constructor(page) {
    super(page);

    this.selectors = {
      ...this.selectors,
      SD_Tiers: '#store-details-modal #store-tiers .cat-sku-card',
    };
  }

  async getStoreRow(currentStoreRow: any) {
    const storeRow = await this.page.locator(currentStoreRow);
    return storeRow;
  }
}

export default StorePage;

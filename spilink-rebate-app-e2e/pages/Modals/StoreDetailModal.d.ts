import { Page } from '@playwright/test';
import BasePage from '../BasePage';

/**
 * Provides type definitions for the StoreDetailModal class.
 */
declare class StoreDetailModal extends BasePage {
  constructor(page: Page);

  /**
   * Selectors used within the StoreDetailModal page object.
   */
  selectors: {
    // Store Details Modal
    storeModal: string;
    storeTiers: string;

    // Price Selectors
    estimatedEarnings: string;
    incrementalEarnings: string;

    // Tier Selectors
    allTiers: string;
    completedTiers: string;
    tierSKU: string;

    // Store Details Modal
    modalClose: string;
  };

  /**
   * Gets the estimated earnings from the store details modal.
   * @returns A promise that resolves to the estimated earnings as a number.
   */
  getEstimatedEarnings(): Promise<number>;

  /**
   * Gets the incremental earnings from the store details modal.
   * @returns A promise that resolves to the incremental earnings as a number.
   */
  getIncrementalEarnings(): Promise<number>;

  /**
   * Matches completed SKUs and tiers in the store details modal.
   * It verifies that visually completed tiers (green chart) match the text completion (e.g., "5/5 SKUs").
   * @returns A promise that resolves to the count of correctly completed tiers, or `false` if a mismatch is found.
   */
  matchCompletedSkusTiersInStoreDetailsModal(): Promise<number | false>;
}

export = StoreDetailModal;

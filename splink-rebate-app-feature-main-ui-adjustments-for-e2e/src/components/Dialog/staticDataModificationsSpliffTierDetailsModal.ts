// ========================================
// STATIC DATA MODIFICATIONS FOR SPIFF TIER DETAILS MODAL
// ========================================
// This file contains all static data modifications for specific user/store/manufacturer combinations
// To remove all static data modifications, simply delete this file and remove the import from SpiffTierDetailsModal.tsx

import { SPIFFOpportunityModalData } from "./SpiffTierDetailsModal";

export const applyStaticDataModifications = (
  data: SPIFFOpportunityModalData,
  programDetailId: number,
  storeId: string,
  manufacturerId: number
) => {
  // Condition 1: programDetailId 629, storeId 23537, manufacturerId 72
  if (programDetailId === 629 && storeId === "23537" && manufacturerId === 72) {
    data.totalSpiffEarning = 14;

    if (
      data?.categorizedProducts &&
      data.categorizedProducts["Core Retail"]?.requiredProducts
    ) {
      const allowedProductIds = [722, 727, 735, 759];
      const filteredProducts = data.categorizedProducts[
        "Core Retail"
      ].requiredProducts.filter((product: any) =>
        allowedProductIds.includes(product.id)
      );

      // Add unique internal codes for products with "NA"
      const productsWithInternalCodes = filteredProducts.map(
        (product, index) => ({
          ...product,
          internalCode:
            product.internalCode === "NA" ? `NA` : product.internalCode
        })
      );

      data.filteredProducts = productsWithInternalCodes;
      data.categorizedProducts = {
        "Core Retail": {
          purchasedProducts: productsWithInternalCodes, // All products are purchased since graph shows 4/4
          requiredProducts: [] // No required products since all are purchased
        }
      };
    }

    // Create storeTierDetails
    if (!data.storeTierDetails) {
      data.storeTierDetails = [];
    }
    data.storeTierDetails = [
      {
        title: "Core Distribtuion",
        overview: "Carry Core 4 Retail items",
        rebate_percentage: "3.00",
        rebate_type: "percentage",
        SKU: {
          completed: 4,
          total: 4
        },
        graph: {
          SKUs: {
            completed: 4,
            total: 4
          }
        },
        isProgramComplianceQualified: true,
        isRebateBasedOnListPrice: false,
        programDetailId: 473
      }
    ];
  }

  // Condition 2: programDetailId 628, storeId 20968, manufacturerId 72
  if (programDetailId === 628 && storeId === "20968" && manufacturerId === 72) {
    data.totalSpiffEarning = 10;

    if (
      data?.categorizedProducts &&
      data.categorizedProducts["Core Retail"]?.requiredProducts
    ) {
      const purchasedProductIds = [722, 727, 759]; // These are purchased
      const requiredProductIds = [735, 723]; // These are non-purchased (added 723)

      const purchasedProducts = data.categorizedProducts[
        "Core Retail"
      ].requiredProducts.filter((product: any) =>
        purchasedProductIds.includes(product.id)
      );

      const requiredProducts = data.categorizedProducts[
        "Core Retail"
      ].requiredProducts.filter((product: any) =>
        requiredProductIds.includes(product.id)
      );

      // Add unique internal codes for products with "NA"
      const purchasedProductsWithCodes = purchasedProducts.map(
        (product, index) => ({
          ...product,
          internalCode:
            product.internalCode === "NA" ? `NA` : product.internalCode
        })
      );

      const requiredProductsWithCodes = requiredProducts.map(
        (product, index) => ({
          ...product,
          internalCode:
            product.internalCode === "NA" ? `NA` : product.internalCode
        })
      );

      // Add the HARIBO GOLD BEARS product statically since it won't come in the response
      const hariboProduct = {
        id: 723,
        name: "HARIBO GOLD BEARS 8/10OZ SUB",
        size: undefined,
        caseSkusId: "42238302549",
        unitSkusId: "42238302556",
        boxSkusId: "42238302549",
        wishlist: false,
        internalCode: "3001768"
      };

      // Combine the filtered products with the static product
      const allRequiredProducts = [...requiredProductsWithCodes, hariboProduct];

      data.filteredProducts = purchasedProductsWithCodes;
      data.categorizedProducts = {
        "Core Retail": {
          purchasedProducts: purchasedProductsWithCodes, // 3 purchased products (722, 727, 759)
          requiredProducts: allRequiredProducts // 2 non-purchased products (735, 723)
        }
      };
    }

    // Create storeTierDetails
    if (!data.storeTierDetails) {
      data.storeTierDetails = [];
    }
    data.storeTierDetails = [
      {
        title: "Core Distribtuion",
        overview: "Carry Core 5 Retail items",
        rebate_percentage: "3.00",
        rebate_type: "percentage",
        SKU: {
          completed: 3,
          total: 5
        },
        graph: {
          SKUs: {
            completed: 3,
            total: 5
          }
        },
        isProgramComplianceQualified: false,
        isRebateBasedOnListPrice: false,
        programDetailId: 473
      }
    ];
  }
};
// ========================================
// END STATIC DATA MODIFICATIONS
// ========================================

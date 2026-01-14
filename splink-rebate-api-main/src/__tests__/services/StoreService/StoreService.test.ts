/**
 * StoreService Tests
 *
 * Tests for StoreService business logic methods
 * Focuses on utility methods and data transformation functions
 */

// Mock dependencies before imports
jest.mock("../../../repositories/StoreRepository");
jest.mock("../../../repositories/ProgramRepository");
jest.mock("../../../repositories/ManufacturerRepository");
jest.mock("../../../repositories/DistributorRepository");
jest.mock("../../../utils/redis");
jest.mock("newrelic");

import storeService from "../../../services/StoreService";
import {
  PROGRAM_TYPE,
  ProgramsDetailCriteria
} from "../../../config/appConstants";

describe("StoreService - Utility Methods", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("filterPrograms", () => {
    it("should separate TIER programs from non-TIER programs", () => {
      // Arrange
      const programsResult = [
        { id: 1, name: "Program 1", program_type: PROGRAM_TYPE.TIER },
        { id: 2, name: "Program 2", program_type: PROGRAM_TYPE.BASE },
        { id: 3, name: "Program 3", program_type: PROGRAM_TYPE.TIER },
        { id: 4, name: "Program 4", program_type: "OTHER" }
      ];

      // Act
      const result = storeService.filterPrograms(programsResult);

      // Assert
      expect(result.coreProductPrograms).toHaveLength(2);
      expect(result.allNonTierPrograms).toHaveLength(2);
      expect(result.coreProductPrograms[0].program_type).toBe(
        PROGRAM_TYPE.TIER
      );
      expect(result.coreProductPrograms[1].program_type).toBe(
        PROGRAM_TYPE.TIER
      );
      expect(result.allNonTierPrograms[0].program_type).not.toBe(
        PROGRAM_TYPE.TIER
      );
      expect(result.allNonTierPrograms[1].program_type).not.toBe(
        PROGRAM_TYPE.TIER
      );
    });

    it("should return empty arrays when no programs provided", () => {
      // Act
      const result = storeService.filterPrograms([]);

      // Assert
      expect(result.coreProductPrograms).toEqual([]);
      expect(result.allNonTierPrograms).toEqual([]);
    });

    it("should return all programs as TIER when all are TIER", () => {
      // Arrange
      const programsResult = [
        { id: 1, program_type: PROGRAM_TYPE.TIER },
        { id: 2, program_type: PROGRAM_TYPE.TIER }
      ];

      // Act
      const result = storeService.filterPrograms(programsResult);

      // Assert
      expect(result.coreProductPrograms).toHaveLength(2);
      expect(result.allNonTierPrograms).toHaveLength(0);
    });

    it("should return all programs as non-TIER when none are TIER", () => {
      // Arrange
      const programsResult = [
        { id: 1, program_type: PROGRAM_TYPE.BASE },
        { id: 2, program_type: "OTHER" }
      ];

      // Act
      const result = storeService.filterPrograms(programsResult);

      // Assert
      expect(result.coreProductPrograms).toHaveLength(0);
      expect(result.allNonTierPrograms).toHaveLength(2);
    });
  });

  describe("processProducts", () => {
    const mockProducts = [
      {
        id: 1,
        name: "Product 1",
        size: "12oz",
        unit_skus_id: 101,
        case_skus_id: 201,
        box_skus_id: 301,
        primary_variant: true,
        category_flags: { Flex: false },
        internal_code: "P1"
      },
      {
        id: 2,
        name: "Product 2",
        size: "16oz",
        unit_skus_id: 102,
        case_skus_id: 202,
        box_skus_id: 302,
        primary_variant: true,
        category_flags: { Flex: true },
        internal_code: "P2",
        wishlist: true
      },
      {
        id: 3,
        name: "Product 3",
        size: "24oz",
        unit_skus_id: 103,
        case_skus_id: 203,
        box_skus_id: 303,
        primary_variant: true,
        category_flags: { Flex: true },
        internal_code: null
      }
    ];

    it("should separate recommended and purchased products", () => {
      // Arrange
      const purchasedProductIds = [201]; // case_skus_id of Product 1

      // Act
      const result = storeService.processProducts(
        mockProducts,
        purchasedProductIds
      );

      // Assert
      expect(result.purchasedProducts).toHaveLength(1);
      expect(result.recommendedProducts).toHaveLength(2);
      expect(result.purchasedProducts[0].name).toBe("Product 1");
      expect(result.recommendedProducts[0].name).toBe("Product 2");
      expect(result.recommendedProducts[1].name).toBe("Product 3");
    });

    it("should identify purchased products by unit_skus_id with primary_variant", () => {
      // Arrange
      const purchasedProductIds = [101]; // unit_skus_id of Product 1

      // Act
      const result = storeService.processProducts(
        mockProducts,
        purchasedProductIds
      );

      // Assert
      expect(result.purchasedProducts).toHaveLength(1);
      expect(result.purchasedProducts[0].name).toBe("Product 1");
    });

    it("should identify purchased products by box_skus_id", () => {
      // Arrange
      const purchasedProductIds = [301]; // box_skus_id of Product 1

      // Act
      const result = storeService.processProducts(
        mockProducts,
        purchasedProductIds
      );

      // Assert
      expect(result.purchasedProducts).toHaveLength(1);
      expect(result.purchasedProducts[0].name).toBe("Product 1");
    });

    it("should not recommend products that are purchased", () => {
      // Arrange
      const purchasedProductIds = [202]; // case_skus_id of Product 2 (recommended)

      // Act
      const result = storeService.processProducts(
        mockProducts,
        purchasedProductIds
      );

      // Assert
      expect(result.purchasedProducts).toHaveLength(1);
      expect(result.recommendedProducts).toHaveLength(1);
      expect(result.purchasedProducts[0].name).toBe("Product 2");
      expect(result.recommendedProducts[0].name).toBe("Product 3");
    });

    it("should only recommend Flex-tagged products", () => {
      // Arrange
      const purchasedProductIds: number[] = [];

      // Act
      const result = storeService.processProducts(
        mockProducts,
        purchasedProductIds
      );

      // Assert
      expect(result.recommendedProducts).toHaveLength(2);
      expect(
        result.recommendedProducts.every(
          (p) =>
            mockProducts.find((mp) => mp.name === p.name)?.category_flags?.Flex
        )
      ).toBe(true);
    });

    it("should include wishlist data in recommended products", () => {
      // Arrange
      const purchasedProductIds: number[] = [];

      // Act
      const result = storeService.processProducts(
        mockProducts,
        purchasedProductIds
      );

      // Assert
      const product2 = result.recommendedProducts.find(
        (p) => p.name === "Product 2"
      );
      expect(product2?.wishlist).toBe(true);
      expect(product2?.id).toBe(2);
    });

    it("should handle products with no internal_code", () => {
      // Arrange
      const purchasedProductIds = [203];

      // Act
      const result = storeService.processProducts(
        mockProducts,
        purchasedProductIds
      );

      // Assert
      // With grey-out logic: no internal_code and no lastTransactionDate = null
      expect(result.purchasedProducts[0].internalCode).toBeNull();
    });

    it("should include case_skus_id when includeCaseSKUsId is true", () => {
      // Arrange
      const purchasedProductIds = [201];

      // Act
      const result = storeService.processProducts(
        mockProducts,
        purchasedProductIds,
        true
      );

      // Assert
      expect(result.purchasedProducts[0].caseSkusId).toBe("201");
    });

    it("should not include case_skus_id when includeCaseSKUsId is false", () => {
      // Arrange
      const purchasedProductIds = [201];

      // Act
      const result = storeService.processProducts(
        mockProducts,
        purchasedProductIds,
        false
      );

      // Assert
      expect(result.purchasedProducts[0].caseSkusId).toBeUndefined();
    });

    it("should handle empty products array", () => {
      // Act
      const result = storeService.processProducts([], []);

      // Assert
      expect(result.recommendedProducts).toEqual([]);
      expect(result.purchasedProducts).toEqual([]);
    });

    it("should handle undefined purchasedProductIds", () => {
      // Act
      const result = storeService.processProducts(mockProducts, []);

      // Assert
      expect(result.purchasedProducts).toEqual([]);
      expect(result.recommendedProducts).toHaveLength(2);
    });
  });

  describe("getRecommendedAndPurchasedProducts", () => {
    it("should delegate to processProducts method", () => {
      // Arrange
      const mockProducts = [
        {
          id: 1,
          name: "Product 1",
          size: "12oz",
          unit_skus_id: 101,
          case_skus_id: 201,
          box_skus_id: 301,
          primary_variant: true,
          category_flags: { Flex: false }
        }
      ];
      const purchasedProductIds = [201];
      const includeCaseSKUsId = true;

      // Act
      const result = storeService.getRecommendedAndPurchasedProducts(
        mockProducts,
        purchasedProductIds,
        includeCaseSKUsId
      );

      // Assert
      expect(result).toHaveProperty("recommendedProducts");
      expect(result).toHaveProperty("purchasedProducts");
      expect(result.purchasedProducts).toHaveLength(1);
    });
  });

  describe("calculateCompliancePercentage", () => {
    const mockProducts = [
      { id: 1, name: "Product 1", category1: true },
      { id: 2, name: "Product 2", category1: true },
      { id: 3, name: "Product 3", category2: true }
    ];

    const mockProductCategoryTags = [
      { id: 1, tagKey: "category1", tagName: "Category 1" },
      { id: 2, tagKey: "category2", tagName: "Category 2" }
    ] as any[];

    it("should return 0 for non-CategorySKUs criteria", () => {
      // Arrange
      const programDetail = {
        criteria: ProgramsDetailCriteria.PurchaseValue,
        products_tags: "category1",
        products_tags_qty: "2"
      };

      // Act
      const result = storeService.calculateCompliancePercentage(
        programDetail,
        mockProducts,
        [],
        [],
        mockProductCategoryTags
      );

      // Assert
      expect(result).toBe(0);
    });

    it("should return 0 when no transaction line items", () => {
      // Arrange
      const programDetail = {
        criteria: ProgramsDetailCriteria.CategorySKUs,
        products_tags: "category1",
        products_tags_qty: "2"
      };

      // Act
      const result = storeService.calculateCompliancePercentage(
        programDetail,
        mockProducts,
        undefined,
        [],
        mockProductCategoryTags
      );

      // Assert
      expect(result).toBe(0);
    });

    it("should return 0 when no categories defined", () => {
      // Arrange
      const programDetail = {
        criteria: ProgramsDetailCriteria.CategorySKUs,
        products_tags: "",
        products_tags_qty: ""
      };
      const mockLineItems = [{ id: 1, product_id: 1, quantity: 1 }] as any[];

      // Act
      const result = storeService.calculateCompliancePercentage(
        programDetail,
        mockProducts,
        mockLineItems,
        [],
        mockProductCategoryTags
      );

      // Assert
      expect(result).toBe(0);
    });

    it("should return 0 when total required is 0", () => {
      // Arrange
      const programDetail = {
        criteria: ProgramsDetailCriteria.CategorySKUs,
        products_tags: "category1",
        products_tags_qty: "0"
      };
      const mockLineItems = [{ id: 1, product_id: 1, quantity: 1 }] as any[];

      // Act
      const result = storeService.calculateCompliancePercentage(
        programDetail,
        mockProducts,
        mockLineItems,
        [],
        mockProductCategoryTags
      );

      // Assert
      expect(result).toBe(0);
    });

    it("should handle empty transaction line items array", () => {
      // Arrange
      const programDetail = {
        criteria: ProgramsDetailCriteria.CategorySKUs,
        products_tags: "category1",
        products_tags_qty: "2"
      };

      // Act
      const result = storeService.calculateCompliancePercentage(
        programDetail,
        mockProducts,
        [],
        [],
        mockProductCategoryTags
      );

      // Assert
      expect(result).toBe(0);
    });
  });

  describe("Service Structure", () => {
    it("should have all required public methods", () => {
      expect(storeService).toBeDefined();
      expect(typeof storeService.filterPrograms).toBe("function");
      expect(typeof storeService.processProducts).toBe("function");
      expect(typeof storeService.getRecommendedAndPurchasedProducts).toBe(
        "function"
      );
      expect(typeof storeService.calculateCompliancePercentage).toBe(
        "function"
      );
      expect(typeof storeService.getListing).toBe("function");
      expect(typeof storeService.getStoreDetails).toBe("function");
    });
  });
});

/**
 * StoreService Helper Methods Tests
 *
 * Tests for utility and helper methods in StoreService:
 * - createSortFunction: Creates sorting comparator functions
 * - filterPrograms: Separates TIER vs non-TIER programs
 * - processProducts: Separates purchased vs recommended products
 * - mapProducts: Filters and maps products with size limits
 */

import { PROGRAM_TYPE } from "../../../config/appConstants";
import storeService from "../../../services/StoreService";

describe("StoreService - Helper Methods", () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = storeService;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("createSortFunction", () => {
    describe("success cases", () => {
      it("should create ascending sort function", () => {
        // Arrange
        const sortFn = service.createSortFunction("ASC");

        // Act
        const result1 = sortFn(1);
        const result2 = sortFn(-1);
        const result3 = sortFn(0);

        // Assert
        expect(result1).toBe(1);
        expect(result2).toBe(-1);
        expect(result3).toBe(0);
      });

      it("should create descending sort function", () => {
        // Arrange
        const sortFn = service.createSortFunction("DESC");

        // Act
        const result1 = sortFn(1);
        const result2 = sortFn(-1);
        const result3 = sortFn(0);

        // Assert
        expect(result1).toBe(-1);
        expect(result2).toBe(1);
        expect(Math.abs(result3)).toBe(0); // Handle -0 and 0 both being valid
      });

      it("should default to descending for any non-ASC value", () => {
        // Arrange
        const sortFn1 = service.createSortFunction("desc");
        const sortFn2 = service.createSortFunction("random");
        const sortFn3 = service.createSortFunction("");

        // Act & Assert
        expect(sortFn1(5)).toBe(-5);
        expect(sortFn2(5)).toBe(-5);
        expect(sortFn3(5)).toBe(-5);
      });

      it("should work with array.sort() for ascending order", () => {
        // Arrange
        const sortFn = service.createSortFunction("ASC");
        const numbers = [{ value: 3 }, { value: 1 }, { value: 2 }];

        // Act
        const sorted = numbers.sort((a, b) => {
          const comparison = a.value - b.value;
          return sortFn(comparison);
        });

        // Assert
        expect(sorted[0].value).toBe(1);
        expect(sorted[1].value).toBe(2);
        expect(sorted[2].value).toBe(3);
      });

      it("should work with array.sort() for descending order", () => {
        // Arrange
        const sortFn = service.createSortFunction("DESC");
        const numbers = [{ value: 1 }, { value: 3 }, { value: 2 }];

        // Act
        const sorted = numbers.sort((a, b) => {
          const comparison = a.value - b.value;
          return sortFn(comparison);
        });

        // Assert
        expect(sorted[0].value).toBe(3);
        expect(sorted[1].value).toBe(2);
        expect(sorted[2].value).toBe(1);
      });
    });

    describe("edge cases", () => {
      it("should handle case-sensitive sort parameter", () => {
        // Arrange
        const ascSort = service.createSortFunction("ASC");
        const mixedSort = service.createSortFunction("Asc");

        // Act & Assert
        expect(ascSort(5)).toBe(5);
        expect(mixedSort(5)).toBe(-5); // Not 'ASC' exactly, defaults to DESC
      });

      it("should handle null or undefined gracefully", () => {
        // Arrange
        const nullSort = service.createSortFunction(null as any);
        const undefinedSort = service.createSortFunction(undefined as any);

        // Act & Assert
        expect(nullSort(10)).toBe(-10);
        expect(undefinedSort(10)).toBe(-10);
      });
    });
  });

  describe("filterPrograms", () => {
    describe("success cases", () => {
      it("should separate TIER and non-TIER programs correctly", () => {
        // Arrange
        const programs = [
          { id: 1, name: "Program A", program_type: PROGRAM_TYPE.TIER },
          { id: 2, name: "Program B", program_type: PROGRAM_TYPE.BASE },
          { id: 3, name: "Program C", program_type: PROGRAM_TYPE.TIER },
          { id: 4, name: "Program D", program_type: PROGRAM_TYPE.POD }
        ];

        // Act
        const result = service.filterPrograms(programs);

        // Assert
        expect(result.coreProductPrograms).toHaveLength(2);
        expect(result.allNonTierPrograms).toHaveLength(2);
        expect(result.coreProductPrograms[0].id).toBe(1);
        expect(result.coreProductPrograms[1].id).toBe(3);
        expect(result.allNonTierPrograms[0].id).toBe(2);
        expect(result.allNonTierPrograms[1].id).toBe(4);
      });

      it("should return all programs as TIER when all are TIER type", () => {
        // Arrange
        const programs = [
          { id: 1, program_type: PROGRAM_TYPE.TIER },
          { id: 2, program_type: PROGRAM_TYPE.TIER },
          { id: 3, program_type: PROGRAM_TYPE.TIER }
        ];

        // Act
        const result = service.filterPrograms(programs);

        // Assert
        expect(result.coreProductPrograms).toHaveLength(3);
        expect(result.allNonTierPrograms).toHaveLength(0);
      });

      it("should return all programs as non-TIER when none are TIER type", () => {
        // Arrange
        const programs = [
          { id: 1, program_type: PROGRAM_TYPE.BASE },
          { id: 2, program_type: "OTHER" },
          { id: 3, program_type: PROGRAM_TYPE.POD }
        ];

        // Act
        const result = service.filterPrograms(programs);

        // Assert
        expect(result.coreProductPrograms).toHaveLength(0);
        expect(result.allNonTierPrograms).toHaveLength(3);
      });

      it("should handle mixed program types", () => {
        // Arrange
        const programs = [
          { id: 1, program_type: PROGRAM_TYPE.TIER },
          { id: 2, program_type: PROGRAM_TYPE.BASE },
          { id: 3, program_type: "CUSTOM" },
          { id: 4, program_type: PROGRAM_TYPE.TIER }
        ];

        // Act
        const result = service.filterPrograms(programs);

        // Assert
        expect(result.coreProductPrograms).toHaveLength(2);
        expect(result.allNonTierPrograms).toHaveLength(2);
      });

      it("should preserve original program properties", () => {
        // Arrange
        const programs = [
          {
            id: 1,
            name: "Test Program",
            program_type: PROGRAM_TYPE.TIER,
            manufacturer: "Acme Corp",
            startDate: "2025-01-01"
          }
        ];

        // Act
        const result = service.filterPrograms(programs);

        // Assert
        expect(result.coreProductPrograms[0]).toEqual(programs[0]);
        expect(result.coreProductPrograms[0].name).toBe("Test Program");
        expect(result.coreProductPrograms[0].manufacturer).toBe("Acme Corp");
      });
    });

    describe("edge cases", () => {
      it("should handle empty programs array", () => {
        // Arrange
        const programs: any[] = [];

        // Act
        const result = service.filterPrograms(programs);

        // Assert
        expect(result.coreProductPrograms).toEqual([]);
        expect(result.allNonTierPrograms).toEqual([]);
      });

      it("should handle programs with null program_type", () => {
        // Arrange
        const programs = [
          { id: 1, program_type: null },
          { id: 2, program_type: PROGRAM_TYPE.TIER }
        ];

        // Act
        const result = service.filterPrograms(programs);

        // Assert
        expect(result.coreProductPrograms).toHaveLength(1);
        expect(result.allNonTierPrograms).toHaveLength(1);
      });

      it("should handle programs with undefined program_type", () => {
        // Arrange
        const programs = [
          { id: 1, program_type: undefined },
          { id: 2, program_type: PROGRAM_TYPE.TIER }
        ];

        // Act
        const result = service.filterPrograms(programs);

        // Assert
        expect(result.coreProductPrograms).toHaveLength(1);
        expect(result.allNonTierPrograms).toHaveLength(1);
      });
    });
  });

  describe("processProducts", () => {
    describe("success cases", () => {
      it("should categorize products as purchased when unit_skus_id matches", () => {
        // Arrange
        const products = [
          {
            id: 1,
            name: "Product A",
            size: "12 oz",
            unit_skus_id: 101,
            case_skus_id: 201,
            box_skus_id: 301,
            primary_variant: true,
            internal_code: "ABC123",
            last_transaction_date: new Date() // Recent date to prevent grey-out
          }
        ];
        const purchasedProductIds = [101];

        // Act
        const result = service.processProducts(products, purchasedProductIds);

        // Assert
        expect(result.purchasedProducts).toHaveLength(1);
        expect(result.purchasedProducts[0].name).toBe("Product A");
        expect(result.purchasedProducts[0].size).toBe("12 oz");
        expect(result.purchasedProducts[0].internalCode).toBe("ABC123");
        expect(result.recommendedProducts).toHaveLength(0);
      });

      it("should categorize products as purchased when case_skus_id matches", () => {
        // Arrange
        const products = [
          {
            id: 1,
            name: "Product B",
            size: "24 pack",
            unit_skus_id: 102,
            case_skus_id: 202,
            box_skus_id: 302,
            primary_variant: false,
            internal_code: "XYZ789",
            last_transaction_date: new Date() // Recent date to prevent grey-out
          }
        ];
        const purchasedProductIds = [202];

        // Act
        const result = service.processProducts(products, purchasedProductIds);

        // Assert
        expect(result.purchasedProducts).toHaveLength(1);
        expect(result.purchasedProducts[0].name).toBe("Product B");
        expect(result.recommendedProducts).toHaveLength(0);
      });

      it("should categorize products as purchased when box_skus_id matches", () => {
        // Arrange
        const products = [
          {
            id: 1,
            name: "Product C",
            size: "6 pack",
            unit_skus_id: 103,
            case_skus_id: 203,
            box_skus_id: 303,
            primary_variant: false,
            internal_code: "BOX456",
            last_transaction_date: new Date() // Recent date to prevent grey-out
          }
        ];
        const purchasedProductIds = [303];

        // Act
        const result = service.processProducts(products, purchasedProductIds);

        // Assert
        expect(result.purchasedProducts).toHaveLength(1);
        expect(result.purchasedProducts[0].name).toBe("Product C");
        expect(result.recommendedProducts).toHaveLength(0);
      });

      it("should categorize products as recommended when Flex-tagged and not purchased", () => {
        // Arrange
        const products = [
          {
            id: 10,
            name: "Recommended Product",
            size: "16 oz",
            unit_skus_id: 104,
            case_skus_id: 204,
            box_skus_id: 304,
            category_flags: { Flex: true },
            wishlist: true,
            internal_code: "REC123",
            last_transaction_date: new Date() // Recent date to prevent grey-out
          }
        ];
        const purchasedProductIds: number[] = [];

        // Act
        const result = service.processProducts(products, purchasedProductIds);

        // Assert
        expect(result.recommendedProducts).toHaveLength(1);
        expect(result.recommendedProducts[0].name).toBe("Recommended Product");
        expect(result.recommendedProducts[0].id).toBe(10);
        expect(result.recommendedProducts[0].wishlist).toBe(true);
        expect(result.purchasedProducts).toHaveLength(0);
      });

      it("should not categorize purchased products as recommended even if Flex-tagged", () => {
        // Arrange
        const products = [
          {
            id: 1,
            name: "Product",
            size: "12 oz",
            unit_skus_id: 105,
            case_skus_id: 205,
            box_skus_id: 305,
            primary_variant: true,
            category_flags: { Flex: true },
            wishlist: true,
            internal_code: "BOTH123",
            last_transaction_date: new Date() // Recent date to prevent grey-out
          }
        ];
        const purchasedProductIds = [105];

        // Act
        const result = service.processProducts(products, purchasedProductIds);

        // Assert
        expect(result.purchasedProducts).toHaveLength(1);
        expect(result.recommendedProducts).toHaveLength(0); // Not recommended because it's purchased
      });

      it("should include caseSkusId when includeCaseSKUsId is true", () => {
        // Arrange
        const products = [
          {
            id: 1,
            name: "Product",
            size: "12 oz",
            unit_skus_id: 106,
            case_skus_id: 206,
            box_skus_id: 306,
            primary_variant: true,
            internal_code: "CASE123",
            last_transaction_date: new Date() // Recent date to prevent grey-out
          }
        ];
        const purchasedProductIds = [106];

        // Act
        const result = service.processProducts(
          products,
          purchasedProductIds,
          true
        );

        // Assert
        expect(result.purchasedProducts[0].caseSkusId).toBe("206");
      });

      it("should not include caseSkusId when includeCaseSKUsId is false", () => {
        // Arrange
        const products = [
          {
            id: 1,
            name: "Product",
            size: "12 oz",
            unit_skus_id: 107,
            case_skus_id: 207,
            box_skus_id: 307,
            primary_variant: true,
            internal_code: "NOCASE",
            last_transaction_date: new Date() // Recent date to prevent grey-out
          }
        ];
        const purchasedProductIds = [107];

        // Act
        const result = service.processProducts(
          products,
          purchasedProductIds,
          false
        );

        // Assert
        expect(result.purchasedProducts[0].caseSkusId).toBeUndefined();
      });

      it("should handle multiple products with mixed categories", () => {
        // Arrange
        const products = [
          {
            id: 1,
            name: "Purchased Product 1",
            size: "12 oz",
            unit_skus_id: 101,
            case_skus_id: 201,
            box_skus_id: 301,
            primary_variant: true,
            internal_code: "P1",
            last_transaction_date: new Date() // Recent date to prevent grey-out
          },
          {
            id: 2,
            name: "Recommended Product 1",
            size: "16 oz",
            unit_skus_id: 102,
            case_skus_id: 202,
            box_skus_id: 302,
            category_flags: { Flex: true },
            wishlist: true,
            internal_code: "R1",
            last_transaction_date: new Date() // Recent date to prevent grey-out
          },
          {
            id: 3,
            name: "Purchased Product 2",
            size: "24 oz",
            unit_skus_id: 103,
            case_skus_id: 203,
            box_skus_id: 303,
            primary_variant: false,
            internal_code: "P2",
            last_transaction_date: new Date() // Recent date to prevent grey-out
          }
        ];
        const purchasedProductIds = [101, 203];

        // Act
        const result = service.processProducts(products, purchasedProductIds);

        // Assert
        expect(result.purchasedProducts).toHaveLength(2);
        expect(result.recommendedProducts).toHaveLength(1);
        expect(result.purchasedProducts[0].name).toBe("Purchased Product 1");
        expect(result.purchasedProducts[1].name).toBe("Purchased Product 2");
        expect(result.recommendedProducts[0].name).toBe(
          "Recommended Product 1"
        );
      });

      it("should return null for internalCode when not provided and no lastTransactionDate", () => {
        // Arrange
        const products = [
          {
            id: 1,
            name: "Product",
            size: "12 oz",
            unit_skus_id: 108,
            case_skus_id: 208,
            box_skus_id: 308,
            primary_variant: true
            // No internal_code or last_transaction_date provided
          }
        ];
        const purchasedProductIds = [108];

        // Act
        const result = service.processProducts(products, purchasedProductIds);

        // Assert
        // With grey-out logic: no internal_code and no lastTransactionDate = null
        expect(result.purchasedProducts[0].internalCode).toBeNull();
      });
    });

    describe("edge cases", () => {
      it("should handle empty products array", () => {
        // Arrange
        const products: any[] = [];
        const purchasedProductIds: number[] = [];

        // Act
        const result = service.processProducts(products, purchasedProductIds);

        // Assert
        expect(result.purchasedProducts).toEqual([]);
        expect(result.recommendedProducts).toEqual([]);
      });

      it("should handle empty purchasedProductIds array", () => {
        // Arrange
        const products = [
          {
            id: 1,
            name: "Product",
            size: "12 oz",
            unit_skus_id: 109,
            case_skus_id: 209,
            box_skus_id: 309,
            primary_variant: true,
            internal_code: "TEST"
          }
        ];
        const purchasedProductIds: number[] = [];

        // Act
        const result = service.processProducts(products, purchasedProductIds);

        // Assert
        expect(result.purchasedProducts).toEqual([]);
        expect(result.recommendedProducts).toEqual([]);
      });

      it("should handle products with null SKU IDs", () => {
        // Arrange
        const products = [
          {
            id: 1,
            name: "Product",
            size: "12 oz",
            unit_skus_id: null,
            case_skus_id: null,
            box_skus_id: null,
            primary_variant: true,
            internal_code: "NULL",
            last_transaction_date: new Date() // Recent date to prevent grey-out
          }
        ];
        const purchasedProductIds = [999];

        // Act
        const result = service.processProducts(products, purchasedProductIds);

        // Assert
        expect(result.purchasedProducts).toEqual([]);
        expect(result.recommendedProducts).toEqual([]);
      });

      it("should handle products with undefined values", () => {
        // Arrange
        const products = [
          {
            name: "Product",
            size: "12 oz",
            unit_skus_id: 110,
            primary_variant: true
            // Missing optional fields (no internal_code or last_transaction_date)
          }
        ];
        const purchasedProductIds = [110];

        // Act
        const result = service.processProducts(products, purchasedProductIds);

        // Assert
        expect(result.purchasedProducts).toHaveLength(1);
        // With grey-out logic: no internal_code and no lastTransactionDate = null
        expect(result.purchasedProducts[0].internalCode).toBeNull();
      });

      it("should handle null productsResult array", () => {
        // Arrange
        const products = null as any;
        const purchasedProductIds: number[] = [];

        // Act
        const result = service.processProducts(products, purchasedProductIds);

        // Assert
        expect(result.purchasedProducts).toEqual([]);
        expect(result.recommendedProducts).toEqual([]);
      });

      it("should handle Flex-tagged products that have purchased case_skus_id", () => {
        // Arrange
        const products = [
          {
            id: 1,
            name: "Product",
            size: "12 oz",
            unit_skus_id: 111,
            case_skus_id: 211,
            box_skus_id: 311,
            category_flags: { Flex: true },
            wishlist: true,
            internal_code: "CONFLICT",
            last_transaction_date: new Date() // Recent date to prevent grey-out
          }
        ];
        const purchasedProductIds = [211]; // case_skus_id is purchased

        // Act
        const result = service.processProducts(products, purchasedProductIds);

        // Assert
        expect(result.recommendedProducts).toEqual([]); // Not recommended because case_skus_id is purchased
        expect(result.purchasedProducts).toHaveLength(1);
      });
    });
  });

  describe("mapProducts", () => {
    describe("success cases", () => {
      it("should map products with all properties", () => {
        // Arrange
        const products = [
          {
            id: 1,
            name: "Product A",
            size: "12 oz",
            case_skus_id: 201,
            unit_skus_id: 101,
            box_skus_id: 301,
            wishlist: true,
            internal_code: "ABC123",
            last_transaction_date: new Date() // Recent date to prevent grey-out
          }
        ];
        const filterCondition = () => true;
        const size = 10;
        const includeCaseSKUsId = true;

        // Act
        const result = service.mapProducts(
          products,
          filterCondition,
          size,
          undefined,
          includeCaseSKUsId
        );

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          id: 1,
          name: "Product A",
          size: "12 oz",
          caseSkusId: "201",
          unitSkusId: 101,
          boxSkusId: 301,
          wishlist: true,
          internalCode: "ABC123",
          oldInternalCode: "ABC123",
          lastTransactionDate: expect.any(Date),
          is_warehouse_specific_product: false
        });
      });

      it("should apply filter condition correctly", () => {
        // Arrange
        const products = [
          { id: 1, name: "Product A", size: "12 oz", internal_code: "A" },
          { id: 2, name: "Product B", size: "16 oz", internal_code: "B" },
          { id: 3, name: "Product C", size: "24 oz", internal_code: "C" }
        ];
        const filterCondition = (pro: any) => pro.id % 2 === 1; // Only odd IDs
        const size = 10;

        // Act
        const result = service.mapProducts(products, filterCondition, size);

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].id).toBe(1);
        expect(result[1].id).toBe(3);
      });

      it("should limit results to specified size", () => {
        // Arrange
        const products = [
          { id: 1, name: "Product A", size: "12 oz", internal_code: "A" },
          { id: 2, name: "Product B", size: "16 oz", internal_code: "B" },
          { id: 3, name: "Product C", size: "24 oz", internal_code: "C" },
          { id: 4, name: "Product D", size: "32 oz", internal_code: "D" },
          { id: 5, name: "Product E", size: "40 oz", internal_code: "E" }
        ];
        const filterCondition = () => true;
        const size = 2;

        // Act
        const result = service.mapProducts(products, filterCondition, size);

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0].id).toBe(1);
        expect(result[1].id).toBe(2);
      });

      it("should track unique purchased product IDs when provided", () => {
        // Arrange
        const products = [
          { id: 1, name: "Product A", size: "12 oz", internal_code: "A" },
          { id: 2, name: "Product B", size: "16 oz", internal_code: "B" },
          { id: 3, name: "Product C", size: "24 oz", internal_code: "C" }
        ];
        const filterCondition = () => true;
        const size = 10;
        const uniquePurchasedProductIds = new Set<number>();

        // Act
        const result = service.mapProducts(
          products,
          filterCondition,
          size,
          uniquePurchasedProductIds
        );

        // Assert
        expect(result).toHaveLength(3);
        expect(uniquePurchasedProductIds.size).toBe(3);
        expect(uniquePurchasedProductIds.has(1)).toBe(true);
        expect(uniquePurchasedProductIds.has(2)).toBe(true);
        expect(uniquePurchasedProductIds.has(3)).toBe(true);
      });

      it("should add 0 to uniquePurchasedProductIds when product id is null", () => {
        // Arrange
        const products = [
          { id: null, name: "Product A", size: "12 oz", internal_code: "A" },
          {
            id: undefined,
            name: "Product B",
            size: "16 oz",
            internal_code: "B"
          }
        ];
        const filterCondition = () => true;
        const size = 10;
        const uniquePurchasedProductIds = new Set<number>();

        // Act
        const result = service.mapProducts(
          products,
          filterCondition,
          size,
          uniquePurchasedProductIds
        );

        // Assert
        expect(result).toHaveLength(2);
        expect(uniquePurchasedProductIds.has(0)).toBe(true);
        expect(uniquePurchasedProductIds.size).toBe(1); // Both null and undefined become 0
      });

      it("should default wishlist to false when not provided", () => {
        // Arrange
        const products = [
          { id: 1, name: "Product A", size: "12 oz", internal_code: "A" }
          // No wishlist property
        ];
        const filterCondition = () => true;
        const size = 10;

        // Act
        const result = service.mapProducts(products, filterCondition, size);

        // Assert
        expect(result[0].wishlist).toBe(false);
      });

      it("should return null for internalCode when not provided and no lastTransactionDate", () => {
        // Arrange
        const products = [
          { id: 1, name: "Product A", size: "12 oz" }
          // No internal_code or last_transaction_date property
        ];
        const filterCondition = () => true;
        const size = 10;

        // Act
        const result = service.mapProducts(products, filterCondition, size);

        // Assert
        // With grey-out logic: no internal_code and no lastTransactionDate = null
        expect(result[0].internalCode).toBeNull();
      });

      it("should handle complex filter conditions", () => {
        // Arrange
        const products = [
          {
            id: 1,
            name: "Product A",
            size: "12 oz",
            internal_code: "A",
            price: 10
          },
          {
            id: 2,
            name: "Product B",
            size: "16 oz",
            internal_code: "B",
            price: 20
          },
          {
            id: 3,
            name: "Product C",
            size: "24 oz",
            internal_code: "C",
            price: 30
          },
          {
            id: 4,
            name: "Product D",
            size: "32 oz",
            internal_code: "D",
            price: 15
          }
        ];
        const filterCondition = (pro: any) =>
          pro.price >= 15 && pro.price <= 25;
        const size = 10;

        // Act
        const result = service.mapProducts(products, filterCondition, size);

        // Assert
        expect(result).toHaveLength(2); // Only products with price 20 and 15 match (not 30)
        expect(result[0].id).toBe(2); // Product B (price 20)
        expect(result[1].id).toBe(4); // Product D (price 15)
      });
    });

    describe("edge cases", () => {
      it("should handle empty products array", () => {
        // Arrange
        const products: any[] = [];
        const filterCondition = () => true;
        const size = 10;

        // Act
        const result = service.mapProducts(products, filterCondition, size);

        // Assert
        expect(result).toEqual([]);
      });

      it("should handle null products array", () => {
        // Arrange
        const products = null as any;
        const filterCondition = () => true;
        const size = 10;

        // Act
        const result = service.mapProducts(products, filterCondition, size);

        // Assert
        expect(result).toEqual([]);
      });

      it("should handle undefined products array", () => {
        // Arrange
        const products = undefined as any;
        const filterCondition = () => true;
        const size = 10;

        // Act
        const result = service.mapProducts(products, filterCondition, size);

        // Assert
        expect(result).toEqual([]);
      });

      it("should handle filter condition that excludes all products", () => {
        // Arrange
        const products = [
          { id: 1, name: "Product A", size: "12 oz", internal_code: "A" },
          { id: 2, name: "Product B", size: "16 oz", internal_code: "B" }
        ];
        const filterCondition = () => false;
        const size = 10;

        // Act
        const result = service.mapProducts(products, filterCondition, size);

        // Assert
        expect(result).toEqual([]);
      });

      it("should handle size of 0", () => {
        // Arrange
        const products = [
          { id: 1, name: "Product A", size: "12 oz", internal_code: "A" },
          { id: 2, name: "Product B", size: "16 oz", internal_code: "B" }
        ];
        const filterCondition = () => true;
        const size = 0;

        // Act
        const result = service.mapProducts(products, filterCondition, size);

        // Assert
        expect(result).toEqual([]);
      });

      it("should handle negative size by returning empty array", () => {
        // Arrange
        const products = [
          { id: 1, name: "Product A", size: "12 oz", internal_code: "A" }
        ];
        const filterCondition = () => true;
        const size = -5;

        // Act
        const result = service.mapProducts(products, filterCondition, size);

        // Assert
        expect(result).toEqual([]);
      });

      it("should handle size larger than array length", () => {
        // Arrange
        const products = [
          { id: 1, name: "Product A", size: "12 oz", internal_code: "A" },
          { id: 2, name: "Product B", size: "16 oz", internal_code: "B" }
        ];
        const filterCondition = () => true;
        const size = 100;

        // Act
        const result = service.mapProducts(products, filterCondition, size);

        // Assert
        expect(result).toHaveLength(2); // Only returns what's available
      });

      it("should handle products with all null optional fields", () => {
        // Arrange
        const products = [
          {
            id: 1,
            name: "Product A",
            size: null,
            case_skus_id: null,
            unit_skus_id: null,
            box_skus_id: null,
            wishlist: null,
            internal_code: null
            // No last_transaction_date - will be greyed out
          }
        ];
        const filterCondition = () => true;
        const size = 10;

        // Act
        const result = service.mapProducts(
          products,
          filterCondition,
          size,
          undefined,
          true
        );

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          id: 1,
          name: "Product A",
          size: null,
          caseSkusId: null, // When includeCaseSKUsId is true, null values are preserved
          unitSkusId: null,
          boxSkusId: null,
          wishlist: false, // Defaults to false
          internalCode: null, // With grey-out logic: null internal_code and no lastTransactionDate = null
          oldInternalCode: null, // No original code
          lastTransactionDate: null, // No last transaction date
          is_warehouse_specific_product: false
        });
      });

      it("should not modify uniquePurchasedProductIds when not provided", () => {
        // Arrange
        const products = [
          { id: 1, name: "Product A", size: "12 oz", internal_code: "A" }
        ];
        const filterCondition = () => true;
        const size = 10;

        // Act
        const result = service.mapProducts(products, filterCondition, size);

        // Assert
        expect(result).toHaveLength(1);
        // Should not throw error when uniquePurchasedProductIds is undefined
      });
    });
  });
});

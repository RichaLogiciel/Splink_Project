/**
 * Chain Validator Tests
 *
 * Tests for Joi validation schemas in chainValidator
 * Validates request data structures for chain-related operations
 */

import {
  validateChainProgramDetails,
  validateChainProgramsListing,
  validateChainCategorizedProducts,
  validateChainViewParams,
  validateChainId,
  validateChainPagination,
  validateChainQueryOptions
} from "../../validators/chainValidator";

describe("ChainValidator", () => {
  describe("validateChainProgramDetails", () => {
    it("should validate valid CHAIN type data", () => {
      // Arrange
      const validData = {
        type: "CHAIN",
        chainView: true,
        manufacturerId: 123
      };

      // Act
      const result = validateChainProgramDetails(validData);

      // Assert
      expect(result.error).toBeUndefined();
      expect(result.value.type).toBe("CHAIN");
    });

    it("should validate valid STORE type data", () => {
      // Arrange
      const validData = {
        type: "STORE",
        manufacturerId: 456
      };

      // Act
      const result = validateChainProgramDetails(validData);

      // Assert
      expect(result.error).toBeUndefined();
      expect(result.value.type).toBe("STORE");
    });

    it("should apply default values", () => {
      // Arrange
      const validData = {
        type: "STORE",
        manufacturerId: 123
      };

      // Act
      const result = validateChainProgramDetails(validData);

      // Assert
      expect(result.value.enrolledPage).toBe(1);
      expect(result.value.notEnrolledPage).toBe(1);
      expect(result.value.sort).toBe("ASC");
      expect(result.value.sortKey).toBe("chain_name");
    });

    it("should reject invalid type", () => {
      // Arrange
      const invalidData = {
        type: "INVALID",
        manufacturerId: 123
      };

      // Act
      const result = validateChainProgramDetails(invalidData);

      // Assert
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain("type");
    });

    it("should reject missing manufacturerId", () => {
      // Arrange
      const invalidData = {
        type: "CHAIN",
        chainView: true
      };

      // Act
      const result = validateChainProgramDetails(invalidData);

      // Assert
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain("manufacturerId");
    });

    it("should reject negative manufacturerId", () => {
      // Arrange
      const invalidData = {
        type: "CHAIN",
        chainView: true,
        manufacturerId: -5
      };

      // Act
      const result = validateChainProgramDetails(invalidData);

      // Assert
      expect(result.error).toBeDefined();
    });

    it("should require chainView when type is CHAIN", () => {
      // Arrange
      const invalidData = {
        type: "CHAIN",
        manufacturerId: 123
      };

      // Act
      const result = validateChainProgramDetails(invalidData);

      // Assert
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain("chainView");
    });

    it("should accept valid sortKey values", () => {
      // Arrange
      const validSortKeys = [
        "chain_name",
        "total_stores",
        "purchase_volume",
        "earned_rebate",
        "compliance_percentage"
      ];

      // Act & Assert
      validSortKeys.forEach((sortKey) => {
        const result = validateChainProgramDetails({
          type: "STORE",
          manufacturerId: 123,
          sortKey
        });
        expect(result.error).toBeUndefined();
      });
    });

    it("should reject invalid sortKey", () => {
      // Arrange
      const invalidData = {
        type: "STORE",
        manufacturerId: 123,
        sortKey: "invalid_key"
      };

      // Act
      const result = validateChainProgramDetails(invalidData);

      // Assert
      expect(result.error).toBeDefined();
    });
  });

  describe("validateChainProgramsListing", () => {
    it("should validate valid data", () => {
      // Arrange
      const validData = {
        type: "STORE",
        chainView: true
      };

      // Act
      const result = validateChainProgramsListing(validData);

      // Assert
      expect(result.error).toBeUndefined();
    });

    it("should only accept STORE type", () => {
      // Arrange
      const invalidData = {
        type: "CHAIN",
        chainView: true
      };

      // Act
      const result = validateChainProgramsListing(invalidData);

      // Assert
      expect(result.error).toBeDefined();
    });

    it("should require chainView to be true", () => {
      // Arrange
      const invalidData = {
        type: "STORE",
        chainView: false
      };

      // Act
      const result = validateChainProgramsListing(invalidData);

      // Assert
      expect(result.error).toBeDefined();
    });

    it("should accept optional fields", () => {
      // Arrange
      const validData = {
        type: "STORE",
        chainView: true,
        warehouseId: "WH123",
        programTimeline: "CURRENT",
        isInternal: true,
        storeId: 456,
        selectedWarehouseId: 789
      };

      // Act
      const result = validateChainProgramsListing(validData);

      // Assert
      expect(result.error).toBeUndefined();
      expect(result.value.warehouseId).toBe("WH123");
    });
  });

  describe("validateChainCategorizedProducts", () => {
    it("should validate valid data", () => {
      // Arrange
      const validData = {
        type: "STORE",
        chainView: true,
        manufacturerId: 123
      };

      // Act
      const result = validateChainCategorizedProducts(validData);

      // Assert
      expect(result.error).toBeUndefined();
    });

    it("should accept optional programId and chainId", () => {
      // Arrange
      const validData = {
        type: "STORE",
        chainView: true,
        manufacturerId: 123,
        programId: 456,
        chainId: 789
      };

      // Act
      const result = validateChainCategorizedProducts(validData);

      // Assert
      expect(result.error).toBeUndefined();
      expect(result.value.programId).toBe(456);
      expect(result.value.chainId).toBe(789);
    });

    it("should reject missing manufacturerId", () => {
      // Arrange
      const invalidData = {
        type: "STORE",
        chainView: true
      };

      // Act
      const result = validateChainCategorizedProducts(invalidData);

      // Assert
      expect(result.error).toBeDefined();
    });
  });

  describe("validateChainViewParams", () => {
    it("should validate when chainView is true with type", () => {
      // Arrange
      const validData = {
        chainView: true,
        type: "CHAIN"
      };

      // Act
      const result = validateChainViewParams(validData);

      // Assert
      expect(result.error).toBeUndefined();
    });

    it("should validate when chainView is false without type", () => {
      // Arrange
      const validData = {
        chainView: false
      };

      // Act
      const result = validateChainViewParams(validData);

      // Assert
      expect(result.error).toBeUndefined();
    });

    it("should require type when chainView is true", () => {
      // Arrange
      const invalidData = {
        chainView: true
      };

      // Act
      const result = validateChainViewParams(invalidData);

      // Assert
      expect(result.error).toBeDefined();
    });

    it("should accept CHAIN or STORE as type", () => {
      // Arrange
      const validTypes = ["CHAIN", "STORE"];

      // Act & Assert
      validTypes.forEach((type) => {
        const result = validateChainViewParams({
          chainView: true,
          type
        });
        expect(result.error).toBeUndefined();
      });
    });
  });

  describe("validateChainId", () => {
    it("should validate valid chainId", () => {
      // Arrange
      const validData = {
        chainId: 123
      };

      // Act
      const result = validateChainId(validData);

      // Assert
      expect(result.error).toBeUndefined();
      expect(result.value.chainId).toBe(123);
    });

    it("should reject missing chainId", () => {
      // Arrange
      const invalidData = {};

      // Act
      const result = validateChainId(invalidData);

      // Assert
      expect(result.error).toBeDefined();
    });

    it("should reject non-positive chainId", () => {
      // Arrange
      const invalidData = {
        chainId: 0
      };

      // Act
      const result = validateChainId(invalidData);

      // Assert
      expect(result.error).toBeDefined();
    });

    it("should reject negative chainId", () => {
      // Arrange
      const invalidData = {
        chainId: -5
      };

      // Act
      const result = validateChainId(invalidData);

      // Assert
      expect(result.error).toBeDefined();
    });
  });

  describe("validateChainPagination", () => {
    it("should validate valid pagination data", () => {
      // Arrange
      const validData = {
        page: 2,
        limit: 20,
        sort: "DESC",
        sortKey: "total_stores"
      };

      // Act
      const result = validateChainPagination(validData);

      // Assert
      expect(result.error).toBeUndefined();
      expect(result.value.page).toBe(2);
      expect(result.value.limit).toBe(20);
    });

    it("should apply default values", () => {
      // Arrange
      const validData = {};

      // Act
      const result = validateChainPagination(validData);

      // Assert
      expect(result.value.page).toBe(1);
      expect(result.value.limit).toBe(10);
      expect(result.value.sort).toBe("ASC");
      expect(result.value.sortKey).toBe("chain_name");
    });

    it("should reject page less than 1", () => {
      // Arrange
      const invalidData = {
        page: 0
      };

      // Act
      const result = validateChainPagination(invalidData);

      // Assert
      expect(result.error).toBeDefined();
    });

    it("should reject limit greater than 100", () => {
      // Arrange
      const invalidData = {
        limit: 101
      };

      // Act
      const result = validateChainPagination(invalidData);

      // Assert
      expect(result.error).toBeDefined();
    });

    it("should accept optional searchQuery", () => {
      // Arrange
      const validData = {
        searchQuery: "test chain"
      };

      // Act
      const result = validateChainPagination(validData);

      // Assert
      expect(result.error).toBeUndefined();
      expect(result.value.searchQuery).toBe("test chain");
    });

    it("should accept all valid sortKey values", () => {
      // Arrange
      const validSortKeys = [
        "chain_name",
        "total_stores",
        "purchase_volume",
        "earned_rebate",
        "compliance_percentage",
        "created_at",
        "updated_at"
      ];

      // Act & Assert
      validSortKeys.forEach((sortKey) => {
        const result = validateChainPagination({ sortKey });
        expect(result.error).toBeUndefined();
      });
    });
  });

  describe("validateChainQueryOptions", () => {
    it("should validate valid query options", () => {
      // Arrange
      const validData = {
        searchQuery: "test",
        page: 1,
        limit: 50,
        sort: "DESC",
        sortKey: "earned_rebate",
        programTimeline: "CURRENT",
        isInternal: true
      };

      // Act
      const result = validateChainQueryOptions(validData);

      // Assert
      expect(result.error).toBeUndefined();
      expect(result.value.searchQuery).toBe("test");
      expect(result.value.programTimeline).toBe("CURRENT");
    });

    it("should apply default values", () => {
      // Arrange
      const validData = {};

      // Act
      const result = validateChainQueryOptions(validData);

      // Assert
      expect(result.value.page).toBe(1);
      expect(result.value.limit).toBe(10);
      expect(result.value.sort).toBe("ASC");
      expect(result.value.sortKey).toBe("chain_name");
    });

    it("should accept all optional fields", () => {
      // Arrange
      const validData = {
        programTimeline: "HISTORICAL",
        isInternal: false
      };

      // Act
      const result = validateChainQueryOptions(validData);

      // Assert
      expect(result.error).toBeUndefined();
      expect(result.value.programTimeline).toBe("HISTORICAL");
      expect(result.value.isInternal).toBe(false);
    });
  });
});

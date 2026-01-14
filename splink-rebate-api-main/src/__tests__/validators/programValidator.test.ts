/**
 * Program Validator Tests
 *
 * Tests for Joi validation schemas in programValidator
 * Validates complex program creation and update schemas with dynamic validation
 */

import {
  validateCreateProgram,
  validateUpdateProgram
} from "../../validators/programValidator";

describe("ProgramValidator", () => {
  describe("validateCreateProgram", () => {
    describe("Basic Required Fields", () => {
      it("should validate valid program with all required fields", () => {
        // Arrange
        const validProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "ALL_DISTRIBUTORS",
          program_details: [
            {
              tier: 1,
              description: "Tier 1",
              overview: "Overview",
              program_line: "Line 1",
              rebate_type: "percentage",
              rebate_calculation: "Fixed $ amount",
              rebate_calculation_type: "percentage",
              criteria: "Base",
              min_qty: 10,
              rebate_percentage: 5
            }
          ]
        };

        // Act
        const result = validateCreateProgram(validProgram);

        // Assert
        expect(result.error).toBeUndefined();
        expect(result.value.name).toBe("Test Program");
      });

      it("should reject missing required field: name", () => {
        // Arrange
        const invalidProgram = {
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "ALL_DISTRIBUTORS",
          program_details: []
        };

        // Act
        const result = validateCreateProgram(invalidProgram);

        // Assert
        expect(result.error).toBeDefined();
        expect(result.error?.message).toContain("name");
      });

      it("should reject missing required field: start_date", () => {
        // Arrange
        const invalidProgram = {
          name: "Test Program",
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "ALL_DISTRIBUTORS",
          program_details: []
        };

        // Act
        const result = validateCreateProgram(invalidProgram);

        // Assert
        expect(result.error).toBeDefined();
        expect(result.error?.message).toContain("start_date");
      });

      it("should reject empty program_details array", () => {
        // Arrange
        const invalidProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "ALL_DISTRIBUTORS",
          program_details: []
        };

        // Act
        const result = validateCreateProgram(invalidProgram);

        // Assert
        expect(result.error).toBeDefined();
        expect(result.error?.message).toContain("program_details");
      });
    });

    describe("Target Audience Validation", () => {
      it("should accept valid target_audience: DISTRIBUTOR", () => {
        // Arrange
        const validProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "DISTRIBUTOR",
          participant_type: "DISTRIBUTOR",
          visibility_scope: "ALL_DISTRIBUTORS",
          program_details: [
            {
              tier: 1,
              description: null,
              overview: null,
              program_line: null,
              rebate_type: "percentage",
              rebate_calculation: "Fixed $ amount",
              rebate_calculation_type: "percentage",
              criteria: "Base",
              min_qty: 10,
              rebate_percentage: 5
            }
          ]
        };

        // Act
        const result = validateCreateProgram(validProgram);

        // Assert
        expect(result.error).toBeUndefined();
      });

      it("should accept valid target_audience: BOTH", () => {
        // Arrange
        const validProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "BOTH",
          participant_type: "STORE",
          visibility_scope: "ALL_DISTRIBUTORS",
          program_details: [
            {
              tier: 1,
              description: null,
              overview: null,
              program_line: null,
              rebate_type: "percentage",
              rebate_calculation: "Fixed $ amount",
              rebate_calculation_type: "percentage",
              criteria: "Base",
              min_qty: 10,
              rebate_percentage: 5
            }
          ]
        };

        // Act
        const result = validateCreateProgram(validProgram);

        // Assert
        expect(result.error).toBeUndefined();
      });

      it("should reject invalid target_audience", () => {
        // Arrange
        const invalidProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "INVALID",
          participant_type: "STORE",
          visibility_scope: "ALL_DISTRIBUTORS",
          program_details: [
            {
              tier: 1,
              description: null,
              overview: null,
              program_line: null,
              rebate_type: "percentage",
              rebate_calculation: "Fixed $ amount",
              rebate_calculation_type: "percentage",
              criteria: "Base",
              min_qty: 10,
              rebate_percentage: 5
            }
          ]
        };

        // Act
        const result = validateCreateProgram(invalidProgram);

        // Assert
        expect(result.error).toBeDefined();
        expect(result.error?.message).toContain("target_audience");
      });
    });

    describe("Visibility Scope Validation", () => {
      it("should require visibility_entities when scope is SPECIFIC_DISTRIBUTORS", () => {
        // Arrange
        const invalidProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "SPECIFIC_DISTRIBUTORS",
          program_details: [
            {
              tier: 1,
              description: null,
              overview: null,
              program_line: null,
              rebate_type: "percentage",
              rebate_calculation: "Fixed $ amount",
              rebate_calculation_type: "percentage",
              criteria: "Base",
              min_qty: 10,
              rebate_percentage: 5
            }
          ]
        };

        // Act
        const result = validateCreateProgram(invalidProgram);

        // Assert
        expect(result.error).toBeDefined();
        expect(result.error?.message).toContain("visibility_entities");
      });

      it("should validate with visibility_entities for SPECIFIC_DISTRIBUTORS", () => {
        // Arrange
        const validProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "SPECIFIC_DISTRIBUTORS",
          visibility_entities: [
            {
              entity_type: "DISTRIBUTOR",
              entity_id: 123
            }
          ],
          program_details: [
            {
              tier: 1,
              description: null,
              overview: null,
              program_line: null,
              rebate_type: "percentage",
              rebate_calculation: "Fixed $ amount",
              rebate_calculation_type: "percentage",
              criteria: "Base",
              min_qty: 10,
              rebate_percentage: 5
            }
          ]
        };

        // Act
        const result = validateCreateProgram(validProgram);

        // Assert
        expect(result.error).toBeUndefined();
      });

      it("should allow store_criteria instead of visibility_entities", () => {
        // Arrange
        const validProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "SPECIFIC_STORES",
          store_criteria: {
            rules: [
              {
                type: "customer_chain",
                chains: "chain1"
              }
            ]
          },
          program_details: [
            {
              tier: 1,
              description: null,
              overview: null,
              program_line: null,
              rebate_type: "percentage",
              rebate_calculation: "Fixed $ amount",
              rebate_calculation_type: "percentage",
              criteria: "Base",
              min_qty: 10,
              rebate_percentage: 5
            }
          ]
        };

        // Act
        const result = validateCreateProgram(validProgram);

        // Assert
        expect(result.error).toBeUndefined();
      });

      it("should forbid visibility_entities when scope is ALL_DISTRIBUTORS", () => {
        // Arrange
        const invalidProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "ALL_DISTRIBUTORS",
          visibility_entities: [
            {
              entity_type: "DISTRIBUTOR",
              entity_id: 123
            }
          ],
          program_details: [
            {
              tier: 1,
              description: null,
              overview: null,
              program_line: null,
              rebate_type: "percentage",
              rebate_calculation: "Fixed $ amount",
              rebate_calculation_type: "percentage",
              criteria: "Base",
              min_qty: 10,
              rebate_percentage: 5
            }
          ]
        };

        // Act
        const result = validateCreateProgram(invalidProgram);

        // Assert
        expect(result.error).toBeDefined();
        expect(result.error?.message).toContain("visibility_entities");
      });
    });

    describe("Program Details Validation - Base Criteria", () => {
      it("should validate Base criteria program detail", () => {
        // Arrange
        const validProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "ALL_DISTRIBUTORS",
          program_details: [
            {
              tier: 1,
              description: "Description",
              overview: "Overview",
              program_line: "Line 1",
              rebate_type: "percentage",
              rebate_calculation: "Fixed $ amount",
              rebate_calculation_type: "percentage",
              criteria: "Base",
              min_qty: 10,
              rebate_percentage: 5
            }
          ]
        };

        // Act
        const result = validateCreateProgram(validProgram);

        // Assert
        expect(result.error).toBeUndefined();
      });

      it("should validate Growth criteria program detail", () => {
        // Arrange
        const validProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "ALL_DISTRIBUTORS",
          program_details: [
            {
              tier: 1,
              description: "Growth tier",
              overview: "Overview",
              program_line: "Line 1",
              rebate_type: "flat",
              rebate_calculation: "Fixed $ amount",
              rebate_calculation_type: "flat",
              criteria: "Growth",
              min_qty: 20,
              rebate_amount: 100
            }
          ]
        };

        // Act
        const result = validateCreateProgram(validProgram);

        // Assert
        expect(result.error).toBeUndefined();
      });

      it("should require either rebate_amount or rebate_percentage (XOR)", () => {
        // Arrange
        const invalidProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "ALL_DISTRIBUTORS",
          program_details: [
            {
              tier: 1,
              description: null,
              overview: null,
              program_line: null,
              rebate_type: "percentage",
              rebate_calculation: "Fixed $ amount",
              rebate_calculation_type: "percentage",
              criteria: "Base",
              min_qty: 10
              // Missing both rebate_amount and rebate_percentage
            }
          ]
        };

        // Act
        const result = validateCreateProgram(invalidProgram);

        // Assert
        expect(result.error).toBeDefined();
      });

      it("should reject both rebate_amount and rebate_percentage (XOR)", () => {
        // Arrange
        const invalidProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "ALL_DISTRIBUTORS",
          program_details: [
            {
              tier: 1,
              description: null,
              overview: null,
              program_line: null,
              rebate_type: "percentage",
              rebate_calculation: "Fixed $ amount",
              rebate_calculation_type: "percentage",
              criteria: "Base",
              min_qty: 10,
              rebate_amount: 100,
              rebate_percentage: 5
            }
          ]
        };

        // Act
        const result = validateCreateProgram(invalidProgram);

        // Assert
        expect(result.error).toBeDefined();
      });
    });

    describe("Program Details Validation - PurchaseQuantity Criteria", () => {
      it("should validate PurchaseQuantity with valid quantity_type", () => {
        // Arrange
        const validProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "ALL_DISTRIBUTORS",
          program_details: [
            {
              tier: 1,
              description: null,
              overview: null,
              program_line: null,
              rebate_type: "percentage",
              rebate_calculation: "Fixed $ amount Per Quantity",
              rebate_calculation_type: "percentage",
              criteria: "Purchase Quantity",
              min_qty: 10,
              quantity_type: "case",
              rebate_percentage: 5
            }
          ]
        };

        // Act
        const result = validateCreateProgram(validProgram);

        // Assert
        expect(result.error).toBeUndefined();
      });

      it("should accept all valid quantity_type values", () => {
        // Arrange
        const validTypes = ["box", "case", "unit"];

        // Act & Assert
        validTypes.forEach((quantityType) => {
          const validProgram = {
            name: "Test Program",
            start_date: new Date("2025-01-01"),
            end_date: new Date("2025-12-31"),
            program_type: "REBATE",
            program_header: "Test Header",
            payment_term: "NET_30",
            target_audience: "STORE",
            participant_type: "STORE",
            visibility_scope: "ALL_DISTRIBUTORS",
            program_details: [
              {
                tier: 1,
                description: null,
                overview: null,
                program_line: null,
                rebate_type: "percentage",
                rebate_calculation: "Fixed $ amount Per Quantity",
                rebate_calculation_type: "percentage",
                criteria: "Purchase Quantity",
                min_qty: 10,
                quantity_type: quantityType,
                rebate_percentage: 5
              }
            ]
          };

          const result = validateCreateProgram(validProgram);
          expect(result.error).toBeUndefined();
        });
      });

      it("should reject invalid quantity_type", () => {
        // Arrange
        const invalidProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "ALL_DISTRIBUTORS",
          program_details: [
            {
              tier: 1,
              description: null,
              overview: null,
              program_line: null,
              rebate_type: "percentage",
              rebate_calculation: "Fixed $ amount Per Quantity",
              rebate_calculation_type: "percentage",
              criteria: "Purchase Quantity",
              min_qty: 10,
              quantity_type: "invalid_type",
              rebate_percentage: 5
            }
          ]
        };

        // Act
        const result = validateCreateProgram(invalidProgram);

        // Assert
        expect(result.error).toBeDefined();
        // Error is wrapped by custom validator
        expect(result.error?.message).toContain("program_details");
      });
    });

    describe("Program Details Validation - PurchaseValue Criteria", () => {
      it("should validate PurchaseValue with min_spend", () => {
        // Arrange
        const validProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "ALL_DISTRIBUTORS",
          program_details: [
            {
              tier: 1,
              description: null,
              overview: null,
              program_line: null,
              rebate_type: "percentage",
              rebate_calculation: "Fixed $ amount",
              rebate_calculation_type: "percentage",
              criteria: "Purchase Value",
              min_qty: 10,
              min_spend: 1000,
              rebate_percentage: 5
            }
          ]
        };

        // Act
        const result = validateCreateProgram(validProgram);

        // Assert
        expect(result.error).toBeUndefined();
      });

      it("should validate PurchaseValue with min_spend explicitly set", () => {
        // Arrange
        const validProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "ALL_DISTRIBUTORS",
          program_details: [
            {
              tier: 1,
              description: null,
              overview: null,
              program_line: null,
              rebate_type: "percentage",
              rebate_calculation: "Fixed $ amount",
              rebate_calculation_type: "percentage",
              criteria: "Purchase Value",
              min_qty: 10,
              min_spend: 500,
              rebate_percentage: 5
            }
          ]
        };

        // Act
        const result = validateCreateProgram(validProgram);

        // Assert
        expect(result.error).toBeUndefined();
        expect(result.value.program_details[0].min_spend).toBe(500);
      });
    });

    describe("Program Details Validation - CategorySKUs/PerItem/POD Criteria", () => {
      it("should validate CategorySKUs with products_tags", () => {
        // Arrange
        const validProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "ALL_DISTRIBUTORS",
          program_details: [
            {
              tier: 1,
              description: null,
              overview: null,
              program_line: null,
              rebate_type: "percentage",
              rebate_calculation: "Fixed $ amount",
              rebate_calculation_type: "percentage",
              criteria: "Category SKUs",
              min_qty: 10,
              products_tags: "tag1,tag2",
              products_tags_qty: "10,20",
              rebate_percentage: 5
            }
          ]
        };

        // Act
        const result = validateCreateProgram(validProgram);

        // Assert
        expect(result.error).toBeUndefined();
      });

      it("should validate PerItem criteria", () => {
        // Arrange
        const validProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "ALL_DISTRIBUTORS",
          program_details: [
            {
              tier: 1,
              description: null,
              overview: null,
              program_line: null,
              rebate_type: "flat",
              rebate_calculation: "Fixed $ amount Per Item Per Store (Per POD)",
              rebate_calculation_type: "flat",
              criteria: "Per Item",
              min_qty: 10,
              products_tags: "sku123",
              products_tags_qty: "5",
              products_tags_qty_max: "100",
              rebate_amount: 25
            }
          ]
        };

        // Act
        const result = validateCreateProgram(validProgram);

        // Assert
        expect(result.error).toBeUndefined();
      });

      it("should require products_tags for CategorySKUs", () => {
        // Arrange
        const invalidProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "ALL_DISTRIBUTORS",
          program_details: [
            {
              tier: 1,
              description: null,
              overview: null,
              program_line: null,
              rebate_type: "percentage",
              rebate_calculation: "Fixed $ amount",
              rebate_calculation_type: "percentage",
              criteria: "Category SKUs",
              min_qty: 10,
              rebate_percentage: 5
            }
          ]
        };

        // Act
        const result = validateCreateProgram(invalidProgram);

        // Assert
        expect(result.error).toBeDefined();
        // Error is wrapped by custom validator
        expect(result.error?.message).toContain("program_details");
      });
    });

    describe("Program Details Validation - SPIFF Criteria", () => {
      it("should validate BaseSPIFF criteria in program details", () => {
        // Arrange
        const validProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "ALL_DISTRIBUTORS",
          program_details: [
            {
              tier: 1,
              description: null,
              overview: null,
              program_line: null,
              rebate_type: "flat",
              rebate_calculation: "Fixed $ amount Per Store Compliance",
              rebate_calculation_type: "flat",
              criteria: "Base - SPIFF",
              min_qty: 5,
              rebate_amount: 50
            }
          ]
        };

        // Act
        const result = validateCreateProgram(validProgram);

        // Assert
        expect(result.error).toBeUndefined();
      });
    });

    describe("Program Details Validation - VOID_FILL Criteria", () => {
      it("should validate VOID_FILL with days_criteria", () => {
        // Arrange
        const validProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "ALL_DISTRIBUTORS",
          program_details: [
            {
              tier: 1,
              description: null,
              overview: null,
              program_line: null,
              rebate_type: "percentage",
              rebate_calculation: "Fixed $ amount",
              rebate_calculation_type: "percentage",
              criteria: "VOID_FILL",
              min_qty: 10,
              days_criteria: 30,
              rebate_percentage: 5
            }
          ]
        };

        // Act
        const result = validateCreateProgram(validProgram);

        // Assert
        expect(result.error).toBeUndefined();
      });

      it("should require days_criteria for VOID_FILL", () => {
        // Arrange
        const invalidProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "ALL_DISTRIBUTORS",
          program_details: [
            {
              tier: 1,
              description: null,
              overview: null,
              program_line: null,
              rebate_type: "percentage",
              rebate_calculation: "Fixed $ amount",
              rebate_calculation_type: "percentage",
              criteria: "VOID_FILL",
              min_qty: 10,
              rebate_percentage: 5
            }
          ]
        };

        // Act
        const result = validateCreateProgram(invalidProgram);

        // Assert
        expect(result.error).toBeDefined();
        // Error is wrapped by custom validator
        expect(result.error?.message).toContain("program_details");
      });
    });

    describe("Store Criteria Validation", () => {
      it("should validate store_criteria with customer_chain rule", () => {
        // Arrange
        const validProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "SPECIFIC_STORES",
          store_criteria: {
            rules: [
              {
                id: "rule1",
                type: "customer_chain",
                chains: [{ label: "Chain A", value: "1" }]
              }
            ]
          },
          program_details: [
            {
              tier: 1,
              description: null,
              overview: null,
              program_line: null,
              rebate_type: "percentage",
              rebate_calculation: "Fixed $ amount",
              rebate_calculation_type: "percentage",
              criteria: "Base",
              min_qty: 10,
              rebate_percentage: 5
            }
          ]
        };

        // Act
        const result = validateCreateProgram(validProgram);

        // Assert
        expect(result.error).toBeUndefined();
      });

      it("should validate store_criteria with specific_product rule", () => {
        // Arrange
        const validProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "SPECIFIC_STORES",
          store_criteria: {
            rules: [
              {
                type: "specific_product",
                operator: ">=",
                value1: 100,
                products: [
                  { label: "Product A", value: 1, description: "Test product" }
                ]
              }
            ]
          },
          program_details: [
            {
              tier: 1,
              description: null,
              overview: null,
              program_line: null,
              rebate_type: "percentage",
              rebate_calculation: "Fixed $ amount",
              rebate_calculation_type: "percentage",
              criteria: "Base",
              min_qty: 10,
              rebate_percentage: 5
            }
          ]
        };

        // Act
        const result = validateCreateProgram(validProgram);

        // Assert
        expect(result.error).toBeUndefined();
      });

      it("should validate store_criteria with category rule", () => {
        // Arrange
        const validProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "SPECIFIC_STORES",
          store_criteria: {
            rules: [
              {
                type: "category",
                operator: ">=",
                value1: 500,
                startDate: "2025-01-01",
                endDate: "2025-12-31",
                category: { label: "Category A", value: "cat1" }
              }
            ]
          },
          program_details: [
            {
              tier: 1,
              description: null,
              overview: null,
              program_line: null,
              rebate_type: "percentage",
              rebate_calculation: "Fixed $ amount",
              rebate_calculation_type: "percentage",
              criteria: "Base",
              min_qty: 10,
              rebate_percentage: 5
            }
          ]
        };

        // Act
        const result = validateCreateProgram(validProgram);

        // Assert
        expect(result.error).toBeUndefined();
      });

      it("should validate store_criteria with between operator", () => {
        // Arrange
        const validProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "SPECIFIC_STORES",
          store_criteria: {
            rules: [
              {
                type: "category",
                operator: "between",
                value1: 100,
                value2: 500,
                category: { label: "Category B", value: "cat2" }
              }
            ]
          },
          program_details: [
            {
              tier: 1,
              description: null,
              overview: null,
              program_line: null,
              rebate_type: "percentage",
              rebate_calculation: "Fixed $ amount",
              rebate_calculation_type: "percentage",
              criteria: "Base",
              min_qty: 10,
              rebate_percentage: 5
            }
          ]
        };

        // Act
        const result = validateCreateProgram(validProgram);

        // Assert
        expect(result.error).toBeUndefined();
      });
    });

    describe("Optional Fields", () => {
      it("should accept optional approval_status", () => {
        // Arrange
        const validProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "ALL_DISTRIBUTORS",
          approval_status: "PENDING",
          program_details: [
            {
              tier: 1,
              description: null,
              overview: null,
              program_line: null,
              rebate_type: "percentage",
              rebate_calculation: "Fixed $ amount",
              rebate_calculation_type: "percentage",
              criteria: "Base",
              min_qty: 10,
              rebate_percentage: 5
            }
          ]
        };

        // Act
        const result = validateCreateProgram(validProgram);

        // Assert
        expect(result.error).toBeUndefined();
        expect(result.value.approval_status).toBe("PENDING");
      });

      it("should accept optional manufacturer_id", () => {
        // Arrange
        const validProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "ALL_DISTRIBUTORS",
          manufacturer_id: 456,
          program_details: [
            {
              tier: 1,
              description: null,
              overview: null,
              program_line: null,
              rebate_type: "percentage",
              rebate_calculation: "Fixed $ amount",
              rebate_calculation_type: "percentage",
              criteria: "Base",
              min_qty: 10,
              rebate_percentage: 5
            }
          ]
        };

        // Act
        const result = validateCreateProgram(validProgram);

        // Assert
        expect(result.error).toBeUndefined();
        expect(result.value.manufacturer_id).toBe(456);
      });

      it("should accept optional excluded_stores array", () => {
        // Arrange
        const validProgram = {
          name: "Test Program",
          start_date: new Date("2025-01-01"),
          end_date: new Date("2025-12-31"),
          program_type: "REBATE",
          program_header: "Test Header",
          payment_term: "NET_30",
          target_audience: "STORE",
          participant_type: "STORE",
          visibility_scope: "ALL_DISTRIBUTORS",
          excluded_stores: [1, 2, 3],
          program_details: [
            {
              tier: 1,
              description: null,
              overview: null,
              program_line: null,
              rebate_type: "percentage",
              rebate_calculation: "Fixed $ amount",
              rebate_calculation_type: "percentage",
              criteria: "Base",
              min_qty: 10,
              rebate_percentage: 5
            }
          ]
        };

        // Act
        const result = validateCreateProgram(validProgram);

        // Assert
        expect(result.error).toBeUndefined();
        expect(result.value.excluded_stores).toEqual([1, 2, 3]);
      });
    });
  });

  describe("validateUpdateProgram", () => {
    it("should validate valid program update", () => {
      // Arrange
      const validUpdate = {
        program_id: 123,
        name: "Updated Program",
        start_date: new Date("2025-01-01"),
        end_date: new Date("2025-12-31"),
        program_type: "REBATE",
        program_header: "Updated Header",
        payment_term: "NET_60",
        target_audience: "DISTRIBUTOR",
        participant_type: "DISTRIBUTOR",
        visibility_scope: "ALL_DISTRIBUTORS",
        program_details: [
          {
            tier: 1,
            description: null,
            overview: null,
            program_line: null,
            rebate_type: "percentage",
            rebate_calculation: "Fixed $ amount",
            rebate_calculation_type: "percentage",
            criteria: "Base",
            min_qty: 15,
            rebate_percentage: 7.5
          }
        ]
      };

      // Act
      const result = validateUpdateProgram(validUpdate);

      // Assert
      expect(result.error).toBeUndefined();
      expect(result.value.program_id).toBe(123);
    });

    it("should require program_id for update", () => {
      // Arrange
      const invalidUpdate = {
        name: "Updated Program",
        start_date: new Date("2025-01-01"),
        end_date: new Date("2025-12-31"),
        program_type: "REBATE",
        program_header: "Updated Header",
        payment_term: "NET_60",
        target_audience: "DISTRIBUTOR",
        participant_type: "DISTRIBUTOR",
        visibility_scope: "ALL_DISTRIBUTORS",
        program_details: [
          {
            tier: 1,
            description: null,
            overview: null,
            program_line: null,
            rebate_type: "percentage",
            rebate_calculation: "Fixed $ amount",
            rebate_calculation_type: "percentage",
            criteria: "Base",
            min_qty: 15,
            rebate_percentage: 7.5
          }
        ]
      };

      // Act
      const result = validateUpdateProgram(invalidUpdate);

      // Assert
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain("program_id");
    });

    it("should validate update with visibility_entities", () => {
      // Arrange
      const validUpdate = {
        program_id: 123,
        name: "Updated Program",
        start_date: new Date("2025-01-01"),
        end_date: new Date("2025-12-31"),
        program_type: "REBATE",
        program_header: "Updated Header",
        payment_term: "NET_60",
        target_audience: "DISTRIBUTOR",
        participant_type: "DISTRIBUTOR",
        visibility_scope: "SPECIFIC_DISTRIBUTORS",
        visibility_entities: [
          {
            entity_type: "DISTRIBUTOR",
            entity_id: 789
          }
        ],
        program_details: [
          {
            tier: 1,
            description: null,
            overview: null,
            program_line: null,
            rebate_type: "percentage",
            rebate_calculation: "Fixed $ amount",
            rebate_calculation_type: "percentage",
            criteria: "Base",
            min_qty: 15,
            rebate_percentage: 7.5
          }
        ]
      };

      // Act
      const result = validateUpdateProgram(validUpdate);

      // Assert
      expect(result.error).toBeUndefined();
    });

    it("should not allow ALL_SALES_REPS in update visibility_scope", () => {
      // Arrange
      const invalidUpdate = {
        program_id: 123,
        name: "Updated Program",
        start_date: new Date("2025-01-01"),
        end_date: new Date("2025-12-31"),
        program_type: "REBATE",
        program_header: "Updated Header",
        payment_term: "NET_60",
        target_audience: "SALES_REP",
        participant_type: "SALES_REP",
        visibility_scope: "ALL_SALES_REPS",
        program_details: [
          {
            tier: 1,
            description: null,
            overview: null,
            program_line: null,
            rebate_type: "percentage",
            rebate_calculation: "Fixed $ amount",
            rebate_calculation_type: "percentage",
            criteria: "Base",
            min_qty: 15,
            rebate_percentage: 7.5
          }
        ]
      };

      // Act
      const result = validateUpdateProgram(invalidUpdate);

      // Assert
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain("visibility_scope");
    });
  });
});

import { ProgramsDetailCriteria } from "../../config/appConstants";
import { validateCreateProgram } from "../../validators/programValidator";

describe("Program Validator", () => {
  // Common program data used in all tests
  const baseProgram = {
    name: "Test Program",
    start_date: new Date(),
    end_date: new Date(),
    program_type: "REBATE",
    program_header: "Test Header",
    payment_term: "30",
    target_audience: "DISTRIBUTOR",
    participant_type: "DISTRIBUTOR",
    visibility_scope: "ALL_DISTRIBUTORS",
    program_details: []
  };

  // Common fields required in all program details
  const baseDetailFields = {
    tier: 1,
    description: "Test Description",
    overview: "Test Overview",
    program_line: "Test Line",
    rebate_type: "fixed",
    rebate_calculation: "Fixed $ amount Per Store Compliance",
    rebate_calculation_type: "landed_value",
    rebate_amount: 100
  };

  describe("Base Criteria", () => {
    it("should validate a valid Base criteria program detail", () => {
      const programDetail = {
        ...baseDetailFields,
        min_qty: 10,
        criteria: ProgramsDetailCriteria.Base
      };

      const program = {
        ...baseProgram,
        program_details: [programDetail]
      };

      const { error } = validateCreateProgram(program);
      expect(error).toBeUndefined();
    });

    it("should fail validation when min_qty is missing", () => {
      const programDetail = {
        ...baseDetailFields,
        criteria: ProgramsDetailCriteria.Base
      };

      const program = {
        ...baseProgram,
        program_details: [programDetail]
      };

      const { error } = validateCreateProgram(program);
      expect(error).toBeDefined();
    });
  });

  describe("BaseSPIFF Criteria", () => {
    it("should validate a valid BaseSPIFF criteria program detail", () => {
      const programDetail = {
        ...baseDetailFields,
        min_qty: 10,
        criteria: ProgramsDetailCriteria.BaseSPIFF,
        products_tags: "tag1,tag2",
        products_tags_qty: "1,2",
        quantity_type: "unit"
      };

      const program = {
        ...baseProgram,
        program_details: [programDetail]
      };

      const { error } = validateCreateProgram(program);
      expect(error).toBeUndefined();
    });

    it("should validate BaseSPIFF with only required fields", () => {
      const programDetail = {
        ...baseDetailFields,
        min_qty: 10,
        criteria: ProgramsDetailCriteria.BaseSPIFF
      };

      const program = {
        ...baseProgram,
        program_details: [programDetail]
      };

      const { error } = validateCreateProgram(program);
      expect(error).toBeUndefined();
    });
  });

  describe("PurchaseValue Criteria", () => {
    it("should validate a valid PurchaseValue criteria program detail", () => {
      const programDetail = {
        ...baseDetailFields,
        min_qty: 10,
        min_spend: 1000,
        criteria: ProgramsDetailCriteria.PurchaseValue
      };

      const program = {
        ...baseProgram,
        program_details: [programDetail]
      };

      const { error } = validateCreateProgram(program);
      expect(error).toBeUndefined();
    });

    it("should fail validation when min_spend is missing", () => {
      const programDetail = {
        ...baseDetailFields,
        min_qty: 10,
        criteria: ProgramsDetailCriteria.PurchaseValue
      };

      const program = {
        ...baseProgram,
        program_details: [programDetail]
      };

      const { error } = validateCreateProgram(program);
      expect(error).toBeDefined();
    });
  });

  describe("PurchaseQuantity Criteria", () => {
    it("should validate a valid PurchaseQuantity criteria program detail", () => {
      const programDetail = {
        ...baseDetailFields,
        min_qty: 10,
        max_qty: 100,
        quantity_type: "box",
        criteria: ProgramsDetailCriteria.PurchaseQuantity
      };

      const program = {
        ...baseProgram,
        program_details: [programDetail]
      };

      const { error } = validateCreateProgram(program);
      expect(error).toBeUndefined();
    });

    it("should fail validation when quantity_type is missing", () => {
      const programDetail = {
        ...baseDetailFields,
        min_qty: 10,
        max_qty: 100,
        criteria: ProgramsDetailCriteria.PurchaseQuantity
      };

      const program = {
        ...baseProgram,
        program_details: [programDetail]
      };

      const { error } = validateCreateProgram(program);
      expect(error).toBeDefined();
    });

    it("should fail validation when quantity_type is invalid", () => {
      const programDetail = {
        ...baseDetailFields,
        min_qty: 10,
        max_qty: 100,
        quantity_type: "invalid",
        criteria: ProgramsDetailCriteria.PurchaseQuantity
      };

      const program = {
        ...baseProgram,
        program_details: [programDetail]
      };

      const { error } = validateCreateProgram(program);
      expect(error).toBeDefined();
    });
  });

  describe("CategorySKUs Criteria", () => {
    it("should validate a valid CategorySKUs criteria program detail", () => {
      const programDetail = {
        ...baseDetailFields,
        min_qty: 10,
        products_tags: "tag1,tag2",
        products_tags_qty: "1,2",
        products_tags_qty_max: "5,10",
        criteria: ProgramsDetailCriteria.CategorySKUs
      };

      const program = {
        ...baseProgram,
        program_details: [programDetail]
      };

      const { error } = validateCreateProgram(program);
      expect(error).toBeUndefined();
    });

    it("should fail validation when products_tags is missing", () => {
      const programDetail = {
        ...baseDetailFields,
        min_qty: 10,
        products_tags_qty: "1,2",
        criteria: ProgramsDetailCriteria.CategorySKUs
      };

      const program = {
        ...baseProgram,
        program_details: [programDetail]
      };

      const { error } = validateCreateProgram(program);
      expect(error).toBeDefined();
    });

    it("should fail validation when products_tags_qty is missing", () => {
      const programDetail = {
        ...baseDetailFields,
        min_qty: 10,
        products_tags: "tag1,tag2",
        criteria: ProgramsDetailCriteria.CategorySKUs
      };

      const program = {
        ...baseProgram,
        program_details: [programDetail]
      };

      const { error } = validateCreateProgram(program);
      expect(error).toBeDefined();
    });
  });

  describe("Growth Criteria", () => {
    it("should validate a valid Growth criteria program detail", () => {
      const programDetail = {
        ...baseDetailFields,
        min_qty: 10,
        criteria: ProgramsDetailCriteria.Growth
      };

      const program = {
        ...baseProgram,
        program_details: [programDetail]
      };

      const { error } = validateCreateProgram(program);
      expect(error).toBeUndefined();
    });
  });

  describe("POD Criteria", () => {
    it("should validate a valid POD criteria program detail", () => {
      const programDetail = {
        ...baseDetailFields,
        min_qty: 10,
        products_tags: "tag1,tag2",
        products_tags_qty: "1,2",
        criteria: ProgramsDetailCriteria.POD
      };

      const program = {
        ...baseProgram,
        program_details: [programDetail]
      };

      const { error } = validateCreateProgram(program);
      expect(error).toBeUndefined();
    });

    it("should fail validation when required fields are missing", () => {
      const programDetail = {
        ...baseDetailFields,
        min_qty: 10,
        criteria: ProgramsDetailCriteria.POD
      };

      const program = {
        ...baseProgram,
        program_details: [programDetail]
      };

      const { error } = validateCreateProgram(program);
      expect(error).toBeDefined();
    });
  });

  describe("PerItem Criteria", () => {
    it("should validate a valid PerItem criteria program detail", () => {
      const programDetail = {
        ...baseDetailFields,
        min_qty: 10,
        products_tags: "tag1,tag2",
        products_tags_qty: "1,2",
        criteria: ProgramsDetailCriteria.PerItem
      };

      const program = {
        ...baseProgram,
        program_details: [programDetail]
      };

      const { error } = validateCreateProgram(program);
      expect(error).toBeUndefined();
    });

    it("should fail validation when required fields are missing", () => {
      const programDetail = {
        ...baseDetailFields,
        min_qty: 10,
        criteria: ProgramsDetailCriteria.PerItem
      };

      const program = {
        ...baseProgram,
        program_details: [programDetail]
      };

      const { error } = validateCreateProgram(program);
      expect(error).toBeDefined();
    });
  });

  describe("Multiple program details", () => {
    it("should validate a program with multiple valid details of different criteria", () => {
      const program = {
        ...baseProgram,
        program_details: [
          {
            ...baseDetailFields,
            min_qty: 10,
            criteria: ProgramsDetailCriteria.Base
          },
          {
            ...baseDetailFields,
            min_qty: 20,
            min_spend: 1000,
            criteria: ProgramsDetailCriteria.PurchaseValue
          },
          {
            ...baseDetailFields,
            min_qty: 5,
            products_tags: "tag1,tag2",
            products_tags_qty: "1,2",
            criteria: ProgramsDetailCriteria.CategorySKUs
          }
        ]
      };

      const { error } = validateCreateProgram(program);
      expect(error).toBeUndefined();
    });
  });

  describe("Invalid criteria", () => {
    it("should fail validation for unknown criteria type", () => {
      const programDetail = {
        ...baseDetailFields,
        min_qty: 10,
        criteria: "INVALID_CRITERIA"
      };

      const program = {
        ...baseProgram,
        program_details: [programDetail]
      };

      const { error } = validateCreateProgram(program);
      expect(error).toBeDefined();
    });

    it("should fail validation when criteria is missing", () => {
      const programDetail = {
        ...baseDetailFields,
        min_qty: 10
      };

      const program = {
        ...baseProgram,
        program_details: [programDetail]
      };

      const { error } = validateCreateProgram(program);
      expect(error).toBeDefined();
    });
  });

  describe("Rebate amount vs percentage", () => {
    it("should validate when rebate_amount is provided", () => {
      const programDetail = {
        ...baseDetailFields,
        min_qty: 10,
        criteria: ProgramsDetailCriteria.Base
      };

      const program = {
        ...baseProgram,
        program_details: [programDetail]
      };

      const { error } = validateCreateProgram(program);
      expect(error).toBeUndefined();
    });

    it("should validate when rebate_percentage is provided instead of amount", () => {
      const programDetailWithRebatePercentage = {
        tier: 1,
        min_qty: 10,
        description: "Test Description",
        overview: "Test Overview",
        program_line: "Test Line",
        rebate_type: "REBATE",
        rebate_calculation: "Fixed $ amount",
        rebate_calculation_type: "landed_value",
        rebate_percentage: 10,
        criteria: ProgramsDetailCriteria.Base
      };

      const program = {
        ...baseProgram,
        program_details: [programDetailWithRebatePercentage]
      };

      const { error } = validateCreateProgram(program);
      expect(error).toBeUndefined();
    });

    it("should fail when both rebate_amount and rebate_percentage are missing", () => {
      const programDetail = {
        tier: 1,
        min_qty: 10,
        description: "Test Description",
        overview: "Test Overview",
        program_line: "Test Line",
        rebate_type: "FIXED",
        rebate_calculation: "PER_UNIT",
        rebate_calculation_type: "FIXED",
        criteria: ProgramsDetailCriteria.Base
      };

      const program = {
        ...baseProgram,
        program_details: [programDetail]
      };

      const { error } = validateCreateProgram(program);
      expect(error).toBeDefined();
    });

    it("should fail when both rebate_amount and rebate_percentage are provided", () => {
      const programDetail = {
        ...baseDetailFields,
        min_qty: 10,
        rebate_amount: 100,
        rebate_percentage: 10,
        criteria: ProgramsDetailCriteria.Base
      };

      const program = {
        ...baseProgram,
        program_details: [programDetail]
      };

      const { error } = validateCreateProgram(program);
      expect(error).toBeDefined();
    });
  });
});

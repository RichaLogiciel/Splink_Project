import { ENTITY_TYPE } from "../../config/appConstants";
import {
  ManufacturerProgram,
  ProgramDetail,
  ProgramOverview
} from "../../types/ProgramTypes";

describe("Program Validation", () => {
  describe("Program Detail Validation", () => {
    const validProgramDetail: ProgramDetail = {
      id: 1,
      tier: 1,
      min_qty: "10",
      rebate_type: "percentage",
      rebate_calculation: "10%",
      program_id: 1,
      overview: "Test Overview"
    };

    it("should validate program detail structure", () => {
      expect(validateProgramDetail(validProgramDetail)).toBe(true);
    });

    it("should validate tier ranges", () => {
      const invalidTier = { ...validProgramDetail, tier: 0 };
      expect(validateProgramDetail(invalidTier)).toBe(false);

      const highTier = { ...validProgramDetail, tier: 1000 };
      expect(validateProgramDetail(highTier)).toBe(false);
    });

    it("should validate rebate calculations", () => {
      const invalidRebate = {
        ...validProgramDetail,
        rebate_calculation: "invalid"
      };
      expect(validateProgramDetail(invalidRebate)).toBe(false);

      const validPercentage = {
        ...validProgramDetail,
        rebate_calculation: "15%"
      };
      expect(validateProgramDetail(validPercentage)).toBe(true);

      const validFixed = { ...validProgramDetail, rebate_calculation: "$100" };
      expect(validateProgramDetail(validFixed)).toBe(true);
    });
  });

  describe("Program Overview Validation", () => {
    const validProgramOverview: ProgramOverview = {
      id: 1,
      name: "Test Program",
      programType: "TIER",
      programTerms: "ANNUAL",
      programHeader: "Core Distribution",
      compliances: [],
      programEntityType: ENTITY_TYPE.DISTRIBUTOR,
      programDetails: [
        {
          id: 1,
          tier: 1,
          min_qty: "10",
          rebate_type: "percentage",
          rebate_calculation: "10%",
          program_id: 1,
          overview: "Test Overview"
        }
      ]
    };

    it("should validate program overview structure", () => {
      expect(validateProgramOverview(validProgramOverview)).toBe(true);
    });

    it("should validate program types", () => {
      const invalidType = { ...validProgramOverview, programType: "INVALID" };
      expect(validateProgramOverview(invalidType)).toBe(false);
    });

    it("should validate program terms", () => {
      const invalidTerms = { ...validProgramOverview, programTerms: "INVALID" };
      expect(validateProgramOverview(invalidTerms)).toBe(false);
    });

    it("should validate entity types", () => {
      const invalidEntity = {
        ...validProgramOverview,
        programEntityType: "INVALID" as ENTITY_TYPE
      };
      expect(validateProgramOverview(invalidEntity)).toBe(false);
    });
  });

  describe("Manufacturer Program Validation", () => {
    const validManufacturerProgram: ManufacturerProgram = {
      manufacturerName: "Test Manufacturer",
      manufacturerLogo: "http://example.com/logo.png",
      manufacturerId: 1,
      totalPurchaseVolume: 1000,
      totalSaving: 200,
      program_overview: [
        {
          id: 1,
          name: "Test Program",
          programType: "TIER",
          programTerms: "ANNUAL",
          programHeader: "Core Distribution",
          compliances: [],
          programEntityType: ENTITY_TYPE.DISTRIBUTOR,
          programDetails: [
            {
              id: 1,
              tier: 1,
              min_qty: "10",
              rebate_type: "percentage",
              rebate_calculation: "10%",
              program_id: 1,
              overview: "Test Overview"
            }
          ]
        }
      ]
    };

    it("should validate manufacturer program structure", () => {
      expect(validateManufacturerProgram(validManufacturerProgram)).toBe(true);
    });

    it("should validate manufacturer ID", () => {
      const invalidId = { ...validManufacturerProgram, manufacturerId: -1 };
      expect(validateManufacturerProgram(invalidId)).toBe(false);
    });

    it("should validate purchase volume", () => {
      const invalidVolume = {
        ...validManufacturerProgram,
        totalPurchaseVolume: -1000
      };
      expect(validateManufacturerProgram(invalidVolume)).toBe(false);
    });

    it("should validate savings", () => {
      const invalidSavings = { ...validManufacturerProgram, totalSaving: -200 };
      expect(validateManufacturerProgram(invalidSavings)).toBe(false);
    });

    it("should validate manufacturer logo URL", () => {
      const invalidUrl = {
        ...validManufacturerProgram,
        manufacturerLogo: "invalid-url"
      };
      expect(validateManufacturerProgram(invalidUrl)).toBe(false);

      const validHttps = {
        ...validManufacturerProgram,
        manufacturerLogo: "https://example.com/logo.png"
      };
      expect(validateManufacturerProgram(validHttps)).toBe(true);
    });
  });
});

// Validation functions
function validateProgramDetail(detail: ProgramDetail): boolean {
  if (!detail) return false;

  // Validate tier
  if (detail.tier < 1 || detail.tier > 100) return false;

  // Validate rebate calculation format
  const rebatePattern = /^(\d+(\.\d{1,2})?%|\$\d+(\.\d{2})?)$/;
  if (!rebatePattern.test(detail.rebate_calculation)) return false;

  // Validate IDs
  if (detail.id < 1 || detail.program_id < 1) return false;

  // Validate rebate type
  if (!["percentage", "fixed"].includes(detail.rebate_type)) return false;

  return true;
}

function validateProgramOverview(overview: ProgramOverview): boolean {
  if (!overview) return false;

  // Validate program type
  const validTypes = ["TIER", "FIXED", "PERCENTAGE"];
  if (!validTypes.includes(overview.programType)) return false;

  // Validate program terms
  const validTerms = ["ANNUAL", "SEMI-ANNUAL", "QUARTERLY", "MONTHLY"];
  if (!validTerms.includes(overview.programTerms)) return false;

  // Validate entity type
  if (
    !Object.values(ENTITY_TYPE).includes(
      overview.programEntityType as ENTITY_TYPE
    )
  )
    return false;

  // Validate program details
  if (
    !Array.isArray(overview.programDetails) ||
    overview.programDetails.length === 0
  )
    return false;

  return overview.programDetails.every(validateProgramDetail);
}

function validateManufacturerProgram(program: ManufacturerProgram): boolean {
  if (!program) return false;

  // Validate manufacturer ID
  if (program.manufacturerId < 1) return false;

  // Validate volumes and savings
  if (program.totalPurchaseVolume < 0 || program.totalSaving < 0) return false;

  // Validate logo URL if present
  if (program.manufacturerLogo) {
    try {
      const url = new URL(program.manufacturerLogo);
      if (!["http:", "https:"].includes(url.protocol)) return false;
    } catch {
      return false;
    }
  }

  // Validate program overviews
  if (
    !Array.isArray(program.program_overview) ||
    program.program_overview.length === 0
  )
    return false;

  return program.program_overview.every(validateProgramOverview);
}

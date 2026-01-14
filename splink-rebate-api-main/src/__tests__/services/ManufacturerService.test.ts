/**
 * ManufacturerService Tests
 *
 * Tests for manufacturer business logic and calculations
 * Focuses on rebate calculations and program compliance logic
 */

import ManufacturerService from "../../services/ManufacturerService";
import {
  ENTITY_TYPE,
  ProgramsComplianceStatus
} from "../../config/appConstants";

describe("ManufacturerService", () => {
  describe("calculateRebateAndCompletedPrograms", () => {
    it("should calculate earned rebate and completed programs for qualified compliances", () => {
      // Arrange
      const storeId = 100;
      const programCompliances = [
        {
          storeid: 100,
          programid: 1,
          programdetailid: 10,
          isqualified: true,
          status: ProgramsComplianceStatus.Active,
          earnedrebate: "50.00"
        },
        {
          storeid: 100,
          programid: 2,
          programdetailid: 20,
          isqualified: true,
          status: ProgramsComplianceStatus.Active,
          earnedrebate: "75.50"
        }
      ] as any;

      const programs = [
        {
          program_id: 1,
          program_detail_id: 10,
          visibility_entity_type: ENTITY_TYPE.DISTRIBUTOR
        },
        {
          program_id: 2,
          program_detail_id: 20,
          visibility_entity_type: ENTITY_TYPE.DISTRIBUTOR
        }
      ];

      // Act
      const result = ManufacturerService.calculateRebateAndCompletedPrograms(
        programCompliances,
        storeId,
        programs
      );

      // Assert
      expect(result.earnedRebate).toBe(125.5);
      expect(result.completedPrograms).toBe(2);
    });

    it("should exclude compliances for different stores", () => {
      // Arrange
      const storeId = 100;
      const programCompliances = [
        {
          storeid: 100,
          programid: 1,
          programdetailid: 10,
          isqualified: true,
          status: ProgramsComplianceStatus.Active,
          earnedrebate: "50.00"
        },
        {
          storeid: 200, // Different store
          programid: 2,
          programdetailid: 20,
          isqualified: true,
          status: ProgramsComplianceStatus.Active,
          earnedrebate: "75.00"
        }
      ] as any;

      const programs = [
        {
          program_id: 1,
          program_detail_id: 10,
          visibility_entity_type: ENTITY_TYPE.DISTRIBUTOR
        },
        {
          program_id: 2,
          program_detail_id: 20,
          visibility_entity_type: ENTITY_TYPE.DISTRIBUTOR
        }
      ];

      // Act
      const result = ManufacturerService.calculateRebateAndCompletedPrograms(
        programCompliances,
        storeId,
        programs
      );

      // Assert
      expect(result.earnedRebate).toBe(50);
      expect(result.completedPrograms).toBe(1);
    });

    it("should exclude non-qualified compliances", () => {
      // Arrange
      const storeId = 100;
      const programCompliances = [
        {
          storeid: 100,
          programid: 1,
          programdetailid: 10,
          isqualified: true,
          status: ProgramsComplianceStatus.Active,
          earnedrebate: "50.00"
        },
        {
          storeid: 100,
          programid: 2,
          programdetailid: 20,
          isqualified: false, // Not qualified
          status: ProgramsComplianceStatus.Active,
          earnedrebate: "75.00"
        }
      ] as any;

      const programs = [
        {
          program_id: 1,
          program_detail_id: 10,
          visibility_entity_type: ENTITY_TYPE.DISTRIBUTOR
        },
        {
          program_id: 2,
          program_detail_id: 20,
          visibility_entity_type: ENTITY_TYPE.DISTRIBUTOR
        }
      ];

      // Act
      const result = ManufacturerService.calculateRebateAndCompletedPrograms(
        programCompliances,
        storeId,
        programs
      );

      // Assert
      expect(result.earnedRebate).toBe(50);
      expect(result.completedPrograms).toBe(1);
    });

    it("should only count active status for earned rebate", () => {
      // Arrange
      const storeId = 100;
      const programCompliances = [
        {
          storeid: 100,
          programid: 1,
          programdetailid: 10,
          isqualified: true,
          status: ProgramsComplianceStatus.Active,
          earnedrebate: "50.00"
        },
        {
          storeid: 100,
          programid: 2,
          programdetailid: 20,
          isqualified: true,
          status: "Inactive", // Not active
          earnedrebate: "75.00"
        }
      ] as any;

      const programs = [
        {
          program_id: 1,
          program_detail_id: 10,
          visibility_entity_type: ENTITY_TYPE.DISTRIBUTOR
        },
        {
          program_id: 2,
          program_detail_id: 20,
          visibility_entity_type: ENTITY_TYPE.DISTRIBUTOR
        }
      ];

      // Act
      const result = ManufacturerService.calculateRebateAndCompletedPrograms(
        programCompliances,
        storeId,
        programs
      );

      // Assert
      expect(result.earnedRebate).toBe(50); // Only active one counted
      expect(result.completedPrograms).toBe(2); // Both still count as completed
    });

    it("should skip compliances without matching programs", () => {
      // Arrange
      const storeId = 100;
      const programCompliances = [
        {
          storeid: 100,
          programid: 1,
          programdetailid: 10,
          isqualified: true,
          status: ProgramsComplianceStatus.Active,
          earnedrebate: "50.00"
        },
        {
          storeid: 100,
          programid: 999, // No matching program
          programdetailid: 999,
          isqualified: true,
          status: ProgramsComplianceStatus.Active,
          earnedrebate: "75.00"
        }
      ] as any;

      const programs = [
        {
          program_id: 1,
          program_detail_id: 10,
          visibility_entity_type: ENTITY_TYPE.DISTRIBUTOR
        }
      ];

      // Act
      const result = ManufacturerService.calculateRebateAndCompletedPrograms(
        programCompliances,
        storeId,
        programs
      );

      // Assert
      expect(result.earnedRebate).toBe(50);
      expect(result.completedPrograms).toBe(1);
    });

    it("should exclude stores not in visible entity ids for STORE visibility type", () => {
      // Arrange
      const storeId = 100;
      const programCompliances = [
        {
          storeid: 100,
          programid: 1,
          programdetailid: 10,
          isqualified: true,
          status: ProgramsComplianceStatus.Active,
          earnedrebate: "50.00"
        },
        {
          storeid: 100,
          programid: 2,
          programdetailid: 20,
          isqualified: true,
          status: ProgramsComplianceStatus.Active,
          earnedrebate: "75.00"
        }
      ] as any;

      const programs = [
        {
          program_id: 1,
          program_detail_id: 10,
          visibility_entity_type: ENTITY_TYPE.DISTRIBUTOR
        },
        {
          program_id: 2,
          program_detail_id: 20,
          visibility_entity_type: ENTITY_TYPE.STORE,
          visible_entity_ids: [200, 300] // Store 100 not included
        }
      ];

      // Act
      const result = ManufacturerService.calculateRebateAndCompletedPrograms(
        programCompliances,
        storeId,
        programs
      );

      // Assert
      expect(result.earnedRebate).toBe(50); // Only first program counted
      expect(result.completedPrograms).toBe(1);
    });

    it("should include stores in visible entity ids for STORE visibility type", () => {
      // Arrange
      const storeId = 100;
      const programCompliances = [
        {
          storeid: 100,
          programid: 1,
          programdetailid: 10,
          isqualified: true,
          status: ProgramsComplianceStatus.Active,
          earnedrebate: "50.00"
        },
        {
          storeid: 100,
          programid: 2,
          programdetailid: 20,
          isqualified: true,
          status: ProgramsComplianceStatus.Active,
          earnedrebate: "75.00"
        }
      ] as any;

      const programs = [
        {
          program_id: 1,
          program_detail_id: 10,
          visibility_entity_type: ENTITY_TYPE.DISTRIBUTOR
        },
        {
          program_id: 2,
          program_detail_id: 20,
          visibility_entity_type: ENTITY_TYPE.STORE,
          visible_entity_ids: [100, 200] // Store 100 included
        }
      ];

      // Act
      const result = ManufacturerService.calculateRebateAndCompletedPrograms(
        programCompliances,
        storeId,
        programs
      );

      // Assert
      expect(result.earnedRebate).toBe(125);
      expect(result.completedPrograms).toBe(2);
    });

    it("should handle empty program compliances", () => {
      // Arrange
      const storeId = 100;
      const programCompliances: any[] = [];
      const programs: any[] = [];

      // Act
      const result = ManufacturerService.calculateRebateAndCompletedPrograms(
        programCompliances,
        storeId,
        programs
      );

      // Assert
      expect(result.earnedRebate).toBe(0);
      expect(result.completedPrograms).toBe(0);
    });

    it("should handle null or undefined earnedrebate", () => {
      // Arrange
      const storeId = 100;
      const programCompliances = [
        {
          storeid: 100,
          programid: 1,
          programdetailid: 10,
          isqualified: true,
          status: ProgramsComplianceStatus.Active,
          earnedrebate: null
        },
        {
          storeid: 100,
          programid: 2,
          programdetailid: 20,
          isqualified: true,
          status: ProgramsComplianceStatus.Active,
          earnedrebate: undefined
        }
      ] as any;

      const programs = [
        {
          program_id: 1,
          program_detail_id: 10,
          visibility_entity_type: ENTITY_TYPE.DISTRIBUTOR
        },
        {
          program_id: 2,
          program_detail_id: 20,
          visibility_entity_type: ENTITY_TYPE.DISTRIBUTOR
        }
      ];

      // Act
      const result = ManufacturerService.calculateRebateAndCompletedPrograms(
        programCompliances,
        storeId,
        programs
      );

      // Assert
      expect(result.earnedRebate).toBe(0);
      expect(result.completedPrograms).toBe(2);
    });

    it("should handle programs without visibility restrictions", () => {
      // Arrange
      const storeId = 100;
      const programCompliances = [
        {
          storeid: 100,
          programid: 1,
          programdetailid: 10,
          isqualified: true,
          status: ProgramsComplianceStatus.Active,
          earnedrebate: "100.00"
        }
      ] as any;

      const programs = [
        {
          program_id: 1,
          program_detail_id: 10
          // No visibility_entity_type specified
        }
      ];

      // Act
      const result = ManufacturerService.calculateRebateAndCompletedPrograms(
        programCompliances,
        storeId,
        programs
      );

      // Assert
      expect(result.earnedRebate).toBe(100);
      expect(result.completedPrograms).toBe(1);
    });

    it("should handle decimal rebate values", () => {
      // Arrange
      const storeId = 100;
      const programCompliances = [
        {
          storeid: 100,
          programid: 1,
          programdetailid: 10,
          isqualified: true,
          status: ProgramsComplianceStatus.Active,
          earnedrebate: "123.456"
        },
        {
          storeid: 100,
          programid: 2,
          programdetailid: 20,
          isqualified: true,
          status: ProgramsComplianceStatus.Active,
          earnedrebate: "78.901"
        }
      ] as any;

      const programs = [
        {
          program_id: 1,
          program_detail_id: 10,
          visibility_entity_type: ENTITY_TYPE.DISTRIBUTOR
        },
        {
          program_id: 2,
          program_detail_id: 20,
          visibility_entity_type: ENTITY_TYPE.DISTRIBUTOR
        }
      ];

      // Act
      const result = ManufacturerService.calculateRebateAndCompletedPrograms(
        programCompliances,
        storeId,
        programs
      );

      // Assert
      expect(result.earnedRebate).toBeCloseTo(202.357, 2);
      expect(result.completedPrograms).toBe(2);
    });

    it("should work without programs parameter", () => {
      // Arrange
      const storeId = 100;
      const programCompliances = [
        {
          storeid: 100,
          programid: 1,
          programdetailid: 10,
          isqualified: true,
          status: ProgramsComplianceStatus.Active,
          earnedrebate: "50.00"
        }
      ] as any;

      // Act - programs undefined
      const result = ManufacturerService.calculateRebateAndCompletedPrograms(
        programCompliances,
        storeId
      );

      // Assert - should skip all since no programs to match against
      expect(result.earnedRebate).toBe(0);
      expect(result.completedPrograms).toBe(0);
    });
  });
});

/**
 * ProgramService Calculation Methods Unit Tests
 *
 * Tests for core calculation methods used throughout ProgramService:
 * - calculateComplianceAggregates: Aggregates purchase volume and savings
 * - calculateAggregates: Similar aggregation logic
 * - calculateTotal: Sums compliance values with special earnedRebate handling
 * - getRebateValue: Extracts rebate value based on type (percentage/flat)
 *
 * These are pure calculation functions critical for accurate rebate and compliance calculations.
 */

import programService from '../../../services/ProgramService';
import { ProgramsComplianceStatus } from '../../../config/appConstants';

// Mock all dependencies
jest.mock('../../../repositories/ComplianceRepository');
jest.mock('../../../repositories/DistributorRepository');
jest.mock('../../../repositories/ManufacturerRepository');
jest.mock('../../../repositories/ProgramDetailRepository');
jest.mock('../../../repositories/ProgramRepository');
jest.mock('../../../repositories/StoreRepository');
jest.mock('../../../repositories/UserRoleRepository');
jest.mock('../../../services/ChainService');
jest.mock('../../../services/ManufacturerService');
jest.mock('../../../services/StoreDashboardService');
jest.mock('../../../services/StoreService');
jest.mock('../../../utils/redis');

describe('ProgramService - Calculation Methods', () => {
  // Use 'as any' to bypass TypeScript private access restrictions for testing
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Use the singleton instance
    service = programService;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================================================
  // calculateComplianceAggregates Tests
  // ============================================================================

  describe('calculateComplianceAggregates', () => {
    describe('success cases', () => {
      it('should calculate total purchase volume and savings from compliance array', () => {
        // Arrange
        const compliances = [
          {
            id: 1,
            programId: 100,
            entityId: 1,
            entityType: 'store',
            isQualified: true,
            totalPurchaseVolume: 1000.50,
            totalCasePurchases: 100,
            earnedRebate: 150.25,
            complianceDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            status: ProgramsComplianceStatus.Active,
          },
          {
            id: 2,
            programId: 100,
            entityId: 2,
            entityType: 'store',
            isQualified: true,
            totalPurchaseVolume: 2500.75,
            totalCasePurchases: 250,
            earnedRebate: 375.50,
            complianceDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            status: ProgramsComplianceStatus.Active,
          },
          {
            id: 3,
            programId: 100,
            entityId: 3,
            entityType: 'store',
            isQualified: false,
            totalPurchaseVolume: 500.00,
            totalCasePurchases: 50,
            earnedRebate: 50.00,
            complianceDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            status: ProgramsComplianceStatus.Active,
          },
        ];

        // Act
        const result = service.calculateComplianceAggregates(compliances);

        // Assert
        expect(result).toEqual({
          totalPurchaseVolume: 4001.25, // 1000.50 + 2500.75 + 500.00
          totalSavings: 575.75, // 150.25 + 375.50 + 50.00
        });
      });

      it('should handle compliances with inactive status (should only count active earnedRebate)', () => {
        // Arrange
        const compliances = [
          {
            id: 1,
            programId: 100,
            entityId: 1,
            entityType: 'store',
            isQualified: true,
            totalPurchaseVolume: 1000.00,
            totalCasePurchases: 100,
            earnedRebate: 100.00,
            complianceDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            status: ProgramsComplianceStatus.Active,
          },
          {
            id: 2,
            programId: 100,
            entityId: 2,
            entityType: 'store',
            isQualified: false,
            totalPurchaseVolume: 500.00,
            totalCasePurchases: 50,
            earnedRebate: 50.00,
            complianceDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'Inactive', // Not active
          },
        ];

        // Act
        const result = service.calculateComplianceAggregates(compliances);

        // Assert
        expect(result.totalPurchaseVolume).toBe(1500.00);
        expect(result.totalSavings).toBe(100.00); // Only active earnedRebate counted
      });

      it('should return zero totals for empty compliance array', () => {
        // Arrange
        const compliances: any[] = [];

        // Act
        const result = service.calculateComplianceAggregates(compliances);

        // Assert
        expect(result).toEqual({
          totalPurchaseVolume: 0,
          totalSavings: 0,
        });
      });

      it('should handle compliances with decimal values correctly', () => {
        // Arrange
        const compliances = [
          {
            id: 1,
            programId: 100,
            entityId: 1,
            entityType: 'store',
            isQualified: true,
            totalPurchaseVolume: 1234.567,
            totalCasePurchases: 100,
            earnedRebate: 123.456,
            complianceDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            status: ProgramsComplianceStatus.Active,
          },
          {
            id: 2,
            programId: 100,
            entityId: 2,
            entityType: 'store',
            isQualified: true,
            totalPurchaseVolume: 5678.901,
            totalCasePurchases: 500,
            earnedRebate: 567.890,
            complianceDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            status: ProgramsComplianceStatus.Active,
          },
        ];

        // Act
        const result = service.calculateComplianceAggregates(compliances);

        // Assert
        // Should round to 2 decimal places
        expect(result.totalPurchaseVolume).toBe(6913.47);
        expect(result.totalSavings).toBe(691.35);
      });
    });

    describe('edge cases', () => {
      it('should handle compliances with zero values', () => {
        // Arrange
        const compliances = [
          {
            id: 1,
            programId: 100,
            entityId: 1,
            entityType: 'store',
            isQualified: false,
            totalPurchaseVolume: 0,
            totalCasePurchases: 0,
            earnedRebate: 0,
            complianceDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            status: ProgramsComplianceStatus.Active,
          },
        ];

        // Act
        const result = service.calculateComplianceAggregates(compliances);

        // Assert
        expect(result).toEqual({
          totalPurchaseVolume: 0,
          totalSavings: 0,
        });
      });

      it('should handle compliances with null/undefined values', () => {
        // Arrange
        const compliances = [
          {
            id: 1,
            programId: 100,
            entityId: 1,
            entityType: 'store',
            isQualified: true,
            totalPurchaseVolume: null as any,
            totalCasePurchases: 100,
            earnedRebate: undefined as any,
            complianceDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            status: ProgramsComplianceStatus.Active,
          },
        ];

        // Act
        const result = service.calculateComplianceAggregates(compliances);

        // Assert
        expect(result).toEqual({
          totalPurchaseVolume: 0,
          totalSavings: 0,
        });
      });

      it('should handle very large numbers', () => {
        // Arrange
        const compliances = [
          {
            id: 1,
            programId: 100,
            entityId: 1,
            entityType: 'store',
            isQualified: true,
            totalPurchaseVolume: 999999999.99,
            totalCasePurchases: 1000000,
            earnedRebate: 99999999.99,
            complianceDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            status: ProgramsComplianceStatus.Active,
          },
        ];

        // Act
        const result = service.calculateComplianceAggregates(compliances);

        // Assert
        expect(result.totalPurchaseVolume).toBe(999999999.99);
        expect(result.totalSavings).toBe(99999999.99);
      });
    });
  });

  // ============================================================================
  // calculateAggregates Tests
  // ============================================================================

  describe('calculateAggregates', () => {
    it('should calculate aggregates identically to calculateComplianceAggregates', () => {
      // Arrange
      const compliances = [
        {
          id: 1,
          programId: 100,
          entityId: 1,
          entityType: 'store',
          isQualified: true,
          totalPurchaseVolume: 1000.00,
          totalCasePurchases: 100,
          earnedRebate: 150.00,
          complianceDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          status: ProgramsComplianceStatus.Active,
        },
        {
          id: 2,
          programId: 100,
          entityId: 2,
          entityType: 'store',
          isQualified: true,
          totalPurchaseVolume: 2500.00,
          totalCasePurchases: 250,
          earnedRebate: 375.00,
          complianceDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          status: ProgramsComplianceStatus.Active,
        },
      ];

      // Act
      const result1 = service.calculateComplianceAggregates(compliances);
      const result2 = service.calculateAggregates(compliances);

      // Assert - Both methods should produce identical results
      expect(result1).toEqual(result2);
      expect(result2).toEqual({
        totalPurchaseVolume: 3500.00,
        totalSavings: 525.00,
      });
    });
  });

  // ============================================================================
  // calculateTotal Tests
  // ============================================================================

  describe('calculateTotal', () => {
    describe('success cases - totalPurchaseVolume', () => {
      it('should sum totalPurchaseVolume from compliance array', () => {
        // Arrange
        const compliances = [
          {
            id: 1,
            programId: 100,
            totalPurchaseVolume: 1000.50,
            earnedRebate: 100.00,
            status: ProgramsComplianceStatus.Active,
          } as any,
          {
            id: 2,
            programId: 100,
            totalPurchaseVolume: 2500.75,
            earnedRebate: 250.00,
            status: ProgramsComplianceStatus.Active,
          } as any,
          {
            id: 3,
            programId: 100,
            totalPurchaseVolume: 500.00,
            earnedRebate: 50.00,
            status: ProgramsComplianceStatus.Active,
          } as any,
        ];

        // Act
        const result = service.calculateTotal(compliances, 'totalPurchaseVolume');

        // Assert
        expect(result).toBe(4001.25);
      });
    });

    describe('success cases - earnedRebate with status filtering', () => {
      it('should sum earnedRebate only for Active status compliances', () => {
        // Arrange
        const compliances = [
          {
            id: 1,
            programId: 100,
            totalPurchaseVolume: 1000.00,
            earnedRebate: 100.00,
            status: ProgramsComplianceStatus.Active,
          } as any,
          {
            id: 2,
            programId: 100,
            totalPurchaseVolume: 2000.00,
            earnedRebate: 200.00,
            status: 'Inactive', // Should be excluded
          } as any,
          {
            id: 3,
            programId: 100,
            totalPurchaseVolume: 3000.00,
            earnedRebate: 300.00,
            status: ProgramsComplianceStatus.Active,
          } as any,
        ];

        // Act
        const result = service.calculateTotal(compliances, 'earnedRebate');

        // Assert
        expect(result).toBe(400.00); // Only active compliances: 100 + 300
      });

      it('should return zero when all earnedRebate compliances are inactive', () => {
        // Arrange
        const compliances = [
          {
            id: 1,
            programId: 100,
            earnedRebate: 100.00,
            status: 'Inactive',
          } as any,
          {
            id: 2,
            programId: 100,
            earnedRebate: 200.00,
            status: 'Pending',
          } as any,
        ];

        // Act
        const result = service.calculateTotal(compliances, 'earnedRebate');

        // Assert
        expect(result).toBe(0);
      });
    });

    describe('edge cases', () => {
      it('should return 0 for empty array', () => {
        // Arrange
        const compliances: any[] = [];

        // Act
        const result = service.calculateTotal(compliances, 'totalPurchaseVolume');

        // Assert
        expect(result).toBe(0);
      });

      it('should handle null values as zero', () => {
        // Arrange
        const compliances = [
          {
            id: 1,
            programId: 100,
            totalPurchaseVolume: null,
            earnedRebate: 100.00,
            status: ProgramsComplianceStatus.Active,
          } as any,
          {
            id: 2,
            programId: 100,
            totalPurchaseVolume: 500.00,
            earnedRebate: 50.00,
            status: ProgramsComplianceStatus.Active,
          } as any,
        ];

        // Act
        const result = service.calculateTotal(compliances, 'totalPurchaseVolume');

        // Assert
        expect(result).toBe(500.00); // null treated as 0
      });

      it('should handle undefined values as zero', () => {
        // Arrange
        const compliances = [
          {
            id: 1,
            programId: 100,
            totalPurchaseVolume: undefined,
            earnedRebate: 100.00,
            status: ProgramsComplianceStatus.Active,
          } as any,
          {
            id: 2,
            programId: 100,
            totalPurchaseVolume: 500.00,
            earnedRebate: 50.00,
            status: ProgramsComplianceStatus.Active,
          } as any,
        ];

        // Act
        const result = service.calculateTotal(compliances, 'totalPurchaseVolume');

        // Assert
        expect(result).toBe(500.00);
      });

      it('should round result to 2 decimal places', () => {
        // Arrange
        const compliances = [
          {
            id: 1,
            programId: 100,
            totalPurchaseVolume: 10.111,
            earnedRebate: 1.00,
            status: ProgramsComplianceStatus.Active,
          } as any,
          {
            id: 2,
            programId: 100,
            totalPurchaseVolume: 20.222,
            earnedRebate: 2.00,
            status: ProgramsComplianceStatus.Active,
          } as any,
          {
            id: 3,
            programId: 100,
            totalPurchaseVolume: 30.333,
            earnedRebate: 3.00,
            status: ProgramsComplianceStatus.Active,
          } as any,
        ];

        // Act
        const result = service.calculateTotal(compliances, 'totalPurchaseVolume');

        // Assert
        expect(result).toBe(60.66); // 10.111 + 20.222 + 30.333 = 60.666, rounds to 60.66 (banker's rounding)
      });

      it('should handle string values by parsing to float', () => {
        // Arrange
        const compliances = [
          {
            id: 1,
            programId: 100,
            totalPurchaseVolume: '1000.50',
            earnedRebate: '100.00',
            status: ProgramsComplianceStatus.Active,
          } as any,
          {
            id: 2,
            programId: 100,
            totalPurchaseVolume: '500.25',
            earnedRebate: '50.00',
            status: ProgramsComplianceStatus.Active,
          } as any,
        ];

        // Act
        const result = service.calculateTotal(compliances, 'totalPurchaseVolume');

        // Assert
        expect(result).toBe(1500.75);
      });

      it('should handle very large numbers accurately', () => {
        // Arrange
        const compliances = [
          {
            id: 1,
            programId: 100,
            totalPurchaseVolume: 999999.99,
            earnedRebate: 100000.00,
            status: ProgramsComplianceStatus.Active,
          } as any,
          {
            id: 2,
            programId: 100,
            totalPurchaseVolume: 888888.88,
            earnedRebate: 200000.00,
            status: ProgramsComplianceStatus.Active,
          } as any,
        ];

        // Act
        const result = service.calculateTotal(compliances, 'totalPurchaseVolume');

        // Assert
        expect(result).toBe(1888888.87);
      });
    });
  });

  // ============================================================================
  // getRebateValue Tests
  // ============================================================================

  describe('getRebateValue', () => {
    describe('success cases - percentage rebate', () => {
      it('should return rebatePercentage when rebateType is "percentage"', () => {
        // Arrange
        const programDetail = {
          id: 1,
          programId: 100,
          rebateType: 'percentage',
          rebatePercentage: 15.5,
          rebateAmount: 100.00,
        };

        // Act
        const result = service.getRebateValue(programDetail);

        // Assert
        expect(result).toBe(15.5);
      });

      it('should return 0 when rebatePercentage is null for percentage type', () => {
        // Arrange
        const programDetail = {
          id: 1,
          programId: 100,
          rebateType: 'percentage',
          rebatePercentage: null,
          rebateAmount: 100.00,
        };

        // Act
        const result = service.getRebateValue(programDetail);

        // Assert
        expect(result).toBe(0);
      });

      it('should return 0 when rebatePercentage is undefined for percentage type', () => {
        // Arrange
        const programDetail = {
          id: 1,
          programId: 100,
          rebateType: 'percentage',
          rebatePercentage: undefined,
          rebateAmount: 100.00,
        };

        // Act
        const result = service.getRebateValue(programDetail);

        // Assert
        expect(result).toBe(0);
      });
    });

    describe('success cases - flat rebate', () => {
      it('should return rebateAmount when rebateType is "flat"', () => {
        // Arrange
        const programDetail = {
          id: 1,
          programId: 100,
          rebateType: 'flat',
          rebatePercentage: 15.0,
          rebateAmount: 250.00,
        };

        // Act
        const result = service.getRebateValue(programDetail);

        // Assert
        expect(result).toBe(250.00);
      });

      it('should return 0 when rebateAmount is null for flat type', () => {
        // Arrange
        const programDetail = {
          id: 1,
          programId: 100,
          rebateType: 'flat',
          rebatePercentage: 15.0,
          rebateAmount: null,
        };

        // Act
        const result = service.getRebateValue(programDetail);

        // Assert
        expect(result).toBe(0);
      });

      it('should return 0 when rebateAmount is undefined for flat type', () => {
        // Arrange
        const programDetail = {
          id: 1,
          programId: 100,
          rebateType: 'flat',
          rebatePercentage: 15.0,
          rebateAmount: undefined,
        };

        // Act
        const result = service.getRebateValue(programDetail);

        // Assert
        expect(result).toBe(0);
      });
    });

    describe('edge cases', () => {
      it('should return 0 when programDetail is null', () => {
        // Arrange
        const programDetail = null as any;

        // Act
        const result = service.getRebateValue(programDetail);

        // Assert
        expect(result).toBe(0);
      });

      it('should return 0 when programDetail is undefined', () => {
        // Arrange
        const programDetail = undefined as any;

        // Act
        const result = service.getRebateValue(programDetail);

        // Assert
        expect(result).toBe(0);
      });

      it('should default to rebateAmount for unknown rebateType', () => {
        // Arrange
        const programDetail = {
          id: 1,
          programId: 100,
          rebateType: 'unknown_type',
          rebatePercentage: 15.0,
          rebateAmount: 300.00,
        };

        // Act
        const result = service.getRebateValue(programDetail);

        // Assert
        expect(result).toBe(300.00);
      });

      it('should handle rebateType with different casing', () => {
        // Arrange
        const programDetail1 = {
          id: 1,
          programId: 100,
          rebateType: 'PERCENTAGE',
          rebatePercentage: 10.0,
          rebateAmount: 100.00,
        };

        const programDetail2 = {
          id: 2,
          programId: 101,
          rebateType: 'Flat',
          rebatePercentage: 10.0,
          rebateAmount: 200.00,
        };

        // Act
        const result1 = service.getRebateValue(programDetail1);
        const result2 = service.getRebateValue(programDetail2);

        // Assert
        // These should fall to default case (rebateAmount)
        expect(result1).toBe(100.00);
        expect(result2).toBe(200.00);
      });

      it('should handle zero values correctly', () => {
        // Arrange
        const programDetail1 = {
          id: 1,
          programId: 100,
          rebateType: 'percentage',
          rebatePercentage: 0,
          rebateAmount: 100.00,
        };

        const programDetail2 = {
          id: 2,
          programId: 101,
          rebateType: 'flat',
          rebatePercentage: 10.0,
          rebateAmount: 0,
        };

        // Act
        const result1 = service.getRebateValue(programDetail1);
        const result2 = service.getRebateValue(programDetail2);

        // Assert
        expect(result1).toBe(0);
        expect(result2).toBe(0);
      });

      it('should handle decimal percentages correctly', () => {
        // Arrange
        const programDetail = {
          id: 1,
          programId: 100,
          rebateType: 'percentage',
          rebatePercentage: 12.75,
          rebateAmount: 100.00,
        };

        // Act
        const result = service.getRebateValue(programDetail);

        // Assert
        expect(result).toBe(12.75);
      });

      it('should handle very large rebate amounts', () => {
        // Arrange
        const programDetail = {
          id: 1,
          programId: 100,
          rebateType: 'flat',
          rebatePercentage: 10.0,
          rebateAmount: 999999.99,
        };

        // Act
        const result = service.getRebateValue(programDetail);

        // Assert
        expect(result).toBe(999999.99);
      });
    });
  });
});

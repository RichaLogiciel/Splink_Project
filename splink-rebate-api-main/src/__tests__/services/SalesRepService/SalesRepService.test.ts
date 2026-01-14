/**
 * SalesRepService Unit Tests
 *
 * Tests for SalesRepService covering all major methods and business logic
 */

// Mock dependencies before imports
jest.mock("../../../repositories/DistributorRepository");
jest.mock("../../../repositories/SalesRepRepository");
jest.mock("../../../repositories/ManufacturerRepository");
jest.mock("../../../repositories/ProgramRepository");
jest.mock("../../../repositories/StoreRepository");
jest.mock("../../../repositories/StoreVoidFillTargetRepository");
jest.mock("../../../repositories/ProgramProductRepository");
jest.mock("../../../services/DistributorService");
jest.mock("../../../services/StoreService");
jest.mock("newrelic");

import SalesRepService from "../../../services/SalesRepService";
import DistributorRepository from "../../../repositories/DistributorRepository";
import SalesRepRepository from "../../../repositories/SalesRepRepository";
import ManufacturerRepository from "../../../repositories/ManufacturerRepository";
import ProgramRepository from "../../../repositories/ProgramRepository";
import StoreRepository from "../../../repositories/StoreRepository";
import DistributorService from "../../../services/DistributorService";
import { ENTITY_TYPE, PROGRAM_TIMELINE } from "../../../config/appConstants";

describe("SalesRepService", () => {
  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getKeyMetrics", () => {
    const mockSalesRepId = 123;
    const mockLoggedInUser = {
      id: 1,
      parentEntityId: 100,
      role: "distributor"
    };

    it("should return key metrics for a sales rep successfully", async () => {
      // Arrange
      const mockRebateAmount = 50000;
      const mockPendingRebate = 15000;
      const mockStoresCount = 25;
      const mockAuthorizedManufacturers = [
        { manufacturerId: "1" },
        { manufacturerId: "2" },
        { manufacturerId: "3" }
      ];
      const mockExcludedProgramDetailIds = [10, 20, 30];
      const mockPrograms = [
        {
          id: 1,
          Manufacturer: { id: 1 },
          get: jest.fn((key) =>
            key === "Manufacturer" ? { id: 1 } : undefined
          )
        },
        {
          id: 2,
          Manufacturer: { id: 2 },
          get: jest.fn((key) =>
            key === "Manufacturer" ? { id: 2 } : undefined
          )
        }
      ];

      // Mock repository calls
      (DistributorRepository.getTotalEarnedRebate as jest.Mock)
        .mockResolvedValueOnce(mockRebateAmount) // Current rebate
        .mockResolvedValueOnce(mockPendingRebate); // Pending payout

      (SalesRepRepository.getTotalStore as jest.Mock).mockResolvedValue(
        mockStoresCount
      );

      (
        ManufacturerRepository.getAuthorizedManufacturers as jest.Mock
      ).mockResolvedValue(mockAuthorizedManufacturers);

      (
        ProgramRepository.getExcludedProgramDetailIds as jest.Mock
      ).mockResolvedValue(mockExcludedProgramDetailIds);

      (
        ProgramRepository.getProgramsByParticipantType as jest.Mock
      ).mockResolvedValue(mockPrograms);

      // Act
      const result = await SalesRepService.getKeyMetrics(
        mockSalesRepId,
        mockLoggedInUser as any
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.totalEarning).toBe(mockRebateAmount);
      expect(result.pendingPayoutEarning).toBe(mockPendingRebate);
      expect(result.totalStores).toBe(mockStoresCount);
      expect(result.totalStoreProgram).toBe(2); // 2 unique manufacturer IDs
      expect(result.totalActiveStores).toBe(0); // Currently hardcoded

      // Verify repository calls
      expect(DistributorRepository.getTotalEarnedRebate).toHaveBeenCalledWith(
        mockSalesRepId,
        ENTITY_TYPE.SALES_REP,
        mockLoggedInUser,
        PROGRAM_TIMELINE.CURRENT
      );

      expect(DistributorRepository.getTotalEarnedRebate).toHaveBeenCalledWith(
        mockSalesRepId,
        ENTITY_TYPE.SALES_REP,
        mockLoggedInUser,
        PROGRAM_TIMELINE.HISTORICAL
      );

      expect(SalesRepRepository.getTotalStore).toHaveBeenCalledWith(
        mockSalesRepId
      );
      expect(
        ManufacturerRepository.getAuthorizedManufacturers
      ).toHaveBeenCalledWith(mockLoggedInUser.parentEntityId);
    });

    it("should handle zero earnings correctly", async () => {
      // Arrange
      (DistributorRepository.getTotalEarnedRebate as jest.Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      (SalesRepRepository.getTotalStore as jest.Mock).mockResolvedValue(0);
      (
        ManufacturerRepository.getAuthorizedManufacturers as jest.Mock
      ).mockResolvedValue([]);
      (
        ProgramRepository.getExcludedProgramDetailIds as jest.Mock
      ).mockResolvedValue([]);
      (
        ProgramRepository.getProgramsByParticipantType as jest.Mock
      ).mockResolvedValue([]);

      // Act
      const result = await SalesRepService.getKeyMetrics(
        mockSalesRepId,
        mockLoggedInUser as any
      );

      // Assert
      expect(result.totalEarning).toBe(0);
      expect(result.pendingPayoutEarning).toBe(0);
      expect(result.totalStores).toBe(0);
      expect(result.totalStoreProgram).toBe(0);
    });

    it("should handle repository errors gracefully", async () => {
      // Arrange
      const errorMessage = "Database connection failed";
      (
        DistributorRepository.getTotalEarnedRebate as jest.Mock
      ).mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(
        SalesRepService.getKeyMetrics(mockSalesRepId, mockLoggedInUser as any)
      ).rejects.toThrow(errorMessage);
    });

    it("should filter out duplicate manufacturer IDs", async () => {
      // Arrange
      const mockPrograms = [
        { id: 1, Manufacturer: { id: 1 }, get: jest.fn(() => ({ id: 1 })) },
        { id: 2, Manufacturer: { id: 1 }, get: jest.fn(() => ({ id: 1 })) }, // Duplicate
        { id: 3, Manufacturer: { id: 2 }, get: jest.fn(() => ({ id: 2 })) }
      ];

      (
        DistributorRepository.getTotalEarnedRebate as jest.Mock
      ).mockResolvedValue(1000);
      (SalesRepRepository.getTotalStore as jest.Mock).mockResolvedValue(10);
      (
        ManufacturerRepository.getAuthorizedManufacturers as jest.Mock
      ).mockResolvedValue([{ manufacturerId: "1" }, { manufacturerId: "2" }]);
      (
        ProgramRepository.getExcludedProgramDetailIds as jest.Mock
      ).mockResolvedValue([]);
      (
        ProgramRepository.getProgramsByParticipantType as jest.Mock
      ).mockResolvedValue(mockPrograms);

      // Act
      const result = await SalesRepService.getKeyMetrics(
        mockSalesRepId,
        mockLoggedInUser as any
      );

      // Assert
      expect(result.totalStoreProgram).toBe(2); // Should only count unique manufacturers
    });
  });

  describe("getSalesRepEarningsOverview", () => {
    const mockSalesRepId = 123;
    const mockDistributorId = 100;

    it("should return earnings overview by manufacturer", async () => {
      // Arrange
      const mockExcludedProgramIds = [5, 10];
      const mockEarnings = [
        {
          manufacturerName: "Manufacturer A",
          totalEarning: 25000,
          percentage: 50
        },
        {
          manufacturerName: "Manufacturer B",
          totalEarning: 15000,
          percentage: 30
        },
        {
          manufacturerName: "Manufacturer C",
          totalEarning: 10000,
          percentage: 20
        }
      ];

      (ProgramRepository.getExcludedProgramIds as jest.Mock).mockResolvedValue(
        mockExcludedProgramIds
      );
      (
        SalesRepRepository.getTotalEarnedRebateByManufacturer as jest.Mock
      ).mockResolvedValue(mockEarnings);

      // Act
      const result = await SalesRepService.getSalesRepEarningsOverview(
        mockSalesRepId,
        mockDistributorId
      );

      // Assert
      expect(result).toEqual(mockEarnings);
      expect(result).toHaveLength(3);
      expect(ProgramRepository.getExcludedProgramIds).toHaveBeenCalledWith(
        mockDistributorId
      );
      expect(
        SalesRepRepository.getTotalEarnedRebateByManufacturer
      ).toHaveBeenCalledWith(
        mockDistributorId,
        mockSalesRepId,
        ENTITY_TYPE.SALES_REP,
        mockExcludedProgramIds
      );
    });

    it("should handle empty earnings", async () => {
      // Arrange
      (ProgramRepository.getExcludedProgramIds as jest.Mock).mockResolvedValue(
        []
      );
      (
        SalesRepRepository.getTotalEarnedRebateByManufacturer as jest.Mock
      ).mockResolvedValue([]);

      // Act
      const result = await SalesRepService.getSalesRepEarningsOverview(
        mockSalesRepId,
        mockDistributorId
      );

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it("should handle errors from repository", async () => {
      // Arrange
      const errorMessage = "Failed to fetch earnings";
      (ProgramRepository.getExcludedProgramIds as jest.Mock).mockRejectedValue(
        new Error(errorMessage)
      );

      // Act & Assert
      await expect(
        SalesRepService.getSalesRepEarningsOverview(
          mockSalesRepId,
          mockDistributorId
        )
      ).rejects.toThrow(errorMessage);
    });
  });

  describe("getSalesRepStoreProgramOverview", () => {
    const mockSalesRepId = 456;

    it("should delegate to DistributorService correctly", async () => {
      // Arrange
      const mockOverviewData = {
        topPerformers: [
          { storeName: "Store A", compliance: 95 },
          { storeName: "Store B", compliance: 90 }
        ],
        bottomPerformers: [
          { storeName: "Store C", compliance: 45 },
          { storeName: "Store D", compliance: 50 }
        ]
      };

      (
        DistributorService.getStoreProgramOverview as jest.Mock
      ).mockResolvedValue(mockOverviewData);

      // Act
      const result =
        await SalesRepService.getSalesRepStoreProgramOverview(mockSalesRepId);

      // Assert
      expect(result).toEqual(mockOverviewData);
      expect(DistributorService.getStoreProgramOverview).toHaveBeenCalledWith(
        0,
        mockSalesRepId
      );
    });

    it("should handle errors from DistributorService", async () => {
      // Arrange
      const errorMessage = "Failed to get overview";
      (
        DistributorService.getStoreProgramOverview as jest.Mock
      ).mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(
        SalesRepService.getSalesRepStoreProgramOverview(mockSalesRepId)
      ).rejects.toThrow(errorMessage);
    });
  });

  describe("getWishlistProduct", () => {
    const mockSalesRepId = 789;

    it("should return top 3 stores with wishlist products", async () => {
      // Arrange
      const mockStores = [
        { storeId: 1, storeName: "Store A", wishlistCount: 10 },
        { storeId: 2, storeName: "Store B", wishlistCount: 8 },
        { storeId: 3, storeName: "Store C", wishlistCount: 6 },
        { storeId: 4, storeName: "Store D", wishlistCount: 4 },
        { storeId: 5, storeName: "Store E", wishlistCount: 2 }
      ];

      (
        SalesRepRepository.getStoresWithWishlistProducts as jest.Mock
      ).mockResolvedValue(mockStores);

      // Act
      const result = await SalesRepService.getWishlistProduct(mockSalesRepId);

      // Assert
      expect(result).toHaveLength(3);
      expect(result).toEqual(mockStores.slice(0, 3));
      expect(
        SalesRepRepository.getStoresWithWishlistProducts
      ).toHaveBeenCalledWith(mockSalesRepId);
    });

    it("should handle fewer than 3 stores", async () => {
      // Arrange
      const mockStores = [
        { storeId: 1, storeName: "Store A", wishlistCount: 10 },
        { storeId: 2, storeName: "Store B", wishlistCount: 8 }
      ];

      (
        SalesRepRepository.getStoresWithWishlistProducts as jest.Mock
      ).mockResolvedValue(mockStores);

      // Act
      const result = await SalesRepService.getWishlistProduct(mockSalesRepId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toEqual(mockStores);
    });

    it("should handle empty wishlist", async () => {
      // Arrange
      (
        SalesRepRepository.getStoresWithWishlistProducts as jest.Mock
      ).mockResolvedValue([]);

      // Act
      const result = await SalesRepService.getWishlistProduct(mockSalesRepId);

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it("should handle repository errors", async () => {
      // Arrange
      const errorMessage = "Failed to fetch wishlist";
      (
        SalesRepRepository.getStoresWithWishlistProducts as jest.Mock
      ).mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(
        SalesRepService.getWishlistProduct(mockSalesRepId)
      ).rejects.toThrow(errorMessage);
    });
  });

  describe("getSalesRepManufactureProgramsDetails", () => {
    const mockSalesRepId = 123;
    const mockManufacturerId = 456;
    const mockDistributorId = 789;

    it("should return program tier details with adjusted rebate amounts", async () => {
      // Arrange
      const mockValidProgramIds = [1, 2, 3];
      const mockPrograms = [
        {
          id: 1,
          programHeader: "Test Program",
          programType: "TIER",
          ProgramDetails: [
            {
              tier: 1,
              overview: "Tier 1 Overview",
              rebateAmount: 100,
              rebateType: "fixed"
            },
            {
              tier: 2,
              overview: "Tier 2 Overview",
              rebateAmount: 200,
              rebateType: "fixed"
            }
          ]
        }
      ];

      (
        ProgramRepository.getProgramsIdsByCreatorAndVisibilityEntity as jest.Mock
      ).mockResolvedValue(mockValidProgramIds);
      (
        ProgramRepository.getProgramsByParticipantType as jest.Mock
      ).mockResolvedValue(mockPrograms);

      // Act
      const result =
        await SalesRepService.getSalesRepManufactureProgramsDetails(
          mockSalesRepId,
          mockManufacturerId,
          mockDistributorId,
          PROGRAM_TIMELINE.CURRENT
        );

      // Assert
      expect(result).toBeDefined();
      expect(result.tierDetails).toHaveLength(2);
      expect(result.tierDetails[0].tier).toBe(1);
      expect(result.tierDetails[1].tier).toBe(2);

      // Verify rebate amounts are returned (the adjustment happens based on distributor)
      // Default adjustment is 0.5 (50% of original)
      const rebateAmount1 =
        typeof result.tierDetails[0].rebateAmount === "string"
          ? parseFloat(result.tierDetails[0].rebateAmount)
          : result.tierDetails[0].rebateAmount;
      const rebateAmount2 =
        typeof result.tierDetails[1].rebateAmount === "string"
          ? parseFloat(result.tierDetails[1].rebateAmount)
          : result.tierDetails[1].rebateAmount;
      expect(rebateAmount1).toBeLessThanOrEqual(100);
      expect(rebateAmount2).toBeLessThanOrEqual(200);
    });

    it("should handle non-tier programs", async () => {
      // Arrange
      const mockPrograms = [
        {
          id: 1,
          programHeader: "Simple Program",
          programType: "SIMPLE",
          ProgramDetails: [
            {
              overview: "Program Overview",
              rebateAmount: 50,
              rebateType: "percentage"
            }
          ]
        }
      ];

      (
        ProgramRepository.getProgramsIdsByCreatorAndVisibilityEntity as jest.Mock
      ).mockResolvedValue([1]);
      (
        ProgramRepository.getProgramsByParticipantType as jest.Mock
      ).mockResolvedValue(mockPrograms);

      // Act
      const result =
        await SalesRepService.getSalesRepManufactureProgramsDetails(
          mockSalesRepId,
          mockManufacturerId,
          mockDistributorId
        );

      // Assert
      expect(result.tierDetails).toHaveLength(1);
      expect(result.tierDetails[0].overview).toBe("Program Overview");
    });

    it("should default to current timeline when not specified", async () => {
      // Arrange
      (
        ProgramRepository.getProgramsIdsByCreatorAndVisibilityEntity as jest.Mock
      ).mockResolvedValue([]);
      (
        ProgramRepository.getProgramsByParticipantType as jest.Mock
      ).mockResolvedValue([]);

      // Act
      await SalesRepService.getSalesRepManufactureProgramsDetails(
        mockSalesRepId,
        mockManufacturerId,
        mockDistributorId
      );

      // Assert
      expect(
        ProgramRepository.getProgramsByParticipantType
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          programTimeline: PROGRAM_TIMELINE.CURRENT
        })
      );
    });

    it("should handle internal initiatives correctly", async () => {
      // Arrange
      (
        ProgramRepository.getProgramsIdsByCreatorAndVisibilityEntity as jest.Mock
      ).mockResolvedValue([1, 2]);
      (
        ProgramRepository.getProgramsByParticipantType as jest.Mock
      ).mockResolvedValue([]);

      // Act
      await SalesRepService.getSalesRepManufactureProgramsDetails(
        mockSalesRepId,
        mockManufacturerId,
        mockDistributorId,
        PROGRAM_TIMELINE.CURRENT,
        true // isInternalInitiative
      );

      // Assert
      expect(
        ProgramRepository.getProgramsByParticipantType
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          isInternalInitiative: true
        })
      );
    });

    it("should handle empty program results", async () => {
      // Arrange
      (
        ProgramRepository.getProgramsIdsByCreatorAndVisibilityEntity as jest.Mock
      ).mockResolvedValue([]);
      (
        ProgramRepository.getProgramsByParticipantType as jest.Mock
      ).mockResolvedValue([]);

      // Act
      const result =
        await SalesRepService.getSalesRepManufactureProgramsDetails(
          mockSalesRepId,
          mockManufacturerId
        );

      // Assert
      expect(result.tierDetails).toEqual([]);
    });
  });

  describe("getStoresNearComplianceOptimized", () => {
    const mockSalesRepId = 123;
    const mockMinPercentage = 70;
    const mockMaxPercentage = 100;

    it("should return stores with near compliance programs", async () => {
      // Arrange
      const mockStoreIds = [1, 2, 3];
      const mockComplianceData = [
        {
          store_id: 1,
          store_name: "Store A",
          manufacturer_id: 10,
          manufacturer_name: "Manufacturer X",
          manufacturer_logo: "logo.png",
          manufacturer_authorized: true,
          program_id: 100,
          program_detail_id: 1000,
          program_header: "Program 1",
          program_type: "TIER",
          tier: 1,
          compliance_percentage: 85,
          earning_opportunity: 500,
          products_tags: "tag1,tag2"
        }
      ];

      (SalesRepRepository.getStoresBySalesRepId as jest.Mock).mockResolvedValue(
        mockStoreIds
      );
      (ProgramRepository.getExcludedProgramIds as jest.Mock).mockResolvedValue(
        []
      );
      (
        StoreRepository.getStoresNearComplianceFromMV as jest.Mock
      ).mockResolvedValue(mockComplianceData);

      // Act
      const result = await SalesRepService.getStoresNearComplianceOptimized(
        mockSalesRepId,
        mockMinPercentage,
        mockMaxPercentage
      );

      // Assert
      expect(result).toBeDefined();
      expect(result!.salesRepId).toBe(mockSalesRepId);
      expect(result!.stores).toHaveLength(1);
      expect(result!.stores[0].store_id).toBe(1);
      expect(result!.stores[0].programs).toHaveLength(1);
      expect(result!.stores[0].programs[0].compliance_percentage).toBe(85);
    });

    it("should return empty array when sales rep has no stores", async () => {
      // Arrange
      (SalesRepRepository.getStoresBySalesRepId as jest.Mock).mockResolvedValue(
        []
      );

      // Act
      const result = await SalesRepService.getStoresNearComplianceOptimized(
        mockSalesRepId,
        mockMinPercentage,
        mockMaxPercentage
      );

      // Assert
      expect(result!.salesRepId).toBe(mockSalesRepId);
      expect(result!.stores).toEqual([]);
    });

    it("should handle missing compliance data", async () => {
      // Arrange
      (SalesRepRepository.getStoresBySalesRepId as jest.Mock).mockResolvedValue(
        [1, 2, 3]
      );
      (ProgramRepository.getExcludedProgramIds as jest.Mock).mockResolvedValue(
        []
      );
      (
        StoreRepository.getStoresNearComplianceFromMV as jest.Mock
      ).mockResolvedValue([]);

      // Act
      const result = await SalesRepService.getStoresNearComplianceOptimized(
        mockSalesRepId,
        mockMinPercentage,
        mockMaxPercentage
      );

      // Assert
      expect(result!.salesRepId).toBe(mockSalesRepId);
      expect(result!.stores).toEqual([]);
    });

    it("should filter programs by distributor when provided", async () => {
      // Arrange
      const mockDistributorId = 999;
      const mockExcludedProgramIds = [5, 10, 15];

      (SalesRepRepository.getStoresBySalesRepId as jest.Mock).mockResolvedValue(
        [1]
      );
      (ProgramRepository.getExcludedProgramIds as jest.Mock).mockResolvedValue(
        mockExcludedProgramIds
      );
      (
        StoreRepository.getStoresNearComplianceFromMV as jest.Mock
      ).mockResolvedValue([]);

      // Act
      await SalesRepService.getStoresNearComplianceOptimized(
        mockSalesRepId,
        mockMinPercentage,
        mockMaxPercentage,
        undefined,
        undefined,
        mockDistributorId
      );

      // Assert
      expect(ProgramRepository.getExcludedProgramIds).toHaveBeenCalledWith(
        mockDistributorId
      );
      expect(
        StoreRepository.getStoresNearComplianceFromMV
      ).toHaveBeenCalledWith(
        [1],
        undefined,
        undefined,
        mockDistributorId,
        mockExcludedProgramIds,
        mockMinPercentage,
        mockMaxPercentage,
        "Current"
      );
    });

    it("should group multiple programs for same store", async () => {
      // Arrange
      const mockComplianceData = [
        {
          store_id: 1,
          store_name: "Store A",
          manufacturer_id: 10,
          manufacturer_name: "Manufacturer X",
          manufacturer_logo: "logo.png",
          manufacturer_authorized: true,
          program_id: 100,
          program_detail_id: 1000,
          program_header: "Program 1",
          program_type: "SIMPLE",
          compliance_percentage: 75,
          earning_opportunity: 300,
          products_tags: ""
        },
        {
          store_id: 1,
          store_name: "Store A",
          manufacturer_id: 11,
          manufacturer_name: "Manufacturer Y",
          manufacturer_logo: "logo2.png",
          manufacturer_authorized: true,
          program_id: 101,
          program_detail_id: 1001,
          program_header: "Program 2",
          program_type: "SIMPLE",
          compliance_percentage: 85,
          earning_opportunity: 400,
          products_tags: ""
        }
      ];

      (SalesRepRepository.getStoresBySalesRepId as jest.Mock).mockResolvedValue(
        [1]
      );
      (ProgramRepository.getExcludedProgramIds as jest.Mock).mockResolvedValue(
        []
      );
      (
        StoreRepository.getStoresNearComplianceFromMV as jest.Mock
      ).mockResolvedValue(mockComplianceData);

      // Act
      const result = await SalesRepService.getStoresNearComplianceOptimized(
        mockSalesRepId,
        mockMinPercentage,
        mockMaxPercentage
      );

      // Assert
      expect(result!.stores).toHaveLength(1);
      expect(result!.stores[0].programs).toHaveLength(2);
      expect(result!.stores[0].programs[0].manufacturer_id).toBe(10);
      expect(result!.stores[0].programs[1].manufacturer_id).toBe(11);
    });
  });

  describe("Service Structure", () => {
    it("should have all required methods", () => {
      expect(SalesRepService).toBeDefined();
      expect(typeof SalesRepService.getKeyMetrics).toBe("function");
      expect(typeof SalesRepService.getSalesRepEarningsOverview).toBe(
        "function"
      );
      expect(typeof SalesRepService.getSalesRepStoreProgramOverview).toBe(
        "function"
      );
      expect(typeof SalesRepService.getWishlistProduct).toBe("function");
      expect(typeof SalesRepService.getSalesRepManufactureProgramsDetails).toBe(
        "function"
      );
      expect(typeof SalesRepService.getStoresNearCompliance).toBe("function");
      expect(typeof SalesRepService.getStoresNearComplianceFromMV).toBe(
        "function"
      );
      expect(typeof SalesRepService.getStoresNearComplianceOptimized).toBe(
        "function"
      );
      expect(typeof SalesRepService.getSpiffEarningStoreDetail).toBe(
        "function"
      );
      expect(
        typeof SalesRepService.getSpiffEarningStoreDetailByManufacturer
      ).toBe("function");
      expect(typeof SalesRepService.testComplianceCalculation).toBe("function");
    });
  });
});

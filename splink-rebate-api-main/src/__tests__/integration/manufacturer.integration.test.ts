import { ENTITY_TYPE } from "@/config/appConstants";
import { ERROR_MESSAGES } from "@/config/errorMessages";
import { USER_ROLES } from "@/config/roles";
import {
  default as ManufacturerDashboardService,
  default as ManufacturerService
} from "@/services/ManufacturerService";
import { ManufacturerProductInsights } from "@/types/KeyMetricsTypes";
import { Request, Response } from "express";
import ManufacturerController from "../../controllers/ManufacturerController";
import AuthorizedManufacturerDistributor from "../../models/AuthorizedManufacturerDistributor";
import { createMockRequestResponse } from "../helpers/test-utils";

describe("Manufacturer Integration Tests", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.resetAllMocks();
    const { req, res } = createMockRequestResponse();
    mockReq = req as Partial<Request>;
    mockRes = res as Partial<Response>;
  });

  describe("getKeyMetrics", () => {
    it("should successfully get manufacturer key metrics", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      mockReq.query = {
        distributorId: "1"
      };

      const mockKeyMetrics = {
        totalSales: 10000,
        totalDistributors: 5,
        totalStores: {
          storesCount: 50,
          activeStores: 45
        },
        storesEnrolledInProgramsCount: 40
      };

      jest
        .spyOn(ManufacturerDashboardService, "getKeyMetrics")
        .mockResolvedValue(mockKeyMetrics);

      await ManufacturerController.getKeyMetrics(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockKeyMetrics
      });
    });

    it("should handle missing manufacturerId", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: undefined,
        parentEntityId: undefined,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      await ManufacturerController.getKeyMetrics(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID
      });
    });

    it("should handle service error", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      jest
        .spyOn(ManufacturerDashboardService, "getKeyMetrics")
        .mockRejectedValue(new Error("Service error"));

      await ManufacturerController.getKeyMetrics(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
  });

  describe("getProductInsights", () => {
    it("should successfully get product insights", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      mockReq.body = {
        distributorId: 1,
        monthRange: "1",
        selectedProducts: [1, 2, 3]
      };

      const mockInsights: ManufacturerProductInsights = {
        totalSales: {
          value: 10000,
          yoy: 5
        },
        activeStores: {
          value: 50,
          yoy: 10
        },
        units: {
          value: 1000,
          yoy: 15
        },
        relativeShare: {
          totalSales: 80,
          activeStores: 75,
          units: 70
        },
        topProducts: [
          {
            id: 1,
            color: "#FF0000",
            units: 500,
            unitsYoy: 20,
            sales: 5000,
            salesYoy: 25,
            storePenetration: "60.00",
            storePenetrationYoy: "10.00"
          }
        ]
      };

      jest
        .spyOn(ManufacturerDashboardService, "getProductInsights")
        .mockResolvedValue(mockInsights);

      await ManufacturerController.getProductInsights(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockInsights
      });
    });

    it("should handle missing manufacturerId", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: undefined,
        parentEntityId: undefined,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      mockReq.body = {
        distributorId: 1,
        monthRange: "1",
        selectedProducts: [1, 2, 3]
      };

      await ManufacturerController.getProductInsights(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID
      });
    });

    it("should handle service error", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      mockReq.body = {
        distributorId: 1,
        monthRange: "1",
        selectedProducts: [1, 2, 3]
      };

      jest
        .spyOn(ManufacturerDashboardService, "getProductInsights")
        .mockRejectedValue(new Error("Service error"));

      await ManufacturerController.getProductInsights(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
  });

  describe("getDistributors", () => {
    it("should successfully get distributors for manufacturer executive", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      const mockDistributors = [
        {
          id: 2737,
          userId: 2737,
          role: USER_ROLES.DISTRIBUTOR_ADMIN,
          parentEntityId: 39,
          parentEntityType: ENTITY_TYPE.DISTRIBUTOR,
          associatedUserId: 39,
          associatedEntityType: ENTITY_TYPE.DISTRIBUTOR,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          name: "Merrill Distributing"
        },
        {
          id: 25,
          userId: 25,
          role: USER_ROLES.DISTRIBUTOR_ADMIN,
          parentEntityId: 1,
          parentEntityType: ENTITY_TYPE.DISTRIBUTOR,
          associatedUserId: 1,
          associatedEntityType: ENTITY_TYPE.DISTRIBUTOR,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          name: "Sandstrom's"
        },
        {
          id: 2928,
          userId: 2928,
          role: USER_ROLES.DISTRIBUTOR_ADMIN,
          parentEntityId: 51,
          parentEntityType: ENTITY_TYPE.DISTRIBUTOR,
          associatedUserId: 51,
          associatedEntityType: ENTITY_TYPE.DISTRIBUTOR,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          name: "Pitco"
        }
      ] as any[];

      jest
        .spyOn(ManufacturerDashboardService, "getDistributors")
        .mockResolvedValue(mockDistributors);

      await ManufacturerController.getDistributors(
        mockReq as Request,
        mockRes as Response
      );

      expect(ManufacturerDashboardService.getDistributors).toHaveBeenCalledWith(
        1,
        undefined
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockDistributors
      });
    });

    it("should successfully get distributors for manufacturer account manager", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_ACCOUNT_MANAGER
      };

      const mockDistributors = [
        {
          id: 2737,
          userId: 2737,
          role: USER_ROLES.DISTRIBUTOR_ADMIN,
          parentEntityId: 39,
          parentEntityType: ENTITY_TYPE.DISTRIBUTOR,
          associatedUserId: 39,
          associatedEntityType: ENTITY_TYPE.DISTRIBUTOR,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          name: "Merrill Distributing"
        }
      ] as any[];

      jest
        .spyOn(ManufacturerDashboardService, "getDistributors")
        .mockResolvedValue(mockDistributors);

      await ManufacturerController.getDistributors(
        mockReq as Request,
        mockRes as Response
      );

      expect(ManufacturerDashboardService.getDistributors).toHaveBeenCalledWith(
        1,
        72
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockDistributors
      });
    });

    it("should successfully get distributors for regular manufacturer", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER,
        associatedUserId: 1,
        parentEntityId: null,
        parentEntityType: ENTITY_TYPE.MANUFACTURER
      };

      const mockDistributors = [
        {
          id: 25,
          userId: 25,
          role: USER_ROLES.DISTRIBUTOR_ADMIN,
          parentEntityId: 1,
          parentEntityType: ENTITY_TYPE.DISTRIBUTOR,
          associatedUserId: 1,
          associatedEntityType: ENTITY_TYPE.DISTRIBUTOR,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          name: "Sandstrom's"
        }
      ] as any[];

      jest
        .spyOn(ManufacturerDashboardService, "getDistributors")
        .mockResolvedValue(mockDistributors);

      await ManufacturerController.getDistributors(
        mockReq as Request,
        mockRes as Response
      );

      expect(ManufacturerDashboardService.getDistributors).toHaveBeenCalledWith(
        1,
        undefined
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockDistributors
      });
    });

    it("should handle missing manufacturerId", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: undefined,
        parentEntityId: undefined,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      await ManufacturerController.getDistributors(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID
      });
    });

    it("should handle service error", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      jest
        .spyOn(ManufacturerDashboardService, "getDistributors")
        .mockRejectedValue(new Error("Service error"));

      await ManufacturerController.getDistributors(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
  });

  describe("getProducts", () => {
    it("should successfully get products with manufacturerId from query", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      mockReq.query = {
        manufacturerId: "1"
      };

      const mockProducts = [
        {
          id: 1,
          manufacturerId: 1,
          categoryId: 1,
          skusId: "SKU1",
          unitSkusId: "UNIT1",
          boxSkusId: "BOX1",
          caseSkusId: "CASE1",
          name: "Product 1",
          brand: "Brand 1",
          price: 1000,
          ranking: "1",
          isEssential: false,
          isFlex: false,
          isCoreRetail: false,
          isCoreWholesale: false,
          isInnovation: false,
          isCoreProduct: false,
          isCoreDisplay: false,
          isCarousel: false,
          isBakeshop: false,
          isTicTacDisplay: false,
          isKinderDisplay: false,
          isBfDisplay: false,
          is10oz: false,
          is4oz: false,
          is15oz: false,
          is80ct: false,
          isColdCrafted: false,
          isSaltySnacks: false,
          isTakeHome: false,
          isPrepackDisplay: false,
          isShipper: false,
          isEngbTier1: false,
          isEngbTier2Plus: false,
          isStpPwrstr: false,
          isStpBrkfl: false,
          isFoAdd: false,
          isTireFix: false,
          isArmorAll: false,
          isAirFresh: false,
          primaryVariant: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ] as any[];

      jest
        .spyOn(ManufacturerDashboardService, "getProducts")
        .mockResolvedValue(mockProducts);

      await ManufacturerController.getProducts(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockProducts
      });
    });

    it("should successfully get products with manufacturerId from user role", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.MANUFACTURER
      };

      const mockProducts = [
        {
          id: 1,
          manufacturerId: 1,
          categoryId: 1,
          skusId: "SKU1",
          unitSkusId: "UNIT1",
          boxSkusId: "BOX1",
          caseSkusId: "CASE1",
          name: "Product 1",
          brand: "Brand 1",
          price: 1000,
          ranking: "1",
          isEssential: false,
          isFlex: false,
          isCoreRetail: false,
          isCoreWholesale: false,
          isInnovation: false,
          isCoreProduct: false,
          isCoreDisplay: false,
          isCarousel: false,
          isBakeshop: false,
          isTicTacDisplay: false,
          isKinderDisplay: false,
          isBfDisplay: false,
          is10oz: false,
          is4oz: false,
          is15oz: false,
          is80ct: false,
          isColdCrafted: false,
          isSaltySnacks: false,
          isTakeHome: false,
          isPrepackDisplay: false,
          isShipper: false,
          isEngbTier1: false,
          isEngbTier2Plus: false,
          isStpPwrstr: false,
          isStpBrkfl: false,
          isFoAdd: false,
          isTireFix: false,
          isArmorAll: false,
          isAirFresh: false,
          primaryVariant: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ] as any[];

      jest
        .spyOn(ManufacturerDashboardService, "getProducts")
        .mockResolvedValue(mockProducts);

      await ManufacturerController.getProducts(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockProducts
      });
    });

    it("should handle service error", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      mockReq.query = {
        manufacturerId: "1"
      };

      jest
        .spyOn(ManufacturerDashboardService, "getProducts")
        .mockRejectedValue(new Error("Service error"));

      await ManufacturerController.getProducts(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
  });

  describe("getManufactureProgramCompliance", () => {
    it("should successfully get manufacturer program compliance", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      mockReq.query = {
        distributorId: "1"
      };

      const mockCompliance = {
        distributorList: [
          {
            id: 1,
            name: "Distributor 1",
            totalStores: 50,
            totalSales: 10000,
            location: "Location 1",
            details: []
          }
        ],
        allComplianceDetails: [
          {
            programName: "Program 1",
            tierName: "Tier 1",
            compliancePercentage: 80,
            totalRebate: 1000,
            programStartDate: "2024-01-01",
            programEndDate: "2024-12-31",
            totalStores: 50,
            qualifiedStores: 40
          }
        ]
      };

      jest
        .spyOn(
          ManufacturerDashboardService,
          "getManufactureProgramComplianceDetails"
        )
        .mockResolvedValue(mockCompliance);

      await ManufacturerController.getManufactureProgramCompliance(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockCompliance
      });
    });

    it("should handle missing manufacturerId", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: undefined,
        parentEntityId: undefined,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      await ManufacturerController.getManufactureProgramCompliance(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID
      });
    });

    it("should handle service error", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      mockReq.query = {
        distributorId: "1"
      };

      jest
        .spyOn(
          ManufacturerDashboardService,
          "getManufactureProgramComplianceDetails"
        )
        .mockRejectedValue(new Error("Service error"));

      await ManufacturerController.getManufactureProgramCompliance(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
  });

  describe("getSales", () => {
    it("should successfully get sales data", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      mockReq.query = {
        categoryId: "1",
        distributorId: "1",
        month: "1"
      };

      const mockSales = {
        result: {
          "1": { totalSale: 1000, barChartData: [] },
          "3": { totalSale: 3000, barChartData: [] },
          "6": { totalSale: 6000, barChartData: [] },
          "12": { totalSale: 12000, barChartData: [] }
        },
        categories: []
      };

      jest
        .spyOn(ManufacturerDashboardService, "getTotalSales")
        .mockResolvedValue(mockSales);

      await ManufacturerController.getSales(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockSales
      });
    });

    it("should handle missing manufacturerId", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: undefined,
        parentEntityId: undefined,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      mockReq.query = {
        categoryId: "1",
        distributorId: "1",
        month: "1"
      };

      await ManufacturerController.getSales(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID
      });
    });

    it("should handle service error", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      mockReq.query = {
        categoryId: "1",
        distributorId: "1",
        month: "1"
      };

      jest
        .spyOn(ManufacturerDashboardService, "getTotalSales")
        .mockRejectedValue(new Error("Service error"));

      await ManufacturerController.getSales(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
  });

  describe("getStoresListing", () => {
    it("should successfully get stores listing", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      mockReq.query = {
        distributorId: "1",
        searchQuery: "Store",
        page: "1",
        sort: "asc",
        sortKey: "name"
      };

      const mockStores = {
        stores: [
          {
            id: 1,
            userInfo: {
              id: 1,
              status: "active"
            },
            storeInfo: {
              name: "Store 1",
              location: "Location 1",
              rep: {
                name: "Rep 1"
              },
              distributor: {
                id: 1,
                name: "Distributor 1"
              }
            },
            salesData: {
              purchaseVolume: {
                amount: 1000
              },
              totalSavings: {
                amount: 100
              }
            },
            chainNames: "Chain 1"
          }
        ],
        totalStores: 1,
        currentPage: 1,
        totalPages: 1
      };

      jest
        .spyOn(ManufacturerDashboardService, "getStoresListing")
        .mockResolvedValue(mockStores as any);

      await ManufacturerController.getStoresListing(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockStores
      });
    });

    it("should handle missing manufacturerId", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: undefined,
        parentEntityId: undefined,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      mockReq.query = {
        distributorId: "1",
        searchQuery: "Store",
        page: "1",
        sort: "asc",
        sortKey: "name"
      };

      await ManufacturerController.getStoresListing(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID
      });
    });

    it("should handle service error", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      mockReq.query = {
        distributorId: "1",
        searchQuery: "Store",
        page: "1",
        sort: "asc",
        sortKey: "name"
      };

      jest
        .spyOn(ManufacturerDashboardService, "getStoresListing")
        .mockRejectedValue(new Error("Service error"));

      await ManufacturerController.getStoresListing(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
  });

  describe("getStorePurchasesDetails", () => {
    it("should successfully get store purchases details", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      mockReq.params = {
        storeId: "1"
      };

      mockReq.query = {
        distributorId: "1",
        categoryId: "1"
      };

      const mockPurchases = {
        chartData: [
          {
            date: "January",
            purchase: 1000
          }
        ],
        categories: [
          {
            id: 1,
            name: "Category 1"
          }
        ]
      };

      jest
        .spyOn(ManufacturerDashboardService, "getStorePurchasesDetails")
        .mockResolvedValue(mockPurchases);

      await ManufacturerController.getStorePurchasesDetails(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockPurchases
      });
    });

    it("should handle missing manufacturerId", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: undefined,
        parentEntityId: undefined,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      mockReq.params = {
        storeId: "1"
      };

      mockReq.query = {
        distributorId: "1",
        categoryId: "1"
      };

      await ManufacturerController.getStorePurchasesDetails(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID
      });
    });

    it("should handle missing distributorId", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      mockReq.params = {
        storeId: "1"
      };

      mockReq.query = {
        distributorId: undefined,
        categoryId: "1"
      };

      await ManufacturerController.getStorePurchasesDetails(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID
      });
    });

    it("should handle missing storeId", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      mockReq.params = {
        storeId: ""
      };

      mockReq.query = {
        distributorId: "1",
        categoryId: "1"
      };

      await ManufacturerController.getStorePurchasesDetails(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.REQUIRED.STORE_ID
      });
    });

    it("should handle service error", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      mockReq.params = {
        storeId: "1"
      };

      mockReq.query = {
        distributorId: "1",
        categoryId: "1"
      };

      jest
        .spyOn(ManufacturerDashboardService, "getStorePurchasesDetails")
        .mockRejectedValue(new Error("Service error"));

      await ManufacturerController.getStorePurchasesDetails(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
  });

  describe("getDistributorSalesOverview", () => {
    it("should successfully get distributor sales overview", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      mockReq.query = {
        distributorId: "1"
      };

      const mockOverview = {
        salesData: [
          {
            salePeriod: "2024-01",
            increased_sales_percent: "10",
            total_stores: 50
          }
        ],
        categories: [
          {
            id: 1,
            name: "Category 1"
          }
        ]
      };

      jest
        .spyOn(ManufacturerDashboardService, "getDistributorSalesOverview")
        .mockResolvedValue(mockOverview);

      await ManufacturerController.getDistributorSalesOverview(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockOverview
      });
    });

    it("should handle missing manufacturerId", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: undefined,
        parentEntityId: undefined,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      mockReq.query = {
        distributorId: "1"
      };

      await ManufacturerController.getDistributorSalesOverview(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID
      });
    });

    it("should handle service error", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      mockReq.query = {
        distributorId: "1"
      };

      jest
        .spyOn(ManufacturerDashboardService, "getDistributorSalesOverview")
        .mockRejectedValue(new Error("Service error"));

      await ManufacturerController.getDistributorSalesOverview(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
  });

  describe("getSkusPerStore", () => {
    it("should successfully get SKUs per store for manufacturer", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      mockReq.query = {
        manufacturerId: "1",
        distributorId: "1",
        categoryId: "1",
        monthRange: "1"
      };

      const mockSkus = {
        currentYearSkuCounts: [],
        lastYearSkuCounts: [],
        skuCounts: [
          {
            storeId: 1,
            storeName: "Store 1",
            skuCount: 10
          }
        ],
        categories: [
          {
            id: 1,
            name: "Category 1"
          }
        ]
      };

      jest
        .spyOn(ManufacturerService, "getMergedSkusPerStoreData")
        .mockResolvedValue(mockSkus);

      await ManufacturerController.getSkusPerStore(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockSkus
      });
    });

    it("should successfully get SKUs per store for distributor", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.DISTRIBUTOR_ADMIN,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      };

      mockReq.query = {
        manufacturerId: "1",
        categoryId: "1",
        monthRange: "1"
      };

      const mockSkus = {
        currentYearSkuCounts: [],
        lastYearSkuCounts: [],
        skuCounts: [
          {
            storeId: 1,
            storeName: "Store 1",
            skuCount: 10
          }
        ],
        categories: [
          {
            id: 1,
            name: "Category 1"
          }
        ]
      };

      jest
        .spyOn(ManufacturerService, "getMergedSkusPerStoreData")
        .mockResolvedValue(mockSkus);

      await ManufacturerController.getSkusPerStore(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockSkus
      });
    });

    it("should handle service error", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      mockReq.query = {
        manufacturerId: "1",
        distributorId: "1",
        categoryId: "1",
        monthRange: "1"
      };

      jest
        .spyOn(ManufacturerService, "getMergedSkusPerStoreData")
        .mockRejectedValue(new Error("Service error"));

      await ManufacturerController.getSkusPerStore(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
  });

  describe("getProgramsOverview", () => {
    it("should successfully get programs overview", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      mockReq.query = {
        distributorId: "1"
      };

      const mockOverview = {
        distributorProgramsData: {
          topPerformingPrograms: [
            {
              programName: "Program 1",
              totalSales: 10000,
              totalStores: 50
            }
          ],
          bottomPerformingPrograms: [
            {
              programName: "Program 2",
              totalSales: 5000,
              totalStores: 25
            }
          ]
        },
        storeProgramsData: [],
        salesRepsProgramsData: {}
      };

      jest
        .spyOn(ManufacturerDashboardService, "getProgramsOverview")
        .mockResolvedValue(mockOverview);

      await ManufacturerController.getProgramsOverview(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockOverview
      });
    });

    it("should handle missing manufacturerId", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: undefined,
        parentEntityId: undefined,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      mockReq.query = {
        distributorId: "1"
      };

      await ManufacturerController.getProgramsOverview(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.REQUIRED.MANUFACTURER_ID
      });
    });

    it("should handle service error", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.MANUFACTURER_EXECUTIVE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_EXECUTIVE
      };

      mockReq.query = {
        distributorId: "1"
      };

      jest
        .spyOn(ManufacturerDashboardService, "getProgramsOverview")
        .mockRejectedValue(new Error("Service error"));

      await ManufacturerController.getProgramsOverview(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
  });

  describe("getAuthorized", () => {
    it("should successfully get authorized manufacturers", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.DISTRIBUTOR_EXECUTIVE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE
      };

      const mockAuthorized = [
        {
          id: 1,
          manufacturerId: "1",
          distributorId: "1",
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          name: "Manufacturer 1",
          logo: "logo1.png",
          authorized: true
        }
      ] as unknown as AuthorizedManufacturerDistributor[];

      jest
        .spyOn(ManufacturerService, "getAuthorized")
        .mockResolvedValue(mockAuthorized);

      await ManufacturerController.getAuthorized(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockAuthorized
      });
    });

    it("should handle missing distributorId", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.DISTRIBUTOR_EXECUTIVE,
        associatedUserId: undefined,
        parentEntityId: undefined,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE
      };

      await ManufacturerController.getAuthorized(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID
      });
    });

    it("should handle service error", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.DISTRIBUTOR_EXECUTIVE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE
      };

      jest
        .spyOn(ManufacturerService, "getAuthorized")
        .mockRejectedValue(new Error("Service error"));

      await ManufacturerController.getAuthorized(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
  });

  describe("getROI", () => {
    it("should successfully get ROI data with programId only", async () => {
      mockReq.query = {
        programId: "100"
      };

      const mockROIData = [
        {
          id: 1,
          programId: 100,
          manufacturerId: 50,
          distributorId: null,
          rebateType: "STORE",
          costOfProgram: "10000.00",
          currentYearProgramProductSales: "50000.00",
          previousYearProgramProductSales: "40000.00",
          salesToCostRatio: 5.0,
          incrementalSalesLift: 25.0,
          newDoorsCount: 15,
          lastYearsDoorsCount: 100,
          newDoorsPercentage: 15.0,
          newPodCount: 8,
          totalPodCount: 50,
          newPodPercentage: 16.0
        },
        {
          id: 2,
          programId: 100,
          manufacturerId: 50,
          distributorId: null,
          rebateType: "SALES_REP",
          costOfProgram: "5000.00",
          currentYearProgramProductSales: "25000.00",
          previousYearProgramProductSales: "20000.00",
          salesToCostRatio: 5.0,
          incrementalSalesLift: 25.0,
          newDoorsCount: 10,
          lastYearsDoorsCount: 80,
          newDoorsPercentage: 12.5,
          newPodCount: 5,
          totalPodCount: 40,
          newPodPercentage: 12.5
        }
      ];

      jest
        .spyOn(ManufacturerDashboardService, "getROI")
        .mockResolvedValue(mockROIData);

      await ManufacturerController.getROI(
        mockReq as Request,
        mockRes as Response
      );

      expect(ManufacturerDashboardService.getROI).toHaveBeenCalledWith(
        100,
        undefined
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockROIData
      });
    });

    it("should successfully get ROI data with programId and distributorId", async () => {
      mockReq.query = {
        programId: "100",
        distributorId: "5"
      };

      const mockROIData = [
        {
          id: 1,
          programId: 100,
          manufacturerId: 50,
          distributorId: 5,
          rebateType: "STORE",
          costOfProgram: "10000.00",
          currentYearProgramProductSales: "50000.00",
          previousYearProgramProductSales: "40000.00",
          salesToCostRatio: 5.0,
          incrementalSalesLift: 25.0,
          newDoorsCount: 15,
          lastYearsDoorsCount: 100,
          newDoorsPercentage: 15.0,
          newPodCount: 8,
          totalPodCount: 50,
          newPodPercentage: 16.0
        }
      ];

      jest
        .spyOn(ManufacturerDashboardService, "getROI")
        .mockResolvedValue(mockROIData);

      await ManufacturerController.getROI(
        mockReq as Request,
        mockRes as Response
      );

      expect(ManufacturerDashboardService.getROI).toHaveBeenCalledWith(100, 5);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockROIData
      });
    });

    it("should handle missing programId", async () => {
      mockReq.query = {};

      await ManufacturerController.getROI(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "programId is required"
      });
    });

    it("should return empty array when no ROI data exists", async () => {
      mockReq.query = {
        programId: "999"
      };

      jest.spyOn(ManufacturerDashboardService, "getROI").mockResolvedValue([]);

      await ManufacturerController.getROI(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: []
      });
    });

    it("should handle service error", async () => {
      mockReq.query = {
        programId: "100"
      };

      jest
        .spyOn(ManufacturerDashboardService, "getROI")
        .mockRejectedValue(new Error("Database error"));

      await ManufacturerController.getROI(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Database error"
      });
    });
  });
});

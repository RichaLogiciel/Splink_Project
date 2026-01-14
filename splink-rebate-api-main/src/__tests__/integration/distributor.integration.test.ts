import { ENTITY_TYPE } from "@/config/appConstants";
import { ERROR_MESSAGES } from "@/config/errorMessages";
import DistributorDashboardService from "@/services/DistributorService";
import { ManufacturerProductInsights } from "@/types/KeyMetricsTypes";
import { DistSalesRepEarningsResponse } from "@/types/SalesRepTypes";
import { StoreProgramOverviewData } from "@/types/StoreProgramTypes";
import { Request, Response } from "express";
import DistributorController from "../../controllers/DistributorController";
import { redisClient } from "../../utils/redis";
import { createMockRequestResponse } from "../helpers/test-utils";

// Mock redis client
jest.mock("../../utils/redis", () => ({
  redisClient: {
    get: jest.fn(),
    setEx: jest.fn()
  },
  getCacheKey: jest.requireActual("../../utils/redis").getCacheKey
}));

describe("Distributor Integration Tests", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.resetAllMocks();
    const { req, res } = createMockRequestResponse();
    mockReq = req as Partial<Request>;
    mockRes = res as Partial<Response>;
    // Default: cache miss (return null) to ensure service is called
    (redisClient.get as jest.Mock).mockResolvedValue(null);
  });

  describe("getKeyMetrics", () => {
    it("should successfully get distributor key metrics", async () => {
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      };

      const mockKeyMetrics = {
        totalSavings: 1000,
        totalPurchaseVolume: 5000,
        relevantPurchaseVolume: 4500,
        storesCount: 10,
        activeStoresCount: 8,
        manufacturersCount: 5,
        salesRepTotalEarnings: 2500,
        salesRepManagerTotalEarnings: 0
      };

      jest
        .spyOn(DistributorDashboardService, "getKeyMetrics")
        .mockResolvedValue(mockKeyMetrics);

      await DistributorController.getKeyMetrics(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockKeyMetrics
      });
    });

    it("should handle missing distributorId", async () => {
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        associatedUserId: undefined,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      };

      await DistributorController.getKeyMetrics(
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
        role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      };

      // Ensure cache miss so service is called
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      jest
        .spyOn(DistributorDashboardService, "getKeyMetrics")
        .mockRejectedValue(new Error("Service error"));

      await DistributorController.getKeyMetrics(
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

  describe("getStoreProgramOverview", () => {
    it("should successfully get store program overview", async () => {
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      };

      const mockOverview: StoreProgramOverviewData = {
        topPerformingPrograms: [
          {
            manufacturerid: 1,
            logo: "logo1.png",
            manufacturername: "Manufacturer 1",
            salesvolume: "1000",
            totalsavings: "500"
          }
        ],
        bottomPerformingPrograms: [
          {
            manufacturerid: 2,
            logo: "logo2.png",
            manufacturername: "Manufacturer 2",
            salesvolume: "500",
            totalsavings: "250"
          }
        ]
      };

      jest
        .spyOn(DistributorDashboardService, "getStoreProgramOverview")
        .mockResolvedValue(mockOverview);

      await DistributorController.getStoreProgramOverview(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockOverview
      });
    });

    it("should handle missing distributorId", async () => {
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        associatedUserId: undefined,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      };

      await DistributorController.getStoreProgramOverview(
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
        role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      };

      jest
        .spyOn(DistributorDashboardService, "getStoreProgramOverview")
        .mockRejectedValue(new Error("Service error"));

      await DistributorController.getStoreProgramOverview(
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

  describe("getSalesRepEarnings", () => {
    it("should successfully get sales rep earnings", async () => {
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      };

      const mockEarnings: DistSalesRepEarningsResponse = {
        totalSalesReps: 5,
        totalEarnings: "10000.00",
        salesRepData: [
          {
            name: "Manufacturer 1",
            totalEarnedRebate: 2000,
            storesCount: 10
          }
        ]
      };

      jest
        .spyOn(DistributorDashboardService, "getSalesRepEarnings")
        .mockResolvedValue(mockEarnings);

      await DistributorController.getSalesRepEarnings(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockEarnings
      });
    });

    it("should handle missing distributorId", async () => {
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        associatedUserId: undefined,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      };

      await DistributorController.getSalesRepEarnings(
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
        role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      };

      // Ensure cache miss so service is called
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      jest
        .spyOn(DistributorDashboardService, "getSalesRepEarnings")
        .mockRejectedValue(new Error("Service error"));

      await DistributorController.getSalesRepEarnings(
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
    it("should successfully get sales data with default parameters", async () => {
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      };

      mockReq.query = {
        categoryId: "1",
        isTotalSales: "false",
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
        .spyOn(DistributorDashboardService, "getSales")
        .mockResolvedValue(mockSales);

      await DistributorController.getSales(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockSales
      });
    });

    it("should handle missing distributorId", async () => {
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        associatedUserId: undefined,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      };

      mockReq.query = {
        categoryId: "1",
        isTotalSales: "false",
        month: "1"
      };

      const mockSales = {
        result: {},
        categories: []
      };

      jest
        .spyOn(DistributorDashboardService, "getSales")
        .mockResolvedValue(mockSales);

      await DistributorController.getSales(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockSales
      });
    });

    it("should handle service error", async () => {
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      };

      mockReq.query = {
        categoryId: "1",
        isTotalSales: "false",
        month: "1"
      };

      // Ensure cache miss so service is called
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      jest
        .spyOn(DistributorDashboardService, "getSales")
        .mockRejectedValue(new Error("Service error"));

      await DistributorController.getSales(
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

  describe("getProgramsEnrollment", () => {
    it("should successfully get programs enrollment for distributor admin", async () => {
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      };

      const mockPrograms = [
        {
          id: 1,
          manufacturerId: 1,
          name: "Program 1",
          programType: "TIER",
          participantType: "STORE",
          programHeader: "Tier Program",
          paymentTerm: "NET30",
          startDate: new Date(),
          endDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          Manufacturer: {
            id: 1,
            name: "Manufacturer 1",
            logo: "logo1.png",
            authorized: true,
            external_id: "ext1",
            organizationName: "Org 1",
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null
          },
          ProgramDetails: [],
          overview: "Program overview"
        }
      ] as any[];

      jest
        .spyOn(DistributorDashboardService, "getProgramsEnrollment")
        .mockResolvedValue(mockPrograms);

      await DistributorController.getProgramsEnrollment(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockPrograms
      });
    });

    it("should successfully get programs enrollment for sales rep", async () => {
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.DISTRIBUTOR_SALES_REP,
        associatedUserId: 73,
        parentEntityId: 72,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      };

      const mockPrograms = [
        {
          id: 1,
          manufacturerId: 1,
          name: "Program 1",
          programType: "TIER",
          participantType: "STORE",
          programHeader: "Tier Program",
          paymentTerm: "NET30",
          startDate: new Date(),
          endDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          Manufacturer: {
            id: 1,
            name: "Manufacturer 1",
            logo: "logo1.png",
            authorized: true,
            external_id: "ext1",
            organizationName: "Org 1",
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null
          },
          ProgramDetails: [],
          overview: "Program overview"
        }
      ] as any[];

      jest
        .spyOn(DistributorDashboardService, "getProgramsEnrollment")
        .mockResolvedValue(mockPrograms);

      await DistributorController.getProgramsEnrollment(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockPrograms
      });
    });

    it("should handle missing distributorId", async () => {
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        associatedUserId: undefined,
        parentEntityId: undefined,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      };

      await DistributorController.getProgramsEnrollment(
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
        role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      };

      jest
        .spyOn(DistributorDashboardService, "getProgramsEnrollment")
        .mockRejectedValue(new Error("Service error"));

      await DistributorController.getProgramsEnrollment(
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
        role: ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      };

      mockReq.body = {
        manufacturerId: 1,
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
        .spyOn(DistributorDashboardService, "getProductInsights")
        .mockResolvedValue(mockInsights);

      await DistributorController.getProductInsights(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockInsights
      });
    });

    it("should handle missing distributorId", async () => {
      mockReq.user = {
        id: 1,
        role: ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE,
        associatedUserId: undefined,
        parentEntityId: undefined,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      };

      mockReq.body = {
        manufacturerId: 1,
        monthRange: "1",
        selectedProducts: [1, 2, 3]
      };

      await DistributorController.getProductInsights(
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
        role: ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      };

      mockReq.body = {
        manufacturerId: 1,
        monthRange: "1",
        selectedProducts: [1, 2, 3]
      };

      // Ensure cache miss so service is called
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      jest
        .spyOn(DistributorDashboardService, "getProductInsights")
        .mockRejectedValue(new Error("Service error"));

      await DistributorController.getProductInsights(
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
});

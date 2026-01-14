import { ERROR_MESSAGES } from "@/config/errorMessages";
import { USER_ROLES } from "@/config/roles";
import { Request, Response } from "express";
import StoreController from "../../controllers/StoreController";
import ChainStore from "../../models/ChainStore";
import StoreDashboardService from "../../services/StoreDashboardService";
import StoreService from "../../services/StoreService";
import {
  ManufacturerProduct,
  ManufacturerTierDetail
} from "../../types/SalesRepTypes";
import { createMockRequestResponse } from "../helpers/test-utils";

// Mock the logger to prevent console output during tests
jest.mock("../../lib/logger", () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe("Store Integration Tests", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.resetAllMocks();
    const { req, res } = createMockRequestResponse();
    mockReq = req as Partial<Request>;
    mockRes = res as Partial<Response>;
  });

  describe("getListing", () => {
    it("should successfully get store listing", async () => {
      mockReq.query = {
        distributorId: "1",
        searchQuery: "test",
        selectedSalesRepId: "1",
        page: "1",
        sort: "asc",
        chainId: "1",
        sortKey: "name"
      };

      const mockListing = {
        stores: [
          {
            id: 1,
            name: "Store 1",
            salesVolume: 1000
          }
        ],
        total: 1,
        page: 1,
        limit: 10
      };

      jest.spyOn(StoreService, "getListing").mockResolvedValue(mockListing);

      await StoreController.getListing(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockListing
      });
    });

    it("should handle missing distributorId", async () => {
      mockReq.query = {
        searchQuery: "test"
      };

      await StoreController.getListing(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID
      });
    });

    it("should handle service error", async () => {
      mockReq.query = {
        distributorId: "1",
        searchQuery: "test"
      };

      jest
        .spyOn(StoreService, "getListing")
        .mockRejectedValue(new Error("Service error"));

      await StoreController.getListing(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
  });

  describe("getStoreDetails", () => {
    it("should successfully get store details for distributor admin", async () => {
      mockReq.params = { id: "1" };
      mockReq.user = {
        role: USER_ROLES.DISTRIBUTOR_ADMIN,
        userId: 1,
        associatedUserId: 72,
        parentEntityId: 1
      };

      const mockStoreDetails = {
        id: 1,
        name: "Store 1",
        address: "123 Main St",
        programs: []
      };

      jest
        .spyOn(StoreService, "getStoreDetails")
        .mockResolvedValue(mockStoreDetails);

      await StoreController.getStoreDetails(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockStoreDetails
      });
    });

    it("should successfully get store details for sales rep", async () => {
      mockReq.params = { id: "1" };
      mockReq.user = {
        role: USER_ROLES.DISTRIBUTOR_SALES_REP,
        userId: 1,
        associatedUserId: 72,
        parentEntityId: 1
      };

      const mockStoreDetails = {
        id: 1,
        name: "Store 1",
        address: "123 Main St",
        programs: []
      };

      jest
        .spyOn(StoreService, "getStoreDetails")
        .mockResolvedValue(mockStoreDetails);

      await StoreController.getStoreDetails(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockStoreDetails
      });
    });

    it("should handle service error", async () => {
      mockReq.params = { id: "1" };
      mockReq.user = {
        role: USER_ROLES.DISTRIBUTOR_ADMIN,
        userId: 1,
        associatedUserId: 72,
        parentEntityId: 1
      };

      jest
        .spyOn(StoreService, "getStoreDetails")
        .mockRejectedValue(new Error("Service error"));

      await StoreController.getStoreDetails(
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

  describe("getStoreManufactureProgramsDetails", () => {
    it("should successfully get store manufacturer programs details", async () => {
      mockReq.params = {
        id: "1",
        manufacturerId: "1"
      };
      mockReq.query = {
        isEnrolledPrograms: "true"
      };

      const mockProgramDetails = {
        storeName: "Test Store",
        externalStoreId: "EXT123",
        tierDetails: [
          {
            title: "Tier 1",
            overview: "Test Overview",
            rebateAmount: "100.00",
            rebateType: "percentage",
            rebateCalculation: "volume",
            description: "Test Description"
          } as ManufacturerTierDetail
        ],
        additionalInfo: {
          recommendedProducts: [
            {
              id: 1,
              name: "Product 1",
              image: "image1.jpg",
              caseSkusId: "SKU1",
              size: "12oz",
              extraInfo: "Extra info 1",
              wishlist: false
            } as ManufacturerProduct
          ],
          purchasedProducts: [
            {
              id: 2,
              name: "Product 2",
              image: "image2.jpg",
              caseSkusId: "SKU2",
              size: "16oz",
              extraInfo: "Extra info 2",
              wishlist: true
            } as ManufacturerProduct
          ]
        }
      };

      jest
        .spyOn(StoreService, "getStoreManufactureProgramsDetails")
        .mockResolvedValue(mockProgramDetails);

      await StoreController.getStoreManufactureProgramsDetails(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockProgramDetails
      });
    });

    it("should handle service error", async () => {
      mockReq.params = {
        id: "1",
        manufacturerId: "1"
      };

      jest
        .spyOn(StoreService, "getStoreManufactureProgramsDetails")
        .mockRejectedValue(new Error("Service error"));

      await StoreController.getStoreManufactureProgramsDetails(
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

  describe("getStoreKeyMetrics", () => {
    it("should successfully get store key metrics", async () => {
      mockReq.user = {
        id: 1
      };

      const mockKeyMetrics = {
        totalSales: 10000,
        totalStores: 50,
        averageOrderValue: 200
      };

      jest
        .spyOn(StoreDashboardService, "getStoreKeyMetrics")
        .mockResolvedValue(mockKeyMetrics);

      await StoreController.getStoreKeyMetrics(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockKeyMetrics
      });
    });

    it("should handle service error", async () => {
      mockReq.user = {
        id: 1
      };

      jest
        .spyOn(StoreDashboardService, "getStoreKeyMetrics")
        .mockRejectedValue(new Error("Service error"));

      await StoreController.getStoreKeyMetrics(
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

  describe("getDistributorSalesReps", () => {
    it("should successfully get distributor sales reps", async () => {
      mockReq.params = {
        distributorId: "1"
      };

      const mockSalesReps = {
        salesReps: [
          {
            id: 1,
            associatedUserId: 1,
            name: "Sales Rep 1"
          }
        ]
      };

      jest
        .spyOn(StoreService, "getDistributorSalesReps")
        .mockResolvedValue(mockSalesReps);

      await StoreController.getDistributorSalesReps(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockSalesReps
      });
    });

    it("should handle service error", async () => {
      mockReq.params = {
        distributorId: "1"
      };

      jest
        .spyOn(StoreService, "getDistributorSalesReps")
        .mockRejectedValue(new Error("Service error"));

      await StoreController.getDistributorSalesReps(
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

  describe("getStoreChains", () => {
    it("should successfully get store chains", async () => {
      mockReq.user = {
        associatedUserId: 72,
        role: USER_ROLES.DISTRIBUTOR_ADMIN
      };

      const mockChains = [
        {
          name: "Chain 1",
          id: 1
        }
      ];

      jest.spyOn(StoreService, "getStoreChains").mockResolvedValue(mockChains);

      await StoreController.getStoreChains(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockChains
      });
    });

    it("should handle service error", async () => {
      mockReq.user = {
        associatedUserId: 72,
        role: USER_ROLES.DISTRIBUTOR_ADMIN
      };

      jest
        .spyOn(StoreService, "getStoreChains")
        .mockRejectedValue(new Error("Service error"));

      await StoreController.getStoreChains(
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

  describe("getStoresByChainId", () => {
    it("should successfully get stores by chain ID", async () => {
      mockReq.params = {
        chainId: "1"
      };

      const mockStores = [
        ChainStore.build({
          id: 1,
          chainId: 1,
          storeId: 2332,
          createdAt: new Date(),
          updatedAt: new Date(),
          UserRole: [
            {
              store_name: "7-CLANS RED LAKE COMP BEVERAGES",
              user: {
                address: "NY",
                city: "NY",
                state: "NY",
                zip: "55555"
              },
              parent_entity_id: 1
            }
          ]
        })
      ];

      jest
        .spyOn(StoreService, "getStoresByChainId")
        .mockResolvedValue(mockStores);

      await StoreController.getStoresByChainId(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockStores
      });
    });

    it("should handle service error", async () => {
      mockReq.params = {
        chainId: "1"
      };

      jest
        .spyOn(StoreService, "getStoresByChainId")
        .mockRejectedValue(new Error("Service error"));

      await StoreController.getStoresByChainId(
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

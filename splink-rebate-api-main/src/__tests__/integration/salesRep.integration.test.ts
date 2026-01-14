import { ENTITY_TYPE } from "@/config/appConstants";
import { USER_ROLES } from "@/config/roles";
import { Request, Response } from "express";
import SalesRepController from "../../controllers/SalesRepController";
import StoreSalesRep from "../../models/StoreSalesRep";
import SalesRepService from "../../services/SalesRepService";
import { createMockRequestResponse } from "../helpers/test-utils";

describe.skip("SalesRep Integration Tests", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.resetAllMocks();
    const { req, res } = createMockRequestResponse();
    mockReq = req as Partial<Request>;
    mockRes = res as Partial<Response>;
  });

  describe("getKeyMetrics", () => {
    it("should successfully get key metrics", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.DISTRIBUTOR_SALES_REP,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR
      };

      const mockKeyMetrics = {
        totalEarning: 1000,
        totalStores: 50,
        totalStoreProgram: 10,
        totalActiveStores: 25
      };

      jest
        .spyOn(SalesRepService, "getKeyMetrics")
        .mockResolvedValue(mockKeyMetrics);

      await SalesRepController.getKeyMetrics(
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
        id: 1,
        role: USER_ROLES.DISTRIBUTOR_SALES_REP,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR
      };

      jest
        .spyOn(SalesRepService, "getKeyMetrics")
        .mockRejectedValue(new Error("Service error"));

      await SalesRepController.getKeyMetrics(
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
    it("should successfully get sales rep earnings for distributor admin", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.DISTRIBUTOR_ADMIN,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR
      };

      const mockEarnings = [
        {
          manufacturerId: 1,
          manufacturerName: "Manufacturer 1",
          logo: "logo1.png",
          totalEarnedRebate: "1000.00"
        }
      ];

      jest
        .spyOn(SalesRepService, "getSalesRepEarningsOverview")
        .mockResolvedValue(mockEarnings);

      await SalesRepController.getSalesRepEarnings(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockEarnings
      });
    });

    it("should successfully get sales rep earnings for sales rep", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.DISTRIBUTOR_SALES_REP,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR
      };

      const mockEarnings = [
        {
          manufacturerId: 1,
          manufacturerName: "Manufacturer 1",
          logo: "logo1.png",
          totalEarnedRebate: "1000.00"
        }
      ];

      jest
        .spyOn(SalesRepService, "getSalesRepEarningsOverview")
        .mockResolvedValue(mockEarnings);

      await SalesRepController.getSalesRepEarnings(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockEarnings
      });
    });

    it("should handle service error", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.DISTRIBUTOR_SALES_REP,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR
      };

      jest
        .spyOn(SalesRepService, "getSalesRepEarningsOverview")
        .mockRejectedValue(new Error("Service error"));

      await SalesRepController.getSalesRepEarnings(
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
        role: USER_ROLES.DISTRIBUTOR_SALES_REP,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR
      };

      const mockOverview = {
        topPerformingPrograms: [
          {
            manufacturerid: 1,
            logo: "logo1.png",
            manufacturername: "Manufacturer 1",
            salesvolume: "10000.00",
            totalsavings: "1000.00"
          }
        ],
        bottomPerformingPrograms: [
          {
            manufacturerid: 2,
            logo: "logo2.png",
            manufacturername: "Manufacturer 2",
            salesvolume: "5000.00",
            totalsavings: "500.00"
          }
        ]
      };

      jest
        .spyOn(SalesRepService, "getSalesRepStoreProgramOverview")
        .mockResolvedValue(mockOverview);

      await SalesRepController.getStoreProgramOverview(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockOverview
      });
    });

    it("should handle service error", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.DISTRIBUTOR_SALES_REP,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR
      };

      jest
        .spyOn(SalesRepService, "getSalesRepStoreProgramOverview")
        .mockRejectedValue(new Error("Service error"));

      await SalesRepController.getStoreProgramOverview(
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

  describe("getWishlist", () => {
    it("should successfully get wishlist products", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.DISTRIBUTOR_SALES_REP,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR
      };

      const mockWishlist = [
        StoreSalesRep.build({
          id: 1,
          salesRepId: 1,
          storeId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          sale_month: "2024-01",
          total_sales: 1000,
          category_id: 1,
          category_name: "Category 1",
          storeName: "Store 1",
          products: [
            {
              id: 1,
              name: "Product 1",
              quantity: 10
            }
          ]
        })
      ];

      jest
        .spyOn(SalesRepService, "getWishlistProduct")
        .mockResolvedValue(mockWishlist);

      await SalesRepController.getWishlist(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockWishlist
      });
    });

    it("should handle service error", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.DISTRIBUTOR_SALES_REP,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR
      };

      jest
        .spyOn(SalesRepService, "getWishlistProduct")
        .mockRejectedValue(new Error("Service error"));

      await SalesRepController.getWishlist(
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

  describe("getSalesRepManufactureProgramsDetails", () => {
    it("should successfully get manufacturer program details", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.DISTRIBUTOR_SALES_REP,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR
      };

      mockReq.params = {
        manufacturerId: "1"
      };

      const mockProgramDetails = {
        tierDetails: [
          {
            tier: 1,
            overview: "Test Overview",
            rebateAmount: 100,
            rebateType: "percentage"
          }
        ]
      };

      jest
        .spyOn(SalesRepService, "getSalesRepManufactureProgramsDetails")
        .mockResolvedValue(mockProgramDetails as any);

      await SalesRepController.getSalesRepManufactureProgramsDetails(
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
      mockReq.user = {
        id: 1,
        role: USER_ROLES.DISTRIBUTOR_SALES_REP,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR
      };

      mockReq.params = {
        manufacturerId: "1"
      };

      jest
        .spyOn(SalesRepService, "getSalesRepManufactureProgramsDetails")
        .mockRejectedValue(new Error("Service error"));

      await SalesRepController.getSalesRepManufactureProgramsDetails(
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

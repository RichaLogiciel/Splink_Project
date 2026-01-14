import { ENTITY_TYPE } from "@/config/appConstants";
import { ERROR_MESSAGES } from "@/config/errorMessages";
import { USER_ROLES } from "@/config/roles";
import { Request, Response } from "express";
import ProgramController from "../../controllers/ProgramController";
import StoreRepository from "../../repositories/StoreRepository";
import ManufacturerService from "../../services/ManufacturerService";
import ProgramService from "../../services/ProgramService";
import { createMockRequestResponse } from "../helpers/test-utils";

import distributorProgramDetails from "../mocks/distributorProgramDetails.json";
import distributorStoreProgramDetails from "../mocks/distributorStoreProgramDetails.json";
describe("Program Integration Tests", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.resetAllMocks();
    const { req, res } = createMockRequestResponse();
    mockReq = req as Partial<Request>;
    mockRes = res as Partial<Response>;
  });

  describe("listPrograms", () => {
    it("should successfully list programs for distributor", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.DISTRIBUTOR_ADMIN,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR
      };

      mockReq.query = {
        type: ENTITY_TYPE.DISTRIBUTOR
      };

      const mockPrograms = [
        {
          manufacturerName: "Manufacturer 1",
          manufacturerLogo: "logo1.png",
          manufacturerId: 1,
          totalPurchaseVolume: 1000,
          totalSaving: 100,
          program_overview: [
            {
              id: 1,
              name: "Program 1",
              programName: "Program 1",
              completedCompliances: 5,
              totalEnrollments: 10,
              rebate: 100,
              programStartDate: "2024-01-01",
              programEndDate: "2024-12-31"
            }
          ]
        }
      ];

      jest.spyOn(ProgramService, "getPrograms").mockResolvedValue(mockPrograms);

      await ProgramController.listPrograms(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockPrograms
      });
    });

    it("should successfully list programs for store", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.STORE,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.STORE
      };

      mockReq.query = {
        type: ENTITY_TYPE.STORE
      };

      const mockPrograms = [
        {
          manufacturerName: "Manufacturer 1",
          manufacturerLogo: "logo1.png",
          manufacturerId: 1,
          totalPurchaseVolume: 1000,
          totalSaving: 100,
          program_overview: [
            {
              id: 1,
              name: "Program 1",
              programName: "Program 1",
              completedCompliances: 5,
              totalEnrollments: 10,
              rebate: 100,
              programStartDate: "2024-01-01",
              programEndDate: "2024-12-31"
            }
          ]
        }
      ];

      jest.spyOn(ProgramService, "getPrograms").mockResolvedValue(mockPrograms);

      await ProgramController.listPrograms(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockPrograms
      });
    });

    it("should handle missing type parameter", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.DISTRIBUTOR_ADMIN,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR
      };

      mockReq.query = {
        storeId: "1"
      };

      await ProgramController.listPrograms(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.INVALID_USER_TYPE
      });
    });

    it("should handle service error", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.DISTRIBUTOR_ADMIN,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR
      };

      mockReq.query = {
        type: "distributor",
        storeId: "1"
      };

      jest
        .spyOn(ProgramService, "getPrograms")
        .mockRejectedValue(new Error("Service error"));

      await ProgramController.listPrograms(
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

  describe("getProgramDetails", () => {
    it.skip("should successfully get distributor program details", async () => {
      mockReq.user = {
        id: 25,
        role: USER_ROLES.DISTRIBUTOR_ADMIN,
        associatedUserId: 1,
        parentEntityId: null,
        parentEntityType: null
      };

      mockReq.query = {
        type: ENTITY_TYPE.DISTRIBUTOR,
        manufacturerId: "1",
        warehouseId: "undefined",
        programTimeline: "Current",
        isInternal: "true"
      };

      jest
        .spyOn(ProgramService, "getProgramDetails")
        .mockResolvedValue(distributorProgramDetails);

      jest
        .spyOn(StoreRepository, "getManufacturerProgramsById")
        .mockResolvedValue([
          {
            program_id: 1,
            manufacturer_name: "Wonderful Pistachios",
            manufacturer_logo:
              "https://prod-splink-s3.s3.us-west-2.amazonaws.com/f53ecedb-f8fe-47e9-873f-f52a5ef8d5a1-Wonderful Logo.png",
            manufacturer_id: 1,
            manufacturer_authorized: true,
            program_type: "Base",
            payment_term: "QUARTERLY",
            tier: 0,
            quantity_type: null,
            program_detail_id: 1,
            overview: "% of total distributor base purchase volume",
            criteria: "BASE",
            min_spend: "0.00",
            min_qty: "0.00",
            max_qty: null,
            products_tags: null,
            products_tags_qty: "0",
            rebate_amount: null,
            rebate_percentage: "2.00",
            rebate_type: "percentage",
            rebate_calculation: "% of Total Landed Value",
            required_core_skus: 0,
            points: null,
            program_header: "Base",
            start_date: new Date().toISOString(),
            end_date: new Date().toISOString(),
            name: "Wholesale Agreement"
          },
          {
            program_id: 2,
            manufacturer_name: "Wonderful Pistachios",
            manufacturer_logo:
              "https://prod-splink-s3.s3.us-west-2.amazonaws.com/f53ecedb-f8fe-47e9-873f-f52a5ef8d5a1-Wonderful Logo.png",
            manufacturer_id: 1,
            manufacturer_authorized: true,
            program_type: "Innovation",
            payment_term: "ANNUAL",
            tier: 0,
            quantity_type: null,
            program_detail_id: 2,
            overview: "Carry specific innovation products",
            criteria: "Category SKUs",
            min_spend: "0.00",
            min_qty: "0.00",
            max_qty: null,
            products_tags: "Innovation",
            products_tags_qty: "1",
            rebate_amount: null,
            rebate_percentage: "1.00",
            rebate_type: "percentage",
            rebate_calculation: "% of Total Landed Value",
            required_core_skus: 0,
            points: null,
            program_header: "Innovation",
            start_date: new Date().toISOString(),
            end_date: new Date().toISOString(),
            name: "Wholesale Agreement"
          },
          {
            program_id: 3,
            manufacturer_name: "Wonderful Pistachios",
            manufacturer_logo:
              "https://prod-splink-s3.s3.us-west-2.amazonaws.com/f53ecedb-f8fe-47e9-873f-f52a5ef8d5a1-Wonderful Logo.png",
            manufacturer_id: 1,
            manufacturer_authorized: true,
            program_type: "POD Goal",
            payment_term: "SEMI-ANNUAL",
            tier: 0,
            quantity_type: null,
            program_detail_id: 3,
            overview: 'Deliver "Core 10" Distribution Point Goal',
            criteria: "POD",
            min_spend: "0.00",
            min_qty: "0.00",
            max_qty: null,
            products_tags: "Core_Retail",
            products_tags_qty: "0",
            rebate_amount: null,
            rebate_percentage: "3.00",
            rebate_type: "percentage",
            rebate_calculation: "% of Total Landed Value",
            required_core_skus: 0,
            points: null,
            program_header: "POD Goal",
            start_date: new Date().toISOString(),
            end_date: new Date().toISOString(),
            name: "Wholesale Agreement"
          }
        ]);

      jest
        .spyOn(StoreRepository, "getManufacturerProducts")
        .mockResolvedValue([]);

      jest
        .spyOn(ManufacturerService, "getManufacturerNameAndLogo")
        .mockResolvedValue({
          id: 1,
          external_id: "ext1",
          organizationName: "Wonderful Pistachios",
          logo: "https://prod-splink-s3.s3.us-west-2.amazonaws.com/f53ecedb-f8fe-47e9-873f-f52a5ef8d5a1-Wonderful Logo.png",
          authorized: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null
        } as any);

      await ProgramController.getProgramDetails(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          ...distributorProgramDetails,
          categorizedProducts: {
            Core_Retail: {
              purchasedProducts: [],
              requiredProducts: [
                {
                  id: 2351,
                  name: "WFL PISTACHIOS RSTD SALTED 3/8/5 OZ PILLOW FC CS",
                  size: "5OZ"
                }
              ]
            },
            Innovation: {
              purchasedProducts: [],
              requiredProducts: []
            }
          }
        }
      });
    });

    it.skip("should successfully get distributor store program details", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.DISTRIBUTOR_ADMIN,
        associatedUserId: 1,
        parentEntityId: null,
        parentEntityType: null
      };

      mockReq.query = {
        type: ENTITY_TYPE.STORE,
        manufacturerId: "1"
      };

      jest
        .spyOn(ProgramService, "getProgramDetails")
        .mockResolvedValue(distributorStoreProgramDetails);

      jest
        .spyOn(StoreRepository, "getManufacturerProgramsById")
        .mockResolvedValue([
          {
            program_id: 1,
            manufacturer_name: "Wonderful Pistachios",
            manufacturer_logo:
              "https://prod-splink-s3.s3.us-west-2.amazonaws.com/f53ecedb-f8fe-47e9-873f-f52a5ef8d5a1-Wonderful Logo.png",
            manufacturer_id: 1,
            manufacturer_authorized: true,
            program_type: "Base",
            payment_term: "QUARTERLY",
            tier: 0,
            quantity_type: null,
            program_detail_id: 1,
            overview: "% of total distributor base purchase volume",
            criteria: "BASE",
            min_spend: "0.00",
            min_qty: "0.00",
            max_qty: null,
            products_tags: null,
            products_tags_qty: "0",
            rebate_amount: null,
            rebate_percentage: "2.00",
            rebate_type: "percentage",
            rebate_calculation: "% of Total Landed Value",
            required_core_skus: 0,
            points: null,
            program_header: "Base",
            start_date: new Date().toISOString(),
            end_date: new Date().toISOString(),
            name: "Wholesale Agreement"
          },
          {
            program_id: 2,
            manufacturer_name: "Wonderful Pistachios",
            manufacturer_logo:
              "https://prod-splink-s3.s3.us-west-2.amazonaws.com/f53ecedb-f8fe-47e9-873f-f52a5ef8d5a1-Wonderful Logo.png",
            manufacturer_id: 1,
            manufacturer_authorized: true,
            program_type: "Innovation",
            payment_term: "ANNUAL",
            tier: 0,
            quantity_type: null,
            program_detail_id: 2,
            overview: "Carry specific innovation products",
            criteria: "Category SKUs",
            min_spend: "0.00",
            min_qty: "0.00",
            max_qty: null,
            products_tags: "Innovation",
            products_tags_qty: "1",
            rebate_amount: null,
            rebate_percentage: "1.00",
            rebate_type: "percentage",
            rebate_calculation: "% of Total Landed Value",
            required_core_skus: 0,
            points: null,
            program_header: "Innovation",
            start_date: new Date().toISOString(),
            end_date: new Date().toISOString(),
            name: "Wholesale Agreement"
          },
          {
            program_id: 3,
            manufacturer_name: "Wonderful Pistachios",
            manufacturer_logo:
              "https://prod-splink-s3.s3.us-west-2.amazonaws.com/f53ecedb-f8fe-47e9-873f-f52a5ef8d5a1-Wonderful Logo.png",
            manufacturer_id: 1,
            manufacturer_authorized: true,
            program_type: "POD Goal",
            payment_term: "SEMI-ANNUAL",
            tier: 0,
            quantity_type: null,
            program_detail_id: 3,
            overview: 'Deliver "Core 10" Distribution Point Goal',
            criteria: "POD",
            min_spend: "0.00",
            min_qty: "0.00",
            max_qty: null,
            products_tags: "Core_Retail",
            products_tags_qty: "0",
            rebate_amount: null,
            rebate_percentage: "3.00",
            rebate_type: "percentage",
            rebate_calculation: "% of Total Landed Value",
            required_core_skus: 0,
            points: null,
            program_header: "POD Goal",
            start_date: new Date().toISOString(),
            end_date: new Date().toISOString(),
            name: "Wholesale Agreement"
          }
        ]);

      jest
        .spyOn(StoreRepository, "getManufacturerProducts")
        .mockResolvedValue([]);

      jest
        .spyOn(ManufacturerService, "getManufacturerNameAndLogo")
        .mockResolvedValue({
          id: 1,
          external_id: "ext1",
          organizationName: "Wonderful Pistachios",
          logo: "https://prod-splink-s3.s3.us-west-2.amazonaws.com/f53ecedb-f8fe-47e9-873f-f52a5ef8d5a1-Wonderful Logo.png",
          authorized: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null
        } as any);

      await ProgramController.getProgramDetails(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          ...distributorStoreProgramDetails,
          categorizedProducts: {
            Core_Retail: {
              purchasedProducts: [],
              requiredProducts: [
                {
                  id: 2351,
                  name: "WFL PISTACHIOS RSTD SALTED 3/8/5 OZ PILLOW FC CS",
                  size: "5OZ"
                }
              ]
            },
            Innovation: {
              purchasedProducts: [],
              requiredProducts: []
            }
          }
        }
      });
    });

    it("should handle missing manufacturerId", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.DISTRIBUTOR_ADMIN,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR
      };

      mockReq.query = {
        type: "distributor",
        programId: "1"
      };

      await ProgramController.getProgramDetails(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: ERROR_MESSAGES.INVALID_MANUFACTURER_ID
      });
    });

    it.skip("should handle service error", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.DISTRIBUTOR_ADMIN,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR
      };

      mockReq.query = {
        type: "distributor",
        manufacturerId: "1",
        programId: "1"
      };

      jest
        .spyOn(ProgramService, "getProgramDetails")
        .mockRejectedValue(new Error("Service error"));

      await ProgramController.getProgramDetails(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });

    it("should successfully get distributor program details by detail id", async () => {
      mockReq.user = {
        id: 25,
        role: USER_ROLES.DISTRIBUTOR_ADMIN,
        associatedUserId: 1,
        parentEntityId: null,
        parentEntityType: null
      };

      mockReq.query = {
        type: ENTITY_TYPE.DISTRIBUTOR,
        manufacturerId: "1",
        programDetailId: "1"
      };

      const mockProgramDetails = {
        id: 1,
        name: "Test Program",
        programType: "Base",
        programHeader: "Test Header",
        programEntityType: ENTITY_TYPE.DISTRIBUTOR,
        programTerms: "Test Terms",
        programDetails: "Test Details",
        progressDetails: {
          completedCompliances: 5,
          totalCompliances: 10
        }
      };

      jest
        .spyOn(ProgramService, "getProgramDetailsByDetailId")
        .mockResolvedValue(mockProgramDetails);

      await ProgramController.getProgramDetails(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockProgramDetails
      });
    });

    it.skip("should handle service error with custom status code", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.DISTRIBUTOR_ADMIN,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR
      };

      mockReq.query = {
        type: "distributor",
        manufacturerId: "1"
      };

      const customError = new Error("Custom error") as any;
      customError.statusCode = 404;

      jest
        .spyOn(ProgramService, "getProgramDetails")
        .mockRejectedValue(customError);

      await ProgramController.getProgramDetails(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Custom error"
      });
    });
  });

  describe("getAllManufacturerIds", () => {
    it("should successfully get all manufacturer IDs", async () => {
      const mockManufacturerIds = [1, 2, 3];

      jest
        .spyOn(ProgramService, "getAllManufacturerIds")
        .mockResolvedValue(mockManufacturerIds);

      await ProgramController.getAllManufacturerIds(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockManufacturerIds
      });
    });

    it("should handle service error", async () => {
      jest
        .spyOn(ProgramService, "getAllManufacturerIds")
        .mockRejectedValue(new Error("Service error"));

      await ProgramController.getAllManufacturerIds(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
  });

  describe("getCategorizedProducts", () => {
    it("should successfully get categorized products", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.DISTRIBUTOR_ADMIN,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR
      };

      mockReq.query = {
        type: "distributor",
        manufacturerId: "1"
      };

      const mockCategorizedProducts = {
        Core_Retail: {
          purchasedProducts: [],
          requiredProducts: []
        },
        Innovation: {
          purchasedProducts: [],
          requiredProducts: []
        }
      };

      jest
        .spyOn(ProgramService, "getCategorizedProducts")
        .mockResolvedValue(mockCategorizedProducts);

      await ProgramController.getCategorizedProducts(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockCategorizedProducts
      });
    });

    it("should handle service error", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.DISTRIBUTOR_ADMIN,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR
      };

      mockReq.query = {
        type: "distributor",
        manufacturerId: "1"
      };

      jest
        .spyOn(ProgramService, "getCategorizedProducts")
        .mockRejectedValue(new Error("Service error"));

      await ProgramController.getCategorizedProducts(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      );
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
        role: USER_ROLES.DISTRIBUTOR_ADMIN,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR
      };

      mockReq.query = {
        type: "distributor",
        manufacturerId: "1",
        searchQuery: "test",
        enrolledPage: "1",
        notEnrolledPage: "1",
        sort: "asc",
        sortKey: "name",
        enrolled: "true",
        selectedSalesRepId: "1"
      };

      const mockStoresListing = {
        storesListingEnrolled: {
          stores: [
            {
              id: 1,
              name: "Store 1",
              location: "Location 1"
            }
          ],
          totalStores: 1,
          currentPage: 1,
          totalPages: 1
        },
        storesListingNotEnrolled: {
          stores: [],
          totalStores: 0,
          currentPage: 1,
          totalPages: 1
        }
      };

      jest
        .spyOn(ProgramService, "getStoresListing")
        .mockResolvedValue(mockStoresListing);

      await ProgramController.getStoresListing(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockStoresListing
      });
    });

    it("should handle service error", async () => {
      mockReq.user = {
        id: 1,
        role: USER_ROLES.DISTRIBUTOR_ADMIN,
        associatedUserId: 72,
        parentEntityId: 1,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR
      };

      mockReq.query = {
        type: "distributor",
        manufacturerId: "1"
      };

      jest
        .spyOn(ProgramService, "getStoresListing")
        .mockRejectedValue(new Error("Service error"));

      await ProgramController.getStoresListing(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
  });
});
